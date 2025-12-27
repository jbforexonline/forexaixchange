"use client";
import React, { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Home, Wallet, User, AppWindow, BookOpen, HelpCircle, Sword, Settings, ArrowLeft, RotateCw, DollarSign, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UserDashboardLayout({ children }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/user-dashboard" },
    { icon: RotateCw, label: "Spin", href: "/user-dashboard/spin" },
    { icon: DollarSign, label: "Deposit", href: "/user-dashboard/deposit" },
    { icon: Wallet, label: "Withdraw", href: "/withdraw" },
    { icon: FileText, label: "History", href: "/user-dashboard/history" },
    { icon: Settings, label: "Logout", href: "/login" },
  ];

  const goBackToLogin = () => router.push("/login");

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
                  onClick={() => router.push(item.href)}
                  title={item.label}
                >
                  <Icon size={20} color="currentColor" />
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
