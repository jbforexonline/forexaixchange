"use client"

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'
import { useUserData } from '@/hooks/useUserData'
import { useDemo } from '@/context/DemoContext'
import './UserDashboardLayout.scss'

export default function UserDashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isDemo, toggleDemo } = useDemo()
  const { user, wallet, subscription, loading, refresh, error } = useUserData() // Move useUserData up to destructure refresh

  const handleReset = async (amount) => {
    if (confirm(`Reset demo balance to ${amount}?`)) {
      try {
        await import('@/lib/api/wallet').then(m => m.resetDemoBalance(amount));
        refresh();
        alert('Balance reset!');
      } catch (e) {
        alert('Failed to reset: ' + e.message);
      }
    }
  }

  // Redirect to login if not authenticated (only after initial load completes)
  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      router.replace('/login')
    }
  }, [loading, user, router])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Memoized balance formatting to avoid unnecessary recalculations
  const formattedBalance = useMemo(() => {
    if (!wallet?.available) return '0.00'
    return typeof wallet.available === 'number' ? wallet.available.toFixed(2) : '0.00'
  }, [wallet?.available])

  // Memoized user display info
  const userDisplayInfo = useMemo(() => ({
    avatar: user?.username?.charAt(0)?.toUpperCase() || 'U',
    name: user?.username || 'User',
    isPremium: !!subscription?.plan,
    planName: subscription?.plan?.name || 'Free',
  }), [user?.username, subscription?.plan])

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
              className="theme-toggle"
              onClick={toggleDarkMode}
              style={{
                padding: '0.5rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
              aria-label="Toggle theme"
            >
              {isDarkMode ? '🌙' : '🌞'}
            </button>
            <div className="profile" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div className="profile-avatar" style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #007bff, #0056b3)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}>
                {userDisplayInfo.avatar}
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                {userDisplayInfo.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                color: '#dc2626'
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  )
}
