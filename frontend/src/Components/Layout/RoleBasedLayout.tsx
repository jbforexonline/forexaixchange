"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  getUserRole,
  getSubscriptionTier,
  getLayoutConfig,
  isAdminRole,
} from "@/lib/layoutConfig";
import { UserRole, SubscriptionTier } from "@/lib/layoutConfig";
import SuperAdminLayout from "./SuperAdminLayout";
import AdminLayout from "./AdminLayout";
import ModeratorLayout from "./ModeratorLayout";
import UserLayout from "./UserLayout";
import "../Layout/RoleBasedLayout.scss";

export default function RoleBasedLayout({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(
    SubscriptionTier.FREE,
  );
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check maintenance status first
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/status`);
        const response = await res.json();
        // Backend wraps response in { data: ..., message: ..., statusCode: ... }
        const statusData = response.data || response;
        setIsMaintenanceMode(statusData.maintenance === true);
      } catch (error) {
        console.error("Status check failed", error);
        setIsMaintenanceMode(false);
      } finally {
        setMaintenanceChecked(true);
      }
    };

    checkMaintenanceStatus();
    
    // Re-check maintenance status every 30 seconds
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle maintenance mode redirects
  useEffect(() => {
    if (!maintenanceChecked) return;
    
    const currentUser = getCurrentUser();
    const userRole = currentUser ? getUserRole(currentUser) : UserRole.USER;
    const isUserAdmin = isAdminRole(userRole);
    
    // Paths that are always accessible
    const maintenanceExemptPaths = ['/maintenance', '/login', '/register', '/forgetpassword', '/auth/callback'];
    const isExemptPath = maintenanceExemptPaths.some(p => pathname.startsWith(p));
    
    if (isMaintenanceMode && !isUserAdmin && !isExemptPath) {
      // User is not admin and site is in maintenance - redirect to maintenance page
      router.replace('/maintenance');
      return;
    }
    
    if (!isMaintenanceMode && pathname === '/maintenance') {
      // Maintenance is over, redirect away from maintenance page
      router.replace('/');
      return;
    }
  }, [isMaintenanceMode, maintenanceChecked, pathname, router]);

  // Handle user authentication and routing
  useEffect(() => {
    if (!maintenanceChecked) return;

    const currentUser = getCurrentUser();
    const publicPaths = ['/login', '/register', '/forgetpassword', '/auth/callback', '/terms', '/privacy', '/maintenance'];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

    // No user found
    if (!currentUser) {
      if (pathname === '/' || isPublicPath) {
        setIsLoading(false);
        return;
      }
      // Redirect to login for protected routes
      router.replace('/login');
      return;
    }

    // User is authenticated
    const userRole = getUserRole(currentUser);
    const tier = getSubscriptionTier(currentUser);

    setUser(currentUser);
    setRole(userRole);
    setSubscriptionTier(tier);

    // If authenticated user tries to access root path, redirect based on role
    if (pathname === '/') {
      if (isAdminRole(userRole)) {
        router.replace('/admin/dashboard');
      } else if (userRole === UserRole.MODERATOR) {
        router.replace('/dashboard/spin');
      } else {
        router.replace('/dashboard/spin');
      }
      return;
    }

    setIsLoading(false);
  }, [pathname, router, maintenanceChecked]);

  // Listen for logout events
  useEffect(() => {
    const onLoggedOut = () => {
      setUser(null);
      setRole(UserRole.USER);
      setSubscriptionTier(SubscriptionTier.FREE);
      router.replace('/login');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('logged-out', onLoggedOut);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('logged-out', onLoggedOut);
      }
    };
  }, [router]);

  // Wait for maintenance check to complete
  if (!maintenanceChecked || isLoading) {
    return (
      <div className="layout-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // If in maintenance mode and not admin, don't render anything (redirect will happen)
  const currentUserForCheck = getCurrentUser();
  const currentRoleForCheck = currentUserForCheck ? getUserRole(currentUserForCheck) : UserRole.USER;
  const isCurrentUserAdmin = isAdminRole(currentRoleForCheck);
  const maintenanceExemptPaths = ['/maintenance', '/login', '/register', '/forgetpassword', '/auth/callback'];
  const isExemptPath = maintenanceExemptPaths.some(p => pathname.startsWith(p));
  
  if (isMaintenanceMode && !isCurrentUserAdmin && !isExemptPath) {
    return (
      <div className="layout-loading">
        <div className="spinner" />
        <p>Redirecting to maintenance...</p>
      </div>
    );
  }

  // Maintenance page should always render without any layout wrapper
  if (pathname === '/maintenance') {
    return <>{children}</>;
  }

  if (!user) {
    // Only allow specific public paths to render without authentication
    const publicPaths = ['/login', '/register', '/forgetpassword', '/auth/callback', '/terms', '/privacy', '/maintenance'];
    const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
    
    if (pathname === '/' || isPublicPath) {
      return <>{children}</>;
    }

    return null;
  }

  // Route to appropriate layout based on role
  const layoutProps = {
    user,
    children,
    role,
    subscriptionTier,
  };

  switch (role) {
    case UserRole.SUPER_ADMIN:
      return <SuperAdminLayout {...layoutProps} />;
    case UserRole.ADMIN:
    case UserRole.FINANCE_ADMIN:
    case UserRole.SYSTEM_ADMIN:
    case UserRole.AUDIT_ADMIN:
      return <AdminLayout {...layoutProps} />;
    case UserRole.MODERATOR:
      return <ModeratorLayout {...layoutProps} />;
    case UserRole.USER:
    default:
      return <UserLayout {...layoutProps} />;
  }
}