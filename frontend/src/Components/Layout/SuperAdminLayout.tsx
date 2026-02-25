"use client";
import React, { useState } from "react";
import {
  Home,
  Users,
  Settings,
  BarChart3,
  AlertCircle,
  Database,
  Lock,
  CreditCard,
  FileText,
  Clock,
  ChevronDown,
  MessageCircle,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { UserRole, SubscriptionTier } from "@/lib/layoutConfig";
import MaintenanceBanner from "../Common/MaintenanceBanner";
import "../Layout/SuperAdminLayout.scss";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  user: any;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

export default function SuperAdminLayout({
  children,
  user,
  role,
  subscriptionTier,
}: SuperAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const router = useRouter();

  const adminMenuItems = [
    {
      icon: Home,
      label: "Dashboard",
      href: "/admin/dashboard",
      category: "main",
    },
    {
      icon: Users,
      label: "User Management",
      href: "/admin/users",
      category: "users",
      submenu: [
        { label: "All Users", href: "/admin/users" },
        { label: "Create User", href: "/admin/users/create" },
        { label: "User Reports", href: "/admin/users/reports" },
      ],
    },
    {
      icon: Settings,
      label: "System Settings",
      href: "/admin/settings",
      category: "system",
      submenu: [
        { label: "General Settings", href: "/admin/settings" },
        { label: "Spin Configuration", href: "/admin/settings/spin" },
        { label: "Premium Plans", href: "/admin/settings/premium" },
        { label: "Commission Rules", href: "/admin/settings/commission" },
        { label: "Legal (Terms & Privacy)", href: "/admin/legal" },
        { label: "FAQ", href: "/admin/faq" },
      ],
    },
    {
      icon: BarChart3,
      label: "Analytics",
      href: "/admin/analytics",
      category: "analytics",
      submenu: [
        { label: "Revenue", href: "/admin/analytics/revenue" },
        { label: "User Activity", href: "/admin/analytics/activity" },
        { label: "Spin Statistics", href: "/admin/analytics/spins" },
        { label: "Reports", href: "/admin/analytics/reports" },
      ],
    },
    {
      icon: AlertCircle,
      label: "Monitoring",
      href: "/admin/monitoring",
      category: "monitoring",
    },
    {
      icon: Database,
      label: "Database",
      href: "/admin/database",
      category: "database",
    },
    {
      icon: Lock,
      label: "Security",
      href: "/admin/security",
      category: "security",
      submenu: [
        { label: "Permissions", href: "/admin/security/permissions" },
        { label: "API Keys", href: "/admin/security/api-keys" },
        { label: "Audit Logs", href: "/admin/security/audit-logs" },
        { label: "Two-Factor Auth", href: "/admin/security/2fa" },
      ],
    },
    {
      icon: FileText,
      label: "Logs",
      href: "/admin/logs",
      category: "logs",
    },
    {
      icon: MessageCircle,
      label: "Chat Moderation",
      href: "/admin/chat",
      category: "chat",
    },
    {
      icon: CreditCard,
      label: "Financial Management",
      href: "/admin/financial",
      category: "financial",
      submenu: [
        { label: "Overview", href: "/admin/financial" },
        { label: "Pending Approvals", href: "/admin/financial?tab=pending" },
        { label: "Configuration", href: "/admin/financial?tab=config" },
      ],
    },
    {
      icon: Clock,
      label: "Activity",
      href: "/admin/activity",
      category: "activity",
    },
  ];

  const toggleMenu = (category: string) => {
    setExpandedMenus((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className="super-admin-layout">
      {/* Maintenance Mode Banner */}
      <MaintenanceBanner />
      
      {/* Header */}
      <header className="super-admin-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            <Menu size={22} />
          </button>
          <h1 className="system-title">ForexAI Exchange - Admin Console</h1>
        </div>

        <div className="header-right">
          <div className="user-info">
            <div className="user-badge">
              <span className="role-badge super-admin">SUPER ADMIN</span>
            </div>
            <div className="user-details">
              <p className="username">{user?.username || "Super Admin"}</p>
              <p className="email">{user?.email}</p>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Logout">
            ⏻
          </button>
        </div>
      </header>

      <div className="super-admin-container">
        {/* Sidebar */}
        <aside
          className={`super-admin-sidebar ${sidebarOpen ? "open" : "closed"}`}
        >
          <nav className="admin-nav">
            {adminMenuItems.map((item, idx) => {
              const Icon = item.icon;
              const isExpanded = expandedMenus.includes(item.category);
              const hasSubmenu = item.submenu && item.submenu.length > 0;

              return (
                <div key={idx} className="nav-item-wrapper">
                  <button
                    className="nav-item"
                    onClick={() => {
                      if (hasSubmenu) {
                        toggleMenu(item.category);
                      } else {
                        router.push(item.href);
                      }
                    }}
                  >
                    <Icon size={20} />
                    {sidebarOpen && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        {hasSubmenu && (
                          <ChevronDown
                            size={16}
                            className={`chevron ${isExpanded ? "expanded" : ""}`}
                          />
                        )}
                      </>
                    )}
                  </button>

                  {hasSubmenu && sidebarOpen && isExpanded && (
                    <div className="submenu">
                      {item.submenu.map((subitem, subidx) => (
                        <button
                          key={subidx}
                          className="submenu-item"
                          onClick={() => router.push(subitem.href)}
                        >
                          {subitem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="super-admin-content">{children}</main>
      </div>

      {/* Footer */}
      <footer className="super-admin-footer">
        <p>&copy; 2024 ForexAI Exchange. Super Admin Console.</p>
      </footer>
    </div>
  );
}
