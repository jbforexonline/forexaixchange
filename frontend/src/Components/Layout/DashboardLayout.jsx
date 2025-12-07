"use client";
import React, { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Home, Wallet, User, AppWindow, BookOpen, HelpCircle, Sword, Settings, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "../../lib/auth";
import "../Layout/DashboardLayout.scss";

export default function Sidebar({ children }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const menuItems = [
    { icon: Home, label: "Spin", href: "/spin" },
    { icon: Wallet, label: "Withdraw", href: "/withdraw" },
    // { icon: User, label: "Profile", href: "/user-dashboard" },
    { icon: AppWindow, label: "Premium", href: "/deposit" },
    { icon: BookOpen, label: "Affiliate", href: "/Affiliate" },
    // { icon: HelpCircle, label: "Dashboard", href: "/dashboard" },
    { icon: Sword, label: "Settings", href: "/settings" },
    { icon: Settings, label: "Logout", href: null, isLogout: true },
  ];

  const handleMenuClick = (item) => {
    if (item.isLogout) {
      logout();
    } else {
      router.push(item.href);
    }
  };

  const goBackToLogin = () => logout();

  return (
    <div className="eo-container">
      <MotionConfig reducedMotion="user">
        <motion.aside
          animate={{ width: open ? 92 : 64 }}
          transition={{ duration: 0.18 }}
          className={`eo-sidebar ${open ? "open" : "closed"}`}
        >
          <div className="sidebar-top">
            <button className="back-to-login" onClick={goBackToLogin} title="Back to login">
              <ArrowLeft size={16} />
            </button>

            <button
              onClick={() => setOpen(!open)}
              className="eo-toggle-btn"
              aria-label="Toggle sidebar"
            >
              {open ? "⟨" : "⟩"}
            </button>
          </div>

          <nav className="eo-menu">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  className="eo-menu-item"
                  onClick={() => handleMenuClick(item)}
                  title={item.label}
                >
                  <Icon size={20} />
                  {open && <span className="eo-label">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* <div className="eo-footer">
            <div className="status-dot" />
            {open && <div className="status-text">Online</div>}
          </div> */}
        </motion.aside>
      </MotionConfig>

      <main className="eo-main">{children}</main>
    </div>
  );
}
