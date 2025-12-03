"use client";
import React, { useState } from "react";
import { Home, MessageSquare, Flag, Settings, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { UserRole, SubscriptionTier } from "@/lib/layoutConfig";
import "../Layout/ModeratorLayout.scss";

interface ModeratorLayoutProps {
  children: React.ReactNode;
  user: any;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

export default function ModeratorLayout({
  children,
  user,
  role,
  subscriptionTier,
}: ModeratorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const router = useRouter();

  const moderatorMenuItems = [
    {
      icon: Home,
      label: "Dashboard",
      href: "/dashboard",
      category: "main",
    },
    {
      icon: MessageSquare,
      label: "Community",
      href: "/community",
      category: "community",
      submenu: [
        { label: "Messages", href: "/community/messages" },
        { label: "Forums", href: "/community/forums" },
        { label: "Chat Rooms", href: "/community/chat" },
      ],
    },
    {
      icon: Flag,
      label: "Reports",
      href: "/reports",
      category: "reports",
      submenu: [
        { label: "Pending", href: "/reports/pending" },
        { label: "Resolved", href: "/reports/resolved" },
        { label: "Statistics", href: "/reports/stats" },
      ],
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      category: "settings",
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
    <div className="moderator-layout">
      {/* Header */}
      <header className="moderator-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            {sidebarOpen ? "⟨" : "⟩"}
          </button>
          <h1 className="system-title">Moderator Dashboard</h1>
        </div>

        <div className="header-right">
          <div className="user-info">
            <div className="user-badge">
              <span className="role-badge moderator">MODERATOR</span>
            </div>
            <div className="user-details">
              <p className="username">{user?.username || "Moderator"}</p>
              <p className="email">{user?.email}</p>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Logout">
            ⏻
          </button>
        </div>
      </header>

      <div className="moderator-container">
        {/* Sidebar */}
        <aside
          className={`moderator-sidebar ${sidebarOpen ? "open" : "closed"}`}
        >
          <nav className="moderator-nav">
            {moderatorMenuItems.map((item, idx) => {
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
        <main className="moderator-content">{children}</main>
      </div>

      {/* Footer */}
      <footer className="moderator-footer">
        <p>&copy; 2024 ForexAI Exchange. Moderator Dashboard.</p>
      </footer>
    </div>
  );
}
