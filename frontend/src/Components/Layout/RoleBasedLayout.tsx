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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/status`);
        const data = await res.json();
        
        const currentUser = getCurrentUser();
        const userRole = currentUser ? getUserRole(currentUser) : UserRole.USER;
        const isUserAdmin = isAdminRole(userRole);
        
        if (data.maintenance && !isUserAdmin && pathname !== '/maintenance' && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
          router.replace('/maintenance');
          return;
        }

        if (!data.maintenance && pathname === '/maintenance') {
          router.replace('/');
          return;
        }
      } catch (error) {
        console.error("Status check failed", error);
      }
    };

    checkStatus();

    const currentUser = getCurrentUser();
    const publicPaths = ['/login', '/register', '/forgetpassword', '/auth/callback', '/terms', '/privacy'];
    const isPublicPath = publicPaths.includes(pathname);

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
  }, [pathname, router]);

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

  if (isLoading) {
    return (
      <div className="layout-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Only allow specific public paths to render without authentication
    const publicPaths = ['/login', '/register', '/forgetpassword', '/auth/callback', '/terms', '/privacy'];
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