/**
 * Layout configuration based on user roles and subscription plans
 */

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  USER = "USER",
}

export enum SubscriptionTier {
  FREE = "FREE",
  BASIC = "BASIC",
  PREMIUM = "PREMIUM",
  VIP = "VIP",
}

export interface LayoutConfig {
  menuItems: MenuItem[];
  features: string[];
  permissions: Permission[];
  theme?: ThemeConfig;
  maxWalletActions?: number;
  spinLimits?: SpinLimits;
}

export interface MenuItem {
  icon: any;
  label: string;
  href: string;
  badge?: string;
  requiredRole?: UserRole[];
  requiredSubscription?: SubscriptionTier[];
  divider?: boolean;
}

export interface Permission {
  name: string;
  roles: UserRole[];
  subscriptions?: SubscriptionTier[];
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
}

export interface SpinLimits {
  dailySpins: number;
  minBetAmount: number;
  maxBetAmount: number;
}

// Role-based layout configurations
export const ROLE_LAYOUT_CONFIG: Record<UserRole, LayoutConfig> = {
  [UserRole.SUPER_ADMIN]: {
    menuItems: [
      { icon: "Home", label: "Dashboard", href: "/admin/dashboard", badge: "Admin" },
      { icon: "Users", label: "User Management", href: "/admin/users" },
      { icon: "Settings", label: "System Settings", href: "/admin/settings" },
      { icon: "BarChart3", label: "Analytics", href: "/admin/analytics" },
      { icon: "AlertCircle", label: "Monitoring", href: "/admin/monitoring" },
      { icon: "Database", label: "Database", href: "/admin/database" },
      { icon: "Lock", label: "Security", href: "/admin/security" },
      { divider: true },
      { icon: "FileText", label: "Logs", href: "/admin/logs" },
      { icon: "Clock", label: "Activity", href: "/admin/activity" },
    ],
    features: [
      "full_system_access",
      "user_management",
      "system_settings",
      "analytics",
      "monitoring",
      "database_management",
      "security_controls",
    ],
    permissions: [
      { name: "view_all_users", roles: [UserRole.SUPER_ADMIN] },
      { name: "manage_admins", roles: [UserRole.SUPER_ADMIN] },
      { name: "system_settings", roles: [UserRole.SUPER_ADMIN] },
      { name: "view_analytics", roles: [UserRole.SUPER_ADMIN] },
    ],
    theme: {
      primaryColor: "#dc2626",
      secondaryColor: "#991b1b",
      accentColor: "#fca5a5",
      backgroundColor: "#7f1d1d",
    },
  },

  [UserRole.ADMIN]: {
    menuItems: [
      { icon: "Home", label: "Dashboard", href: "/admin/dashboard", badge: "Admin" },
      { icon: "Users", label: "User Management", href: "/admin/users" },
      { icon: "BarChart3", label: "Analytics", href: "/admin/analytics" },
      { icon: "AlertCircle", label: "Reports", href: "/admin/reports" },
      { divider: true },
      { icon: "Settings", label: "Affiliate Settings", href: "/admin/affiliate-settings" },
      { icon: "CreditCard", label: "Transactions", href: "/admin/transactions" },
    ],
    features: [
      "user_management",
      "view_analytics",
      "manage_affiliate",
      "view_transactions",
    ],
    permissions: [
      { name: "view_users", roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      { name: "view_analytics", roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      { name: "manage_affiliate", roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    ],
    theme: {
      primaryColor: "#2563eb",
      secondaryColor: "#1e40af",
      accentColor: "#93c5fd",
      backgroundColor: "#0c2340",
    },
  },

  [UserRole.MODERATOR]: {
    menuItems: [
      { icon: "Home", label: "Dashboard", href: "/dashboard" },
      { icon: "MessageSquare", label: "Community", href: "/community" },
      { icon: "Flag", label: "Reports", href: "/reports" },
      { divider: true },
      { icon: "Settings", label: "Settings", href: "/settings" },
    ],
    features: ["view_community", "manage_reports", "user_support"],
    permissions: [
      { name: "view_community", roles: [UserRole.MODERATOR] },
      { name: "manage_reports", roles: [UserRole.MODERATOR] },
    ],
    theme: {
      primaryColor: "#7c3aed",
      secondaryColor: "#6d28d9",
      accentColor: "#d8b4fe",
      backgroundColor: "#3f0f63",
    },
  },

  [UserRole.USER]: {
    menuItems: [
      { icon: "Home", label: "Spin", href: "/spin" },
      { icon: "Wallet", label: "Withdraw", href: "/withdraw" },
      { icon: "AppWindow", label: "Premium", href: "/deposit" },
      { icon: "BookOpen", label: "Affiliate", href: "/Affiliate" },
      { icon: "Sword", label: "Settings", href: "/settings" },
    ],
    features: ["spin", "withdraw", "deposit", "affiliate"],
    permissions: [
      { name: "play_spin", roles: [UserRole.USER] },
      { name: "withdraw", roles: [UserRole.USER] },
      { name: "deposit", roles: [UserRole.USER] },
    ],
    theme: {
      primaryColor: "#0ea5e9",
      secondaryColor: "#0284c7",
      accentColor: "#7dd3fc",
      backgroundColor: "#082f49",
    },
  },
};

// Subscription-based feature unlocks
export const SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SpinLimits> = {
  [SubscriptionTier.FREE]: {
    dailySpins: 10,
    minBetAmount: 1,
    maxBetAmount: 10,
  },
  [SubscriptionTier.BASIC]: {
    dailySpins: 50,
    minBetAmount: 0.5,
    maxBetAmount: 50,
  },
  [SubscriptionTier.PREMIUM]: {
    dailySpins: 200,
    minBetAmount: 0.1,
    maxBetAmount: 500,
  },
  [SubscriptionTier.VIP]: {
    dailySpins: 500,
    minBetAmount: 0.01,
    maxBetAmount: 5000,
  },
};

/**
 * Get layout configuration for user based on role and subscription
 */
export function getLayoutConfig(
  role: UserRole = UserRole.USER,
  subscriptionTier: SubscriptionTier = SubscriptionTier.FREE
): LayoutConfig {
  const baseConfig = ROLE_LAYOUT_CONFIG[role] || ROLE_LAYOUT_CONFIG[UserRole.USER];

  // Merge with subscription-based limits
  return {
    ...baseConfig,
    spinLimits: SUBSCRIPTION_FEATURES[subscriptionTier],
  };
}

/**
 * Check if user has permission
 */
export function hasPermission(
  permission: string,
  role: UserRole,
  allPermissions: Permission[]
): boolean {
  const perm = allPermissions.find((p) => p.name === permission);
  return perm ? perm.roles.includes(role) : false;
}

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(
  featureName: string,
  role: UserRole,
  subscriptionTier: SubscriptionTier
): boolean {
  const config = getLayoutConfig(role, subscriptionTier);
  return config.features.includes(featureName);
}

/**
 * Get subscription tier from user data
 */
export function getSubscriptionTier(user: any): SubscriptionTier {
  if (!user?.premium) return SubscriptionTier.FREE;

  // If you have subscription plan details, map them here
  if (user?.premiumSubscription?.plan?.name?.includes("VIP")) {
    return SubscriptionTier.VIP;
  }
  if (user?.premiumSubscription?.plan?.name?.includes("Premium")) {
    return SubscriptionTier.PREMIUM;
  }
  if (user?.premium) {
    return SubscriptionTier.BASIC;
  }

  return SubscriptionTier.FREE;
}

/**
 * Get user role from user data
 */
export function getUserRole(user: any): UserRole {
  if (!user?.role) return UserRole.USER;
  return user.role as UserRole;
}
