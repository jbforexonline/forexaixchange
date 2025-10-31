"use client"

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function UserDashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname()

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <div className={`dashboard-root ${isDarkMode ? 'dark' : 'light'}`}>
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? '⟨' : '⟩'}
          </button>
          <span className="brand">ForexAIExchange</span>
        </div>

        <nav className="sidebar-nav">
          <Link href="/user-dashboard" className={`nav-link ${pathname === '/user-dashboard' ? 'active' : ''}`}>Dashboard</Link>
          <Link href="/user-dashboard/spin" className={`nav-link ${pathname === '/user-dashboard/spin' ? 'active' : ''}`}>Spin</Link>
          <Link href="/user-dashboard/deposit" className={`nav-link ${pathname === '/user-dashboard/deposit' ? 'active' : ''}`}>Deposit</Link>
          <Link href="/user-dashboard/settings" className={`nav-link ${pathname === '/user-dashboard/settings' ? 'active' : ''}`}>Settings</Link>
        </nav>
        
        <div className="need-help">
          <h4>NEED HELP?</h4>
          <p>Feel free to contact</p>
          <button>Get Support</button>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="header-title">User Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="theme-toggle" onClick={toggleDarkMode}>
              {isDarkMode ? '🌙' : '🌞'}
            </div>
            <div className="profile">
              <img alt="profile" src="/image/Ellipse 4.png" />
              <span>JOHN DOE</span>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  )
}