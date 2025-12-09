# Role-Based Layout System

A comprehensive role-based layout system for the ForexAI Exchange application with support for multiple user roles and subscription tiers.

## Features

- ✅ **4 Role-Based Layouts**: Super Admin, Admin, Moderator, User
- ✅ **Subscription Tier Support**: Free, Basic, Premium, VIP
- ✅ **Dynamic Menu Generation**: Different menus based on roles
- ✅ **Permission Management**: Feature access control
- ✅ **Theme Customization**: Role-specific color schemes
- ✅ **Responsive Design**: Works on desktop and mobile
- ✅ **Easy Integration**: Drop-in replacement for existing layout

## User Roles

### 1. **SUPER_ADMIN** 🔴

Full system access with maximum control

- **Menu Items**: Dashboard, User Management, System Settings, Analytics, Monitoring, Database, Security, Logs, Activity
- **Features**: User management, system settings, full analytics, database management, security controls
- **Theme**: Red-based (`#dc2626`)

### 2. **ADMIN** 🔵

Administrative access with user and affiliate management

- **Menu Items**: Dashboard, User Management, Analytics, Reports, Affiliate Settings, Transactions
- **Features**: User management, analytics, affiliate management, transaction management
- **Theme**: Blue-based (`#2563eb`)

### 3. **MODERATOR** 🟣

Community management and moderation tools

- **Menu Items**: Dashboard, Community, Reports, Settings
- **Features**: Community management, report handling, user support
- **Theme**: Purple-based (`#7c3aed`)

### 4. **USER** 🔷

Regular user with subscription awareness

- **Menu Items**: Spin, Withdraw, Premium, Affiliate, Settings
- **Features**: Spin, withdraw, deposit, affiliate program
- **Theme**: Cyan-based (`#0ea5e9`)

## Subscription Tiers

| Tier    | Daily Spins | Min Bet | Max Bet | Features              |
| ------- | ----------- | ------- | ------- | --------------------- |
| FREE    | 10          | $1      | $10     | Basic spinning        |
| BASIC   | 50          | $0.5    | $50     | More spins, lower min |
| PREMIUM | 200         | $0.1    | $500    | High limits           |
| VIP     | 500         | $0.01   | $5000   | Unlimited access      |

## Installation

1. **Files Created**:
   - `/frontend/src/lib/layoutConfig.ts` - Configuration and utilities
   - `/frontend/src/Components/Layout/RoleBasedLayout.tsx` - Main router component
   - `/frontend/src/Components/Layout/SuperAdminLayout.tsx` - Super Admin layout
   - `/frontend/src/Components/Layout/AdminLayout.tsx` - Admin layout
   - `/frontend/src/Components/Layout/ModeratorLayout.tsx` - Moderator layout
   - `/frontend/src/Components/Layout/UserLayout.tsx` - User layout
   - `/frontend/src/hooks/useLayoutState.ts` - Custom hooks

2. **Update Your Root Layout**:

```tsx
// app/layout.tsx or app/app.tsx
import RoleBasedLayout from "@/Components/Layout/RoleBasedLayout";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RoleBasedLayout>{children}</RoleBasedLayout>
      </body>
    </html>
  );
}
```

## Usage

### Basic Usage in Components

```tsx
import {
  useLayoutState,
  useIsAdmin,
  useIsPremium,
} from "@/hooks/useLayoutState";

export function MyComponent() {
  const { user, role, subscriptionTier, hasFeature } = useLayoutState();

  if (useIsAdmin()) {
    return <AdminContent />;
  }

  if (useIsPremium()) {
    return <PremiumContent />;
  }

  return <RegularContent />;
}
```

### Using Custom Hooks

```tsx
import { useIsSuperAdmin, useSpinLimits } from "@/hooks/useLayoutState";

export function SpinComponent() {
  const spinLimits = useSpinLimits();
  const isSuperAdmin = useIsSuperAdmin();

  return (
    <div>
      <p>Max Bet: ${spinLimits.maxBetAmount}</p>
      {isSuperAdmin && <AdminControls />}
    </div>
  );
}
```

### Checking Feature Access

```tsx
import { useLayoutState } from "@/hooks/useLayoutState";

export function FeatureComponent() {
  const { hasFeature } = useLayoutState();

  if (hasFeature("view_analytics")) {
    return <AnalyticsView />;
  }

  return <FeatureLockedPage />;
}
```

## Configuration Customization

### Modifying Menu Items

Edit `/lib/layoutConfig.ts`:

