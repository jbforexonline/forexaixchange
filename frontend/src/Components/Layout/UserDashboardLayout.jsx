"use client";
import React from "react";
import "./UserDashboardLayout.scss";

export default function UserDashboardLayout({ children }) {
  return (
    <div className="dashboard-root no-sidebar">
      <main className="eo-main">
        {children}
      </main>
    </div>
  );
}
