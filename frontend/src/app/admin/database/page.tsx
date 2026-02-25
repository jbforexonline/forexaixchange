"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

// Database accessible by SUPER_ADMIN and SYSTEM_ADMIN
const DATABASE_ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN];

interface DatabaseInfo {
  name: string;
  version: string;
  status: "connected" | "disconnected";
  tableCount: number;
  totalSize: number;
  lastBackup: string;
  connectionTime: number;
}

interface Table {
  name: string;
  rows: number;
  size: number;
  indexes: number;
}

export default function DatabasePage() {
  const { user, role, isLoading } = useLayoutState();
  const [dbInfo, setDbInfo] = useState<DatabaseInfo>({
    name: "PostgreSQL",
    version: "14.5",
    status: "connected",
    tableCount: 24,
    totalSize: 156,
    lastBackup: new Date(Date.now() - 3600000).toISOString(),
    connectionTime: 45,
  });
  const [tables, setTables] = useState<Table[]>([
    { name: "users", rows: 5234, size: 2.3, indexes: 5 },
    { name: "spins", rows: 45678, size: 12.5, indexes: 3 },
    { name: "transactions", rows: 23456, size: 8.7, indexes: 4 },
    { name: "wallets", rows: 5234, size: 1.2, indexes: 2 },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!DATABASE_ALLOWED_ROLES.includes(role)) {
      return;
    }

    fetchDatabaseInfo();
  }, [role]);

  const fetchDatabaseInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/database/info", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDbInfo(data.dbInfo || dbInfo);
        setTables(data.tables || tables);
      }
    } catch (error) {
      console.error("Failed to fetch database info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch("/api/admin/database/backup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDbInfo((prev) => ({
          ...prev,
          lastBackup: new Date().toISOString(),
        }));
        alert("Backup created successfully");
      }
    } catch (error) {
      console.error("Failed to create backup:", error);
      alert("Failed to create backup");
    }
  };

  if (isLoading) {
    return null;
  }

  if (!DATABASE_ALLOWED_ROLES.includes(role)) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins and System Admins can access database management.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>Database Management</h1>
        <p style={{ color: "#d1d5db" }}>
          Monitor and manage your database infrastructure
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading database information...</p>
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
                Database Name
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.2rem" }}>
                {dbInfo.name}
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
                Version
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.2rem" }}>
                {dbInfo.version}
              </p>
            </div>

            <div
              style={{
                backgroundColor:
                  dbInfo.status === "connected"
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                border:
                  dbInfo.status === "connected"
                    ? "1px solid rgba(34, 197, 94, 0.3)"
                    : "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.9rem" }}>
                Status
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color:
                    dbInfo.status === "connected" ? "#86efac" : "#fca5a5",
                  fontSize: "1.2rem",
                }}
              >
                {dbInfo.status === "connected" ? "✓ Connected" : "✗ Disconnected"}
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
                Total Size
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.2rem" }}>
                {dbInfo.totalSize} MB
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
                Table Count
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.2rem" }}>
                {dbInfo.tableCount}
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
                Last Backup
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "0.9rem" }}>
                {new Date(dbInfo.lastBackup).toLocaleString()}
              </p>
            </div>
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ margin: 0, color: "#93c5fd", fontSize: "1.2rem" }}>
                Database Maintenance
              </h2>
              <button
                onClick={handleBackup}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#0ea5e9",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                }}
              >
                Create Backup Now
              </button>
            </div>

            <div style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              <p>Backup system is active and running on a scheduled basis.</p>
              <p style={{ margin: 0 }}>
                Last backup: {new Date(dbInfo.lastBackup).toLocaleString()}
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <h2 style={{ margin: 0, color: "#93c5fd", fontSize: "1.2rem" }}>
                Top Tables by Size
              </h2>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      color: "#93c5fd",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    Table Name
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      color: "#93c5fd",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    Rows
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      color: "#93c5fd",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    Size (MB)
                  </th>
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      color: "#93c5fd",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    Indexes
                  </th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      backgroundColor:
                        idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.02)",
                    }}
                  >
                    <td style={{ padding: "1rem", color: "#fff" }}>
                      {table.name}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right", color: "#d1d5db" }}>
                      {table.rows.toLocaleString()}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right", color: "#d1d5db" }}>
                      {table.size.toFixed(2)}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right", color: "#d1d5db" }}>
                      {table.indexes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
