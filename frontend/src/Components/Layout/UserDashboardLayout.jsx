"use client";
import React, { useState, useEffect } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Home, Wallet, User, AppWindow, BookOpen, HelpCircle, Sword, Settings, ArrowLeft, RotateCw, DollarSign, Crown, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isPremiumUser } from "@/lib/api/spin";

export default function UserDashboardLayout({ children }) {
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setIsPremium(isPremiumUser());
  }, []);

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: User, label: "Users", href: "/users" },
    { icon: RotateCw, label: "Spin", href: "/dashboard/spin" },
    { icon: DollarSign, label: "Withdraw", href: "/dashboard/withdraw" },
    { icon: Crown, label: "Premium", href: "/dashboard/premium" },
    { icon: Gift, label: "Referrals", href: "/dashboard/referrals" },
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

          {open && user && (
            <div className="eo-footer">
              <div className="user-info">
                <div className="user-avatar">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-details">
                  <div className="user-name">{user.username}</div>
                  {isPremium && <div className="premium-badge">👑 Premium</div>}
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      </MotionConfig>

      <main className="eo-main">
        {user && (
          <div className="dashboard-header">
            <div className="header-left">
              <h2>Welcome back, {user.username}!</h2>
            </div>
            <div className="header-right">
              {isPremium && (
                <div className="premium-status">
                  <Crown size={18} />
                  <span>Premium Member</span>
                </div>
              )}
              <div className="user-menu">
                <div className="user-avatar-header">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
