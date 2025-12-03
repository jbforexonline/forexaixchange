"use client";
import React, { useState } from "react";
import {
  Home,
  Wallet,
  AppWindow,
  BookOpen,
  Sword,
  Settings,
  Crown,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { UserRole, SubscriptionTier } from "@/lib/layoutConfig";
import "../Layout/UserLayout.scss";

interface UserLayoutProps {
  children: React.ReactNode;
  user: any;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

export default function UserLayout({
  children,
  user,
  role,
  subscriptionTier,
}: UserLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  const userMenuItems = [
    { icon: Home, label: "Spin", href: "/spin" },
    { icon: Wallet, label: "Withdraw", href: "/withdraw" },
    {
      icon: AppWindow,
      label: "Premium",
      href: "/deposit",
      badge:
        subscriptionTier !== SubscriptionTier.FREE
          ? subscriptionTier
          : undefined,
    },
    { icon: BookOpen, label: "Affiliate", href: "/Affiliate" },
    { icon: Sword, label: "Settings", href: "/settings" },
  ];

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const getSubscriptionBadgeClass = () => {
    switch (subscriptionTier) {
      case SubscriptionTier.VIP:
        return "vip";
      case SubscriptionTier.PREMIUM:
        return "premium";
      case SubscriptionTier.BASIC:
        return "basic";
      default:
        return "free";
    }
  };

  return (
    <div className="user-layout">
      {/* Sidebar */}
      <aside className={`user-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-top">
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
        </div>

        <nav className="user-menu">
          {userMenuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                className="menu-item"
                onClick={() => router.push(item.href)}
                title={item.label}
              >
                {item.label === "Premium" &&
                  subscriptionTier !== SubscriptionTier.FREE && (
                    <Crown size={20} className="premium-icon" />
                  )}
                {item.label !== "Premium" && <Icon size={20} />}
                {sidebarOpen && (
                  <div className="menu-item-content">
                    <span className="menu-label">{item.label}</span>
                    {item.badge && (
                      <span className="menu-badge">{item.badge}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          <button
            className="menu-item logout"
            onClick={handleLogout}
            title="Logout"
          >
            <Settings size={20} />
            {sidebarOpen && <span className="menu-label">Logout</span>}
          </button>
        </nav>
      </aside>

      <div className="user-content-wrapper">
        {/* Header */}
        <header className="user-header">
          <div className="header-left">
            <h1 className="page-title">ForexAI Exchange</h1>
          </div>

          <div className="header-right">
            <div className="subscription-info">
              <span
                className={`subscription-badge ${getSubscriptionBadgeClass()}`}
              >
                {subscriptionTier}
              </span>
            </div>

            <div className="user-profile">
              <div className="user-avatar">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <p className="username">{user?.username}</p>
                <p className="subscription-status">
                  {subscriptionTier === SubscriptionTier.FREE
                    ? "Free User"
                    : `${subscriptionTier} Member`}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="user-main-content">{children}</main>

        {/* Footer */}
        <footer className="user-footer">
          <p>&copy; 2024 ForexAI Exchange. All rights reserved.</p>
          {subscriptionTier === SubscriptionTier.FREE && (
            <button
              className="upgrade-prompt"
              onClick={() => router.push("/deposit")}
            >
              Upgrade to Premium 🚀
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
