"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

// Logs accessible by SUPER_ADMIN and AUDIT_ADMIN
const LOGS_ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.AUDIT_ADMIN];

interface Log {
  id: string;
  level: "error" | "warn" | "info" | "debug";
  message: string;
  timestamp: string;
  source: string;
  details?: string;
}

export default function LogsPage() {
  const { user, role } = useLayoutState();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!LOGS_ALLOWED_ROLES.includes(role)) {
      return;
    }

    fetchLogs();
  }, [role, filterLevel]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/logs?level=${filterLevel}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelColor = (
    level: "error" | "warn" | "info" | "debug"
  ): string => {
    switch (level) {
      case "error":
        return "#ef4444";
      case "warn":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      case "debug":
        return "#8b5cf6";
      default:
        return "#d1d5db";
    }
  };

  const getLevelBgColor = (
    level: "error" | "warn" | "info" | "debug"
  ): string => {
    switch (level) {
      case "error":
        return "rgba(239, 68, 68, 0.1)";
      case "warn":
        return "rgba(245, 158, 11, 0.1)";
      case "info":
        return "rgba(59, 130, 246, 0.1)";
      case "debug":
        return "rgba(139, 92, 246, 0.1)";
      default:
        return "rgba(255, 255, 255, 0.05)";
    }
  };

  if (!LOGS_ALLOWED_ROLES.includes(role)) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins and Audit Admins can access system logs.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>System Logs</h1>
        <p style={{ color: "#d1d5db" }}>
          Monitor system events, errors, and debug information
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
              Search:
            </label>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                marginTop: "0.5rem",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Log Level:
            </label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
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
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Refresh
            </label>
            <button
              onClick={fetchLogs}
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
              Refresh Logs
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading logs...</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
          }}
        >
          {filteredLogs.length === 0 ? (
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
              <p>No logs found matching your filters.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  backgroundColor: getLevelBgColor(log.level),
                  border: `1px solid rgba(255, 255, 255, 0.1)`,
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "1rem",
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: getLevelColor(log.level),
                      }}
                    />
                    <span
                      style={{
                        color: getLevelColor(log.level),
                        fontSize: "0.85rem",
                        fontWeight: "600",
                      }}
                    >
                      {log.level.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <p style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>
                      {log.message}
                    </p>
                    {log.details && (
                      <p
                        style={{
                          margin: "0.25rem 0 0 0",
                          color: "#9ca3af",
                          fontSize: "0.8rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {log.details}
                      </p>
                    )}
                    <div
                      style={{
                        marginTop: "0.5rem",
                        display: "flex",
                        gap: "1rem",
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                      }}
                    >
                      <span>Source: {log.source}</span>
                      <span>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
