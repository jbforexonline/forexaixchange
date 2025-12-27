"use client";
import React, { useState, useEffect } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Home, Wallet, User, AppWindow, BookOpen, HelpCircle, Sword, Settings, ArrowLeft, FileText, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

import { logout, getCurrentUser } from "@/lib/auth";

import "../Layout/DashboardLayout.scss";

export default function Sidebar({ children }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    // Redirect to login if not authenticated
    if (!currentUser && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [router]);

  const menuItems = [
    { icon: Home, label: "Spin", href: "/spin" },
    { icon: DollarSign, label: "Deposit", href: "/deposit" },
    { icon: Wallet, label: "Withdraw", href: "/withdraw" },
    { icon: FileText, label: "History", href: "/history" },
    { icon: AppWindow, label: "Premium", href: "/deposit" },
    { icon: BookOpen, label: "Affiliate", href: "/Affiliate" },
    // { icon: HelpCircle, label: "Dashboard", href: "/dashboard" },
    { icon: Sword, label: "Settings", href: "/settings" },

  ];

  const handleLogout = () => {
    logout();
    // Ensure client-side navigation to login so RoleBasedLayout and ProtectedRoute update cleanly
    router.replace('/login');
  };

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
                  onClick={() => handleMenuClick(item)}
                  title={item.label}
                >
                  <Icon size={20} />
                  {open && <span className="eo-label">{item.label}</span>}
                </button>
              );
            })}
            <button
              className="eo-menu-item"
              onClick={handleLogout}
              title="Logout"
              style={{ marginTop: 'auto', color: '#dc2626' }}
            >
              <Settings size={20} />
              {open && <span className="eo-label">Logout</span>}
            </button>
          </nav>

          {/* <div className="eo-footer">
            <div className="status-dot" />
            {open && <div className="status-text">Online</div>}
          </div> */}
        </motion.aside>
      </MotionConfig>

      <div className={`eo-content-wrapper ${open ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="eo-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: '#11253d',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 className="header-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#fff' }}>
              ForexAI Exchange
            </h1>
          </div>
          <div className="header-right" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div className="profile" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px'
            }}>
              <img
                alt="profile"
                src="/image/Ellipse 4.png"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#fff' }}>
                  {user?.username || user?.email || 'User'}
                </span>
                {user?.premium && (
                  <span style={{ fontSize: '0.75rem', color: '#ffd700' }}>⭐ Premium</span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                background: 'rgba(220, 38, 38, 0.2)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#ff6b6b'
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="eo-main">{children}</main>
      </div>
    </div>
  );
}
