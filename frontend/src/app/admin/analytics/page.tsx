"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface AnalyticsData {
  totalUsers: number;
  totalSpins: number;
  totalBets: number;
  totalWinnings: number;
  totalDeposits: number;
  totalWithdrawals: number;
  platformRevenue: number;
  dailyActiveUsers: number;
  conversionRate: number;
  averageSessionDuration: number;
}

interface ChartData {
  date: string;
  value: number;
}

export default function AnalyticsPage() {
  const { user, role } = useLayoutState();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalSpins: 0,
    totalBets: 0,
    totalWinnings: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    platformRevenue: 0,
    dailyActiveUsers: 0,
    conversionRate: 0,
    averageSessionDuration: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7days");

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
      return;
    }

    fetchAnalytics();
  }, [role, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || analytics);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ marginTop: 0, color: "#fff" }}>Analytics</h1>
          <p style={{ color: "#d1d5db", margin: "0.5rem 0 0 0" }}>
            Platform performance and user engagement metrics
          </p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            color: "#fff",
          }}
        >
          <option value="24hours">Last 24 Hours</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading analytics...</p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                Total Users
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                {analytics.totalUsers.toLocaleString()}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#93c5fd", fontSize: "0.9rem" }}>
                Daily Active Users
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                {analytics.dailyActiveUsers.toLocaleString()}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#86efac", fontSize: "0.9rem" }}>
                Total Spins
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                {analytics.totalSpins.toLocaleString()}
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
                Platform Revenue
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                ${analytics.platformRevenue.toLocaleString()}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(251, 146, 60, 0.1)",
                border: "1px solid rgba(251, 146, 60, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#fdba74", fontSize: "0.9rem" }}>
                Total Deposits
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                ${analytics.totalDeposits.toLocaleString()}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#fca5a5", fontSize: "0.9rem" }}>
                Total Withdrawals
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                ${analytics.totalWithdrawals.toLocaleString()}
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(14, 165, 233, 0.1)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#7dd3fc", fontSize: "0.9rem" }}>
                Conversion Rate
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                {analytics.conversionRate.toFixed(2)}%
              </p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(102, 51, 153, 0.1)",
                border: "1px solid rgba(102, 51, 153, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#e9d5ff", fontSize: "0.9rem" }}>
                Avg Session Duration
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "2rem" }}>
                {analytics.averageSessionDuration.toFixed(1)}m
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
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
              <h3 style={{ marginTop: 0, color: "#93c5fd" }}>
                Betting Overview
              </h3>
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: "#d1d5db" }}>Total Bets</span>
                  <span style={{ color: "#fff", fontWeight: "600" }}>
                    {analytics.totalBets.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: "#d1d5db" }}>Total Winnings</span>
                  <span style={{ color: "#86efac", fontWeight: "600" }}>
                    ${analytics.totalWinnings.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: "#d1d5db" }}>House Edge</span>
                  <span style={{ color: "#fca5a5", fontWeight: "600" }}>
                    {(100 - (analytics.totalWinnings / (analytics.totalBets || 1) * 100)).toFixed(2)}%
                  </span>
                </div>
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
              <h3 style={{ marginTop: 0, color: "#93c5fd" }}>
                Financial Summary
              </h3>
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: "#d1d5db" }}>Total In</span>
                  <span style={{ color: "#86efac", fontWeight: "600" }}>
                    ${analytics.totalDeposits.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: "#d1d5db" }}>Total Out</span>
                  <span style={{ color: "#fca5a5", fontWeight: "600" }}>
                    ${analytics.totalWithdrawals.toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.75rem",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ color: "#d1d5db" }}>Net</span>
                  <span
                    style={{
                      fontWeight: "600",
                      color: analytics.totalDeposits - analytics.totalWithdrawals >= 0
                        ? "#86efac"
                        : "#fca5a5",
                    }}
                  >
                    ${(analytics.totalDeposits - analytics.totalWithdrawals).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
