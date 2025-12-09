"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface SystemStatus {
  apiStatus: "online" | "offline" | "degraded";
  databaseStatus: "online" | "offline" | "degraded";
  cacheStatus: "online" | "offline" | "degraded";
  websocketStatus: "online" | "offline" | "degraded";
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
}

export default function MonitoringPage() {
  const { user, role } = useLayoutState();
  const [status, setStatus] = useState<SystemStatus>({
    apiStatus: "online",
    databaseStatus: "online",
    cacheStatus: "online",
    websocketStatus: "online",
    cpuUsage: 45,
    memoryUsage: 62,
    diskUsage: 38,
    responseTime: 145,
    errorRate: 0.02,
    uptime: 99.95,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN) {
      return;
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/monitoring/status", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status || status);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (
    status: "online" | "offline" | "degraded"
  ): string => {
    switch (status) {
      case "online":
        return "#34d399";
      case "degraded":
        return "#fbbf24";
      case "offline":
        return "#f87171";
      default:
        return "#d1d5db";
    }
  };

  const getStatusLabel = (
    status: "online" | "offline" | "degraded"
  ): string => {
    switch (status) {
      case "online":
        return "✓ Online";
      case "degraded":
        return "⚠ Degraded";
      case "offline":
        return "✗ Offline";
      default:
        return "Unknown";
    }
  };

  if (role !== UserRole.SUPER_ADMIN) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins can access monitoring.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ marginTop: 0, color: "#fff" }}>System Monitoring</h1>
          <p style={{ color: "#d1d5db", margin: "0.5rem 0 0 0" }}>
            Real-time system health and performance metrics
          </p>
        </div>

        <button
          onClick={fetchStatus}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0ea5e9",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading system status...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                API Status
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: getStatusColor(status.apiStatus),
                  fontSize: "1.3rem",
                  fontWeight: "600",
                }}
              >
                {getStatusLabel(status.apiStatus)}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Database Status
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: getStatusColor(status.databaseStatus),
                  fontSize: "1.3rem",
                  fontWeight: "600",
                }}
              >
                {getStatusLabel(status.databaseStatus)}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Cache Status
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: getStatusColor(status.cacheStatus),
                  fontSize: "1.3rem",
                  fontWeight: "600",
                }}
              >
                {getStatusLabel(status.cacheStatus)}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                WebSocket Status
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: getStatusColor(status.websocketStatus),
                  fontSize: "1.3rem",
                  fontWeight: "600",
                }}
              >
                {getStatusLabel(status.websocketStatus)}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                CPU Usage
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.5rem" }}>
                {status.cpuUsage}%
              </p>
              <div
                style={{
                  marginTop: "0.75rem",
                  height: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${status.cpuUsage}%`,
                    backgroundColor: status.cpuUsage > 80 ? "#f87171" : "#34d399",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Memory Usage
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.5rem" }}>
                {status.memoryUsage}%
              </p>
              <div
                style={{
                  marginTop: "0.75rem",
                  height: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${status.memoryUsage}%`,
                    backgroundColor: status.memoryUsage > 80 ? "#f87171" : "#34d399",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Disk Usage
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.5rem" }}>
                {status.diskUsage}%
              </p>
              <div
                style={{
                  marginTop: "0.75rem",
                  height: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${status.diskUsage}%`,
                    backgroundColor: status.diskUsage > 80 ? "#f87171" : "#34d399",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Response Time
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.5rem" }}>
                {status.responseTime}ms
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#d1d5db", fontSize: "0.8rem" }}>
                {status.responseTime < 200
                  ? "Excellent"
                  : status.responseTime < 500
                  ? "Good"
                  : "Slow"}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Error Rate
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.5rem" }}>
                {(status.errorRate * 100).toFixed(3)}%
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#d1d5db", fontSize: "0.8rem" }}>
                {status.errorRate < 0.1 ? "Normal" : "Elevated"}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Uptime
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.5rem" }}>
                {status.uptime.toFixed(2)}%
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#86efac", fontSize: "0.8rem" }}>
                Excellent
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
