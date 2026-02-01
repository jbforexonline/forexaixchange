"use client";
import React from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";

export default function ActiveUsersPage() {
  const { role } = useLayoutState();

  if (!isAdminRole(role)) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginTop: 0, color: "#fff" }}>Active Users</h1>
      <p style={{ color: "#d1d5db" }}>
        Filtered view showing active users. Implement list or reuse main user management view.
      </p>
    </div>
  );
}
