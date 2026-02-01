"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, verifyToken, logout } from '../lib/auth';

export default function ProtectedRoute({ children, requireAuth = true, allowedRoles = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!requireAuth) {
        setIsAuthorized(true);
        setIsChecking(false);
        return;
      }

      // Check if user has token and user data
      if (!isAuthenticated()) {
        // Clear any stale data
        logout();
        return;
      }

      // Verify token with backend
      const isValid = await verifyToken();
      
      if (!isValid) {
        // Token is invalid, logout
        logout();
        return;
      }

      // Check role-based access if required
      if (allowedRoles.length > 0) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userRole = (user.role || 'USER').toUpperCase();
        const hasAccess = allowedRoles.some(role => role.toUpperCase() === userRole);
        
        if (!hasAccess) {
          // User doesn't have required role, redirect to appropriate page
          const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN'];
          if (adminRoles.includes(userRole)) {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/dashboard/spin');
          }
          return;
        }
      }

      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, requireAuth, allowedRoles, router]);

  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2400ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#98a3cd' }}>Verifying authentication...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

