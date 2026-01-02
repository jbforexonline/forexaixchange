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
    <div className={`dashboard-root ${isDarkMode ? 'dark' : 'light'}`}>
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? '⟨' : '⟩'}
          </button>
          {isSidebarOpen && <span className="brand">ForexAIExchange</span>}
        </div>

        {isSidebarOpen && (
          <div className="sidebar-user-info">
            {loading && !user ? (
              <div className="user-card">
                <div className="user-avatar">...</div>
                <div className="user-details">
                  <p className="user-name">Loading...</p>
                </div>
              </div>
            ) : user ? (
              <>
                <div className="user-card">
                  <div className="user-avatar">
                    {userDisplayInfo.avatar}
                  </div>
                  <div className="user-details">
                    <p className="user-name">{userDisplayInfo.name}</p>
                    {userDisplayInfo.isPremium ? (
                      <span className="user-badge premium">
                        👑 {userDisplayInfo.planName}
                      </span>
                    ) : (
                      <span className="user-badge standard">
                        Free
                      </span>
                    )}
                  </div>
                </div>

                <div className="wallet-summary">
                  <div className="summary-item">
                    <span className="label">Balance</span>
                    <span className="value">${formattedBalance}</span>
                  </div>
                  <button
                    className="refresh-btn"
                    onClick={refresh}
                    title="Refresh balance"
                    aria-label="Refresh balance"
                  >
                    🔄
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section">
            {isSidebarOpen && <span className="nav-section-title">Main</span>}
            <Link href="/user-dashboard" className={`nav-link ${pathname === '/user-dashboard' ? 'active' : ''}`}>📊 Dashboard</Link>
            <Link href="/user-dashboard/spin" className={`nav-link ${pathname === '/user-dashboard/spin' ? 'active' : ''}`}>🎡 Spin</Link>
          </div>

          <div className="nav-section">
            {isSidebarOpen && <span className="nav-section-title">Wallet & Finance</span>}
            <Link href="/user-dashboard/wallet" className={`nav-link ${pathname === '/user-dashboard/wallet' ? 'active' : ''}`}>💰 Wallet</Link>
            <Link href="/user-dashboard/deposit" className={`nav-link ${pathname === '/user-dashboard/deposit' ? 'active' : ''}`}>📥 Deposit</Link>
            <Link href="/user-dashboard/withdraw" className={`nav-link ${pathname === '/user-dashboard/withdraw' ? 'active' : ''}`}>📤 Withdraw</Link>
            <Link href="/user-dashboard/transfer" className={`nav-link ${pathname === '/user-dashboard/transfer' ? 'active' : ''}`}>↔️ Internal Transfer</Link>
          </div>

          <div className="nav-section">
            {isSidebarOpen && <span className="nav-section-title">Affiliate & Community</span>}
            <Link href="/user-dashboard/affiliate" className={`nav-link ${pathname === '/user-dashboard/affiliate' ? 'active' : ''}`}>🤝 Affiliate</Link>
            <Link href="/user-dashboard/community" className={`nav-link ${pathname === '/user-dashboard/community' ? 'active' : ''}`}>💬 Community</Link>
          </div>

          <div className="nav-section">
            {isSidebarOpen && <span className="nav-section-title">Account & Premium</span>}
            <Link href="/user-dashboard/premium" className={`nav-link ${pathname === '/user-dashboard/premium' ? 'active' : ''}`}>👑 Premium</Link>
            <Link href="/user-dashboard/history" className={`nav-link ${pathname === '/user-dashboard/history' ? 'active' : ''}`}>📋 History & Analytics</Link>
            <Link href="/user-dashboard/settings" className={`nav-link ${pathname === '/user-dashboard/settings' ? 'active' : ''}`}>⚙️ Settings</Link>
          </div>
        </nav>

        <div className="need-help">
          <h4>NEED HELP?</h4>
          <p>Feel free to contact</p>
          <button>Get Support</button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                display: 'block',
                padding: '0.5rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
              className="mobile-menu-toggle"
              aria-label="Toggle menu"
            >
              ☰
            </button>
            {/* Overlay for mobile when sidebar is open */}
            {isSidebarOpen && (
              <div
                onClick={() => setIsSidebarOpen(false)}
                className="sidebar-overlay"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 99,
                }}
              />
            )}
            <h1 className="header-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              User Dashboard
            </h1>
          </div>
          <div className="header-right" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
              {userDisplayInfo.isPremium ? (
                <button
                  onClick={toggleDemo}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    border: 'none',
                    background: isDemo ? '#f59e0b' : '#10b981',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {isDemo ? '🚧 DEMO MODE' : '✅ LIVE MODE'}
                </button>
              ) : (
                <Link href="/user-dashboard/premium">
                  <button
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '20px',
                      border: 'none',
                      background: '#6b7280',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    🔒 UNLOCK LIVE
                  </button>
                </Link>
              )}
            {isDemo && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleReset(10000)} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>↺ 10k</button>
                <button onClick={() => handleReset(20000)} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>↺ 20k</button>
              </div>
            )}
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
