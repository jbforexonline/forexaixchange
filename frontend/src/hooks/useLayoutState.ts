import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import {
  getUserRole,
  getSubscriptionTier,
  getLayoutConfig,
  hasFeatureAccess,
  hasPermission,
  UserRole,
  SubscriptionTier,
} from '@/lib/layoutConfig';

export interface UseLayoutStateReturn {
  user: any | null;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  layoutConfig: any;
  hasFeature: (featureName: string) => boolean;
  hasPermissionTo: (permission: string) => boolean;
  isLoading: boolean;
}

/**
 * Hook to manage and access layout configuration and user permissions
 */
export function useLayoutState(): UseLayoutStateReturn {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(
    SubscriptionTier.FREE
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setRole(getUserRole(currentUser));
      setSubscriptionTier(getSubscriptionTier(currentUser));
    }
    setIsLoading(false);
  }, []);

  const layoutConfig = getLayoutConfig(role, subscriptionTier);

  const hasFeature = (featureName: string): boolean => {
    return hasFeatureAccess(featureName, role, subscriptionTier);
  };

  const hasPermissionTo = (permission: string): boolean => {
    return hasPermission(permission, role, layoutConfig.permissions);
  };

  return {
    user,
    role,
    subscriptionTier,
    layoutConfig,
    hasFeature,
    hasPermissionTo,
    isLoading,
  };
}

/**
 * Hook to check if user is admin (SUPER_ADMIN or ADMIN)
 */
export function useIsAdmin(): boolean {
  const { role } = useLayoutState();
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

/**
 * Hook to check if user is super admin
 */
export function useIsSuperAdmin(): boolean {
  const { role } = useLayoutState();
  return role === UserRole.SUPER_ADMIN;
}

/**
 * Hook to check if user has premium subscription
 */
export function useIsPremium(): boolean {
  const { subscriptionTier } = useLayoutState();
  return subscriptionTier !== SubscriptionTier.FREE;
}

/**
 * Hook to get spin limits based on subscription
 */
export function useSpinLimits() {
  const { layoutConfig } = useLayoutState();
  return layoutConfig.spinLimits;
}
