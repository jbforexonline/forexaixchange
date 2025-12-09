# Quick Implementation Guide

## Step-by-Step Setup

### Step 1: Update Your Root App Layout

Replace your root layout with the `RoleBasedLayout`:

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import RoleBasedLayout from "@/Components/Layout/RoleBasedLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForexAI Exchange",
  description: "Forex Trading Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RoleBasedLayout>{children}</RoleBasedLayout>
      </body>
    </html>
  );
}
```

### Step 2: Update Authentication Response

Ensure your login API returns proper user data:

```typescript
// Backend - Make sure to include role and premium status
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "role": "USER",           // ← IMPORTANT
    "premium": false,         // ← IMPORTANT
    "premiumSubscription": null,
    "createdAt": "2024-01-01"
  }
}
```

### Step 3: Update Frontend Auth Service

Make sure the auth service stores user data correctly:

```typescript
// frontend/src/lib/auth.ts
export function loginUser(response: any): void {
  if (typeof window === "undefined") return;

  // Store token
  localStorage.setItem("token", response.token);

  // Store complete user object with role and premium status
  localStorage.setItem("user", JSON.stringify(response.user));
}
```

### Step 4: Test the Layout Switch

Create test users with different roles:

```bash
# Test URLs after login
# Super Admin user:
user: superadmin@test.com, role: SUPER_ADMIN
# → See: Dashboard, User Management, System Settings, etc.

# Admin user:
user: admin@test.com, role: ADMIN
# → See: Dashboard, User Management, Analytics, Reports

# Moderator user:
user: moderator@test.com, role: MODERATOR
# → See: Dashboard, Community, Reports

# Regular user (premium):
user: user@test.com, role: USER, premium: true
# → See: Spin, Withdraw, Premium, Affiliate, Settings with Premium badge
```

## Common Integration Points

### 1. Adding Admin Pages

Create pages that only admins can see:

```tsx
// frontend/src/app/admin/users/page.tsx
"use client";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

export default function UserManagementPage() {
  const { role } = useLayoutState();

  if (![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(role)) {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <h1>User Management</h1>
      {/* Your admin content */}
    </div>
  );
}
```

### 2. Feature Gating with Subscriptions

```tsx
// frontend/src/app/features/premium/page.tsx
"use client";
import { useLayoutState } from "@/hooks/useLayoutState";
import { SubscriptionTier } from "@/lib/layoutConfig";

export default function PremiumFeature() {
  const { subscriptionTier } = useLayoutState();

  if (subscriptionTier === SubscriptionTier.FREE) {
    return (
      <div className="premium-locked">
        <h2>Premium Feature</h2>
        <p>This feature is only available to premium members</p>
        <button onClick={() => router.push("/deposit")}>Upgrade Now</button>
      </div>
    );
  }

  return <div>{/* Premium content */}</div>;
}
```

### 3. Custom Menu Items

Add custom items based on conditions:

```typescript
// In layoutConfig.ts
export function getCustomMenuItems(role: UserRole, user: any): MenuItem[] {
  const baseItems = ROLE_LAYOUT_CONFIG[role].menuItems;

  // Add items conditionally
  if (user?.hasCustomAccess) {
    baseItems.push({
      icon: Star,
      label: "Custom Feature",
      href: "/custom-feature",
    });
  }

  return baseItems;
}
```

### 4. Protected API Calls

```tsx
"use client";
import { useLayoutState } from "@/hooks/useLayoutState";

export function AdminApiComponent() {
  const { role, hasPermissionTo } = useLayoutState();

  const handleFetchAdminData = async () => {
    if (!hasPermissionTo("view_users")) {
      alert("You do not have permission");
      return;
    }

    const response = await fetch("/api/admin/users");
    const data = await response.json();
    // Use data
  };

  return <button onClick={handleFetchAdminData}>Load Admin Data</button>;
}
```

## Debugging

### Check Current User Role

Add this to any component to debug:

```tsx
"use client";
import { useLayoutState } from "@/hooks/useLayoutState";

export function DebugComponent() {
  const { user, role, subscriptionTier } = useLayoutState();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        background: "#333",
        color: "#fff",
        padding: "10px",
        fontSize: "12px",
      }}
    >
      <p>User: {user?.username}</p>
      <p>Role: {role}</p>
      <p>Subscription: {subscriptionTier}</p>
    </div>
  );
}
```

### Check localStorage

In browser console:

```javascript
// Check if user data is stored
console.log(JSON.parse(localStorage.getItem("user")));

// Should output:
// {
//   id: "...",
//   email: "...",
//   username: "...",
//   role: "ADMIN",
//   premium: true,
//   ...
// }
```

## Customization Checklist

- [ ] Update root layout with `RoleBasedLayout`
- [ ] Verify backend returns `role` field
- [ ] Verify backend returns `premium` and `premiumSubscription` fields
- [ ] Create admin pages at `/admin/dashboard`, `/admin/users`, etc.
- [ ] Test login with different role users
- [ ] Update color theme if needed (edit SCSS files)
- [ ] Add custom menu items to your roles
- [ ] Test on mobile devices
- [ ] Update API endpoints to handle role-based access

## Migration from Old Layout

If you have an existing layout:

1. **Backup** your current layout files
2. **Export** any custom styling/components
3. **Replace** the layout import in your root
4. **Test** all navigation and features
5. **Update** API endpoints to include role/premium data
6. **Migrate** custom components to new layout structure

## Performance Tips

1. **Memoize** components that use `useLayoutState`:

```tsx
import { memo } from "react";
export const UserMenu = memo(function UserMenu() {
  const { user } = useLayoutState();
  return <>{/* ... */}</>;
});
```

2. **Cache** layout configuration in localStorage:

```tsx
// Optional: Cache config to reduce lookups
localStorage.setItem("layout_config", JSON.stringify(layoutConfig));
```

3. **Lazy load** admin pages:

```tsx
import dynamic from "next/dynamic";
const AdminDashboard = dynamic(() => import("@/app/admin/dashboard"));
```

## Support Contacts

- **Questions**: Check LAYOUT_SYSTEM_README.md
- **Issues**: Review component source code
- **API**: Update backend role/subscription response format
- **Styling**: Modify SCSS files in Layout folder

---

Ready to go! Test your implementation with different user roles.
