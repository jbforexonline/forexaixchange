"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface Activity {
  id: string;
  type:
    | "user_login"
    | "user_logout"
    | "spin_placed"
    | "withdrawal_requested"
    | "deposit_completed"
    | "role_changed"
    | "ban_issued";
  userId: string;
  username: string;
  description: string;
  timestamp: string;
  details?: Record<string, any>;
}

export default function ActivityPage() {
  const { user, role } = useLayoutState();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [timeRange, setTimeRange] = useState("24hours");

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN) {
      return;
    }

    fetchActivity();
  }, [role, filterType, timeRange]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/activity?type=${filterType}&range=${timeRange}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (
    type: Activity["type"]
  ): { bg: string; text: string; icon: string } => {
    switch (type) {
      case "user_login":
        return { bg: "rgba(34, 197, 94, 0.1)", text: "#86efac", icon: "→" };
      case "user_logout":
        return { bg: "rgba(107, 114, 128, 0.1)", text: "#d1d5db", icon: "←" };
      case "spin_placed":
        return { bg: "rgba(251, 146, 60, 0.1)", text: "#fdba74", icon: "🎯" };
      case "withdrawal_requested":
        return { bg: "rgba(239, 68, 68, 0.1)", text: "#fca5a5", icon: "↓" };
      case "deposit_completed":
        return { bg: "rgba(34, 197, 94, 0.1)", text: "#86efac", icon: "↑" };
      case "role_changed":
        return { bg: "rgba(168, 85, 247, 0.1)", text: "#d8b4fe", icon: "⚙" };
      case "ban_issued":
        return { bg: "rgba(239, 68, 68, 0.1)", text: "#fca5a5", icon: "🚫" };
      default:
        return { bg: "rgba(255, 255, 255, 0.05)", text: "#d1d5db", icon: "•" };
    }
  };

  if (role !== UserRole.SUPER_ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins can access activity logs.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>Activity Logs</h1>
        <p style={{ color: "#d1d5db" }}>
          Monitor all user and system activities on the platform
        </p>
      </div>

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
          Filters
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1rem",
          }}
        >
          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Activity Type:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
              }}
            >
              <option value="all">All Activities</option>
              <option value="user_login">User Login</option>
              <option value="user_logout">User Logout</option>
              <option value="spin_placed">Spin Placed</option>
              <option value="withdrawal_requested">Withdrawal Requested</option>
              <option value="deposit_completed">Deposit Completed</option>
              <option value="role_changed">Role Changed</option>
              <option value="ban_issued">Ban Issued</option>
            </select>
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Time Range:
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
              }}
            >
              <option value="1hour">Last Hour</option>
              <option value="24hours">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Refresh
            </label>
            <button
              onClick={fetchActivity}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.5rem",
                backgroundColor: "#0ea5e9",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Refresh Activity
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading activity...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {activities.length === 0 ? (
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "2rem",
                textAlign: "center",
                color: "#d1d5db",
              }}
            >
              <p>No activity found for the selected time range.</p>
            </div>
          ) : (
            activities.map((activity, idx) => {
              const colors = getActivityColor(activity.type);
              return (
                <div
                  key={activity.id}
                  style={{
                    backgroundColor: colors.bg,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "1rem",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "1rem",
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "40px",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                    }}
                  >
                    {colors.icon}
                  </div>

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          color: colors.text,
                          fontWeight: "600",
                          fontSize: "0.9rem",
                        }}
                      >
                        {activity.type
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </span>
                      {activity.username && (
                        <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                          • {activity.username}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        color: "#d1d5db",
                        fontSize: "0.9rem",
                      }}
                    >
                      {activity.description}
                    </p>
                    {activity.details && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.5rem",
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                          fontFamily: "monospace",
                        }}
                      >
                        {JSON.stringify(activity.details, null, 2)}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div>
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
