"use client";
import React, { useState, useEffect } from "react";
import {
  Home,
  Wallet,
  AppWindow,
  BookOpen,
  Crown,
  ChevronDown,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { UserRole, SubscriptionTier } from "@/lib/layoutConfig";
import "../Layout/UserLayout.scss";

interface UserLayoutProps {
  children: React.ReactNode;
  user: any;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

interface MenuItem {
  icon: any;
  label: string;
  href?: string;
  category?: string;
  badge?: string;
  submenu?: { label: string; href: string }[];
}

export default function UserLayout({
  children,
  user,
  role,
  subscriptionTier,
}: UserLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  // Auto-expand wallet menu if on wallet pages
  const isWalletPage = pathname === "/deposit" || pathname === "/withdraw" || pathname === "/history";
  const [expandedMenus, setExpandedMenus] = useState<string[]>(isWalletPage ? ["wallet"] : []);
  
  // Update expanded menus when pathname changes
  React.useEffect(() => {
    if (isWalletPage && !expandedMenus.includes("wallet")) {
      setExpandedMenus([...expandedMenus, "wallet"]);
    }
  }, [pathname]);

  const userMenuItems: MenuItem[] = [
    { icon: Home, label: "Spin", href: "/spin" },
    {
      icon: Wallet,
      label: "Wallet",
      category: "wallet",
      submenu: [
        { label: "Deposit", href: "/deposit" },
        { label: "Withdraw", href: "/withdraw" },
        { label: "History", href: "/history" },
      ],
    },
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
  ];

  const toggleMenu = (category: string) => {
    setExpandedMenus((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const isActive = (href?: string, submenu?: { label: string; href: string }[]) => {
    if (href && pathname === href) return true;
    if (submenu) {
      return submenu.some((item) => pathname === item.href);
    }
    return false;
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
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = item.category && expandedMenus.includes(item.category);
            const active = isActive(item.href, item.submenu);

            return (
              <div key={idx} className="nav-item-wrapper">
                <button
                  className={`menu-item ${active ? "active" : ""}`}
                  onClick={() => {
                    if (hasSubmenu && item.category) {
                      toggleMenu(item.category);
                    } else if (item.href) {
                      router.push(item.href);
                    }
                  }}
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
                      {hasSubmenu && (
                        <ChevronDown
                          size={16}
                          className={`chevron ${isExpanded ? "expanded" : ""}`}
                          style={{ marginLeft: "auto" }}
                        />
                      )}
                    </div>
                  )}
                </button>

                {hasSubmenu && sidebarOpen && isExpanded && (
                  <div className="submenu">
                    {item.submenu?.map((subitem, subidx) => {
                      const isSubActive = pathname === subitem.href;
                      // Get icon for submenu item
                      let SubIcon = Wallet;
                      if (subitem.label === "Deposit") SubIcon = ArrowUpCircle;
                      if (subitem.label === "Withdraw") SubIcon = ArrowDownCircle;
                      if (subitem.label === "History") SubIcon = FileText;

                      return (
                        <button
                          key={subidx}
                          className={`submenu-item ${isSubActive ? "active" : ""}`}
                          onClick={() => router.push(subitem.href)}
                        >
                          <SubIcon size={16} />
                          <span>{subitem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

      </aside>

      {/* Content Wrapper */}
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
