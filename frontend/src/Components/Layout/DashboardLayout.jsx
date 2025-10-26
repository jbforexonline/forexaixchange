"use client"

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }) {
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
          <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
          <Link href="/spin" className={`nav-link ${pathname === '/spin' ? 'active' : ''}`}>Spin</Link>
          <Link href="/withdraw" className={`nav-link ${pathname === '/withdraw' ? 'active' : ''}`}>Withdraw</Link>
          {/* <Link href="/deposit" className={`nav-link ${pathname === '/deposit' ? 'active' : ''}`}>Deposit</Link> */}
          <Link href="/users" className={`nav-link ${pathname === '/users' ? 'active' : ''}`}>Users</Link>
          <hr />
          <Link href="/settings" className={`nav-link ${pathname === '/settings' ? 'active' : ''}`}>Settings</Link>
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
            <h1 className="header-title">Analytics</h1>
          </div>
          <div className="header-right">
            <div className="theme-toggle" onClick={toggleDarkMode}>
              {isDarkMode ? '🌙' : '🌞'}
            </div>
            <div className="profile">
              <img alt="profile" src="/image/Ellipse 4.png" />
              <span>VIKKIE JOSHUA</span>
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