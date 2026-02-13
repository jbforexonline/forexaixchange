"use client";
import React, { useState } from "react";
import {
  Home,
  Users,
  BarChart3,
  AlertCircle,
  Settings,
  CreditCard,
  ChevronDown,
  FileText,
  Building2,
  DollarSign,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { UserRole, SubscriptionTier } from "@/lib/layoutConfig";
import MaintenanceBanner from "../Common/MaintenanceBanner";
import "../Layout/AdminLayout.scss";

interface AdminLayoutProps {
  children: React.ReactNode;
  user: any;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

export default function AdminLayout({
  children,
  user,
  role,
  subscriptionTier,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const router = useRouter();

  const closeMobileMenu = () => setMobileMenuOpen(false);

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
        { label: "Active Users", href: "/admin/users/active" },
        { label: "Reports", href: "/admin/users/reports" },
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
        { label: "Reports", href: "/admin/analytics/reports" },
      ],
    },
    {
      icon: AlertCircle,
      label: "Reports",
      href: "/admin/reports",
      category: "reports",
    },
    {
      icon: Settings,
      label: "System Settings",
      href: "/admin/settings",
      category: "system",
      submenu: [
        { label: "General & Maintenance", href: "/admin/settings" },
        { label: "Affiliate Settings", href: "/admin/affiliate-settings" },
      ],
    },
    {
      icon: DollarSign,
      label: "Financial Management",
      href: "/admin/financial",
      category: "financial",
      submenu: [
        { label: "Overview", href: "/admin/financial" },
        { label: "User Deposits", href: "/admin/financial?tab=deposits" },
        { label: "User Withdrawals", href: "/admin/financial?tab=withdrawals" },
        { label: "Disputes / Pending", href: "/admin/financial?tab=disputes" },
      ],
    },
    {
      icon: Building2,
      label: "House Accounts",
      href: "/admin/house-accounts",
      category: "house",
      submenu: [
        { label: "Overview", href: "/admin/house-accounts" },
        { label: "Manage Accounts", href: "/admin/house-accounts?tab=accounts" },
        { label: "Bank & Reserve", href: "/admin/house-accounts?tab=bank" },
        { label: "Settlements", href: "/admin/house-accounts?tab=settlements" },
      ],
    },
    {
      icon: FileText,
      label: "Legal (Terms & Privacy)",
      href: "/admin/legal",
      category: "legal",
    },
    {
      icon: MessageCircle,
      label: "Chat Moderation",
      href: "/admin/chat",
      category: "chat",
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
    <div className="admin-layout">
      {/* Maintenance Mode Banner */}
      <MaintenanceBanner />
      
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="admin-mobile-overlay" onClick={closeMobileMenu} aria-hidden="true" />
      )}
      
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <button
            className="admin-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
          <h1 className="system-title">Admin Dashboard</h1>
        </div>

        <div className="header-right">
          <div className="user-info">
            <div className="user-badge">
              <span className="role-badge admin">ADMIN</span>
            </div>
            <div className="user-details">
              <p className="username">{user?.username || "Admin"}</p>
              <p className="email">{user?.email}</p>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Logout">
            ⏻
          </button>
        </div>
      </header>

      <div className="admin-container">
        {/* Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : "closed"} ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <button className="admin-sidebar-close" onClick={closeMobileMenu} aria-label="Close menu">
            <X size={20} />
          </button>
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
                        closeMobileMenu();
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
                          onClick={() => {
                            router.push(subitem.href);
                            closeMobileMenu();
                          }}
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
        <main className="admin-content">{children}</main>
      </div>

      {/* Footer */}
      <footer className="admin-footer">
        <p>&copy; 2024 ForexAI Exchange. Admin Dashboard.</p>
      </footer>
    </div>
  );
}
