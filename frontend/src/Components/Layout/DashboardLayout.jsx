"use client"

import Link from 'next/link'
import { useState } from 'react'

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="dashboard-root">
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? '⟨' : '⟩'}
          </button>
          <span className="brand">ForexAI</span>
        </div>

        <nav className="sidebar-nav">
          <Link href="/dashboard" className="nav-link">Overview</Link>
          <Link href="/login" className="nav-link">Login</Link>
          <Link href="/register" className="nav-link">Register</Link>
        </nav>
      </aside>

      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="header-title">Dashboard</h1>
          </div>
          <div className="header-right">
            <input className="search" placeholder="Search markets, pairs..." />
            <div className="user-avatar">R</div>
          </div>
        </header>

        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  )
}