```typescript
export const ROLE_LAYOUT_CONFIG: Record<UserRole, LayoutConfig> = {
  [UserRole.SUPER_ADMIN]: {
    menuItems: [
      {
        icon: Home,
        label: "Dashboard",
        href: "/admin/dashboard",
        badge: "Admin",
      },
      // Add your custom menu items here
    ],
    // ... other config
  },
};
```

### Updating Color Themes

Edit the SCSS files:

- `SuperAdminLayout.scss`
- `AdminLayout.scss`
- `ModeratorLayout.scss`
- `UserLayout.scss`

Update the color variables:

```scss
$role-primary: #newcolor;
$role-secondary: #newcolor;
$role-accent: #newcolor;
```

## User Data Structure

The system expects the user object stored in localStorage to have:

```typescript
{
  id: string;
  email: string;
  username: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "USER";
  premium: boolean;
  premiumSubscription?: {
    plan?: {
      name: string;
    };
  };
}
```

## Updating Backend

Ensure your backend returns the correct role and subscription data during authentication:

```typescript
// Example API response
{
  token: "...",
  user: {
    id: "...",
    email: "admin@example.com",
    username: "admin",
    role: "ADMIN",  // Important
    premium: true,  // Important
    premiumSubscription: {
      plan: {
        name: "Premium"
      }
    }
  }
}
```

## Advanced Usage

### Creating Role-Protected Components

```tsx
import { useLayoutState } from "@/hooks/useLayoutState";

interface RoleGuardProps {
  requiredRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  requiredRoles,
  children,
  fallback,
}: RoleGuardProps) {
  const { role, isLoading } = useLayoutState();

  if (isLoading) return <div>Loading...</div>;

  if (!requiredRoles.includes(role)) {
    return fallback || <div>Access Denied</div>;
  }

  return children;
}

// Usage
<RoleGuard requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
  <AdminPanel />
</RoleGuard>;
```

### Custom Permission Checks

```typescript
// Add custom permissions to layoutConfig.ts
export const ROLE_LAYOUT_CONFIG: Record<UserRole, LayoutConfig> = {
  [UserRole.SUPER_ADMIN]: {
    permissions: [
      { name: "delete_users", roles: [UserRole.SUPER_ADMIN] },
      { name: "edit_system_settings", roles: [UserRole.SUPER_ADMIN] },
      // Add custom permissions
    ],
    // ...
  },
};

// Use in component
const { hasPermissionTo } = useLayoutState();

if (hasPermissionTo('delete_users')) {
  return <DeleteUserButton />;
}
```

## Responsive Behavior

The layouts automatically adapt to mobile devices:

- **Desktop**: Full sidebar with labels and icons
- **Tablet**: Collapsible sidebar with icon labels
- **Mobile**: Horizontal menu bar with condensed navigation

## Troubleshooting

### Layout not changing after login

- Ensure user data is properly saved to localStorage
- Check that the `role` field is correctly set in the API response
- Clear browser cache and try again

### Menu items not showing

- Verify menu items are defined in `layoutConfig.ts`
- Check that the icons are properly imported from lucide-react
- Ensure the component is using the correct role configuration

### Styling issues

- Make sure SCSS files are properly imported
- Check that `sass` package is installed: `npm install sass`
- Verify CSS class names match between components and SCSS files

## File Structure

```
frontend/src/
├── lib/
│   └── layoutConfig.ts          # Configuration and utilities
├── Components/Layout/
│   ├── RoleBasedLayout.tsx       # Main router component
│   ├── RoleBasedLayout.scss
│   ├── SuperAdminLayout.tsx
│   ├── SuperAdminLayout.scss
│   ├── AdminLayout.tsx
│   ├── AdminLayout.scss
│   ├── ModeratorLayout.tsx
│   ├── ModeratorLayout.scss
│   ├── UserLayout.tsx
│   └── UserLayout.scss
└── hooks/
    └── useLayoutState.ts         # Custom hooks
```

## Best Practices

1. **Always use hooks** for permission checking instead of direct role comparison
2. **Define permissions centrally** in `layoutConfig.ts`
3. **Keep menu items consistent** across similar roles
4. **Test on mobile** devices regularly
5. **Use TypeScript** for type safety in components
6. **Cache layout configuration** for performance

## Support

For issues or questions, check:

- The example implementations in this file
- The component source code comments
- The layout configuration structure in `layoutConfig.ts`

---

**Last Updated**: December 3, 2025
**Version**: 1.0.0
