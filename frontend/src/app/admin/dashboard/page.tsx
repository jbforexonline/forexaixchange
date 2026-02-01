"use client";
import React from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";

export default function AdminDashboard() {
  const { user, role, layoutConfig } = useLayoutState();

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
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ marginTop: 0, color: "#fff" }}>Admin Dashboard</h1>
        <p style={{ color: "#d1d5db", fontSize: "0.95rem" }}>
          Welcome, <strong>{user?.username}</strong>!
        </p>
      </div>

      {/* User Info Card */}
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#93c5fd" }}>
          Your Profile
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              User ID
            </p>
            <p style={{ margin: 0, color: "#fff", fontFamily: "monospace" }}>
              {user?.id}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              Email
            </p>
            <p style={{ margin: 0, color: "#fff" }}>{user?.email}</p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              Role
            </p>
            <p
              style={{
                margin: 0,
                color: "#fff",
                backgroundColor:
                  role === UserRole.SUPER_ADMIN ? "#dc2626" :
                  role === UserRole.FINANCE_ADMIN ? "#059669" :
                  role === UserRole.SYSTEM_ADMIN ? "#7c3aed" :
                  role === UserRole.AUDIT_ADMIN ? "#d97706" : "#2563eb",
                padding: "0.25rem 0.75rem",
                borderRadius: "6px",
                display: "inline-block",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}
            >
              {role}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              Username
            </p>
            <p style={{ margin: 0, color: "#fff" }}>{user?.username}</p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              Premium Status
            </p>
            <p
              style={{
                margin: 0,
                color: user?.premium ? "#10b981" : "#ef4444",
              }}
            >
              {user?.premium ? "✓ Premium" : "Free"}
            </p>
          </div>
          <div>
            <p
              style={{
                margin: "0 0 0.5rem 0",
                color: "#9ca3af",
                fontSize: "0.9rem",
              }}
            >
              Verified
            </p>
            <p
              style={{
                margin: 0,
                color: user?.isVerified ? "#10b981" : "#ef4444",
              }}
            >
              {user?.isVerified ? "✓ Verified" : "Pending"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#fca5a5", fontSize: "0.9rem" }}>
            Super Admin Access
          </p>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#fff",
              fontSize: "1.8rem",
            }}
          >
            {role === UserRole.SUPER_ADMIN ? "✓" : "—"}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#93c5fd", fontSize: "0.9rem" }}>
            Admin Access
          </p>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#fff",
              fontSize: "1.8rem",
            }}
          >
            {isAdminRole(role) ? "✓" : "—"}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(168, 85, 247, 0.1)",
            border: "1px solid rgba(168, 85, 247, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#d8b4fe", fontSize: "0.9rem" }}>
            Menu Items
          </p>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#fff",
              fontSize: "1.8rem",
            }}
          >
            {layoutConfig?.menuItems?.length || 0}
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div
        style={{
          marginTop: "2rem",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.2rem", color: "#93c5fd" }}>
          Available Sections
        </h2>
        <p
          style={{
            color: "#d1d5db",
            marginBottom: "1rem",
            fontSize: "0.95rem",
          }}
        >
          Use the sidebar to navigate to different admin sections:
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {layoutConfig?.menuItems?.slice(0, 8).map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                padding: "0.75rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
                color: "#93c5fd",
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div
        style={{
          marginTop: "2rem",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          border: "1px solid rgba(37, 99, 235, 0.3)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#93c5fd" }}>
          ℹ️ Role-Based Layout System Active
        </h3>
        <p style={{ color: "#d1d5db", margin: "0.5rem 0 0 0" }}>
          This dashboard is powered by the role-based layout system. Your
          sidebar is automatically generated based on your role ({role}).
          Different roles see different menus and access different features.
        </p>
      </div>
    </div>
  );
}
