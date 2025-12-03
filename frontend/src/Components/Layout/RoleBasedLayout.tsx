"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import {
  getUserRole,
  getSubscriptionTier,
  getLayoutConfig,
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

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname || '';
        const authPaths = ['/login', '/register', '/forgetpassword'];
        // If we're already on an auth page, don't redirect again — just stop loading so page can render
        if (authPaths.includes(pathname)) {
          setIsLoading(false);
          return;
        }

        // Otherwise redirect to login
        router.replace('/login');
      }
      return;
    }

    // Extract user info
    setUser(currentUser);
    const userRole = getUserRole(currentUser);
    const tier = getSubscriptionTier(currentUser);

    setRole(userRole);
    setSubscriptionTier(tier);
    setIsLoading(false);

    // Listen for logout events dispatched by auth.logout()
    const onLoggedOut = () => {
      setUser(null);
      setRole(UserRole.USER);
      setSubscriptionTier(SubscriptionTier.FREE);
      setIsLoading(false);
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
    // If the current path is an auth page, allow children (login/register) to render
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname || "";
      const authPaths = ['/login', '/register', '/forgetpassword'];
      const isAuthPath = authPaths.some((p) => pathname.startsWith(p));
      if (isAuthPath) {
        return <>{children}</>;
      }
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
      return <AdminLayout {...layoutProps} />;
    case UserRole.MODERATOR:
      return <ModeratorLayout {...layoutProps} />;
    case UserRole.USER:
    default:
      return <UserLayout {...layoutProps} />;
  }
}
