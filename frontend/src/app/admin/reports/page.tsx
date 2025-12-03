"use client";
import React, { useState, useEffect } from "react";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole } from "@/lib/layoutConfig";

interface Report {
  id: string;
  type: "suspicious_activity" | "user_complaint" | "payment_issue" | "bug_report";
  status: "open" | "in_progress" | "resolved" | "closed";
  reportedBy: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export default function ReportsPage() {
  const { user, role } = useLayoutState();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("open");
  const [filterType, setFilterType] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
      return;
    }

    fetchReports();
  }, [role, filterStatus, filterType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/reports?status=${filterStatus}&type=${filterType}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setReports(
          reports.map((r) =>
            r.id === reportId ? { ...r, status: newStatus as any } : r
          )
        );
        if (selectedReport?.id === reportId) {
          setSelectedReport({ ...selectedReport, status: newStatus as any });
        }
      }
    } catch (error) {
      console.error("Failed to update report:", error);
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      case "low":
        return "#3b82f6";
      default:
        return "#d1d5db";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "open":
        return "#ef4444";
      case "in_progress":
        return "#f59e0b";
      case "resolved":
        return "#10b981";
      case "closed":
        return "#8b5cf6";
      default:
        return "#d1d5db";
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
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ marginTop: 0, color: "#fff" }}>Reports Management</h1>
        <p style={{ color: "#d1d5db" }}>
          View and manage user reports and complaints
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
            Total Reports
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.8rem" }}>
            {reports.length}
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
            Open Reports
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.8rem" }}>
            {reports.filter((r) => r.status === "open").length}
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "12px",
            padding: "1.5rem",
          }}
        >
          <p style={{ margin: 0, color: "#fcd34d", fontSize: "0.9rem" }}>
            In Progress
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.8rem" }}>
            {reports.filter((r) => r.status === "in_progress").length}
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
            Resolved
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#fff", fontSize: "1.8rem" }}>
            {reports.filter((r) => r.status === "resolved").length}
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
              Status:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>
              Type:
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
              <option value="all">All Types</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="user_complaint">User Complaint</option>
              <option value="payment_issue">Payment Issue</option>
              <option value="bug_report">Bug Report</option>
            </select>
          </div>

          <div>
            <label style={{ color: "#d1d5db", fontSize: "0.9rem" }}>&nbsp;</label>
            <button
              onClick={fetchReports}
              style={{
                width: "100%",
                padding: "0.75rem",
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
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#d1d5db" }}>
          <p>Loading reports...</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: selectedReport ? "1fr 1fr" : "1fr",
            gap: "2rem",
          }}
        >
          <div>
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1.5rem",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <h3 style={{ margin: 0, color: "#93c5fd" }}>Reports List</h3>
              </div>

              {reports.length === 0 ? (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#d1d5db",
                  }}
                >
                  <p>No reports found.</p>
                </div>
              ) : (
                <div>
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      style={{
                        width: "100%",
                        padding: "1rem",
                        backgroundColor:
                          selectedReport?.id === report.id
                            ? "rgba(14, 165, 233, 0.2)"
                            : "transparent",
                        border:
                          selectedReport?.id === report.id
                            ? "1px solid rgba(14, 165, 233, 0.5)"
                            : "1px solid rgba(255, 255, 255, 0.05)",
                        borderBottom:
                          selectedReport?.id === report.id
                            ? "1px solid rgba(14, 165, 233, 0.5)"
                            : "1px solid rgba(255, 255, 255, 0.05)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.3s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: "0.5rem",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              color: "#fff",
                              fontWeight: "600",
                              fontSize: "0.9rem",
                            }}
                          >
                            {report.subject}
                          </p>
                          <p
                            style={{
                              margin: "0.25rem 0 0 0",
                              color: "#9ca3af",
                              fontSize: "0.8rem",
                            }}
                          >
                            by {report.reportedBy}
                          </p>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: `rgba(${
                                report.priority === "critical"
                                  ? "220, 38, 38"
                                  : report.priority === "high"
                                  ? "249, 115, 22"
                                  : "234, 179, 8"
                              }, 0.2)`,
                              color: getPriorityColor(report.priority),
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            {report.priority}
                          </span>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: `rgba(${
                                report.status === "open"
                                  ? "239, 68, 68"
                                  : report.status === "in_progress"
                                  ? "245, 158, 11"
                                  : "34, 197, 94"
                              }, 0.2)`,
                              color: getStatusColor(report.status),
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            {report.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedReport && (
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                padding: "1.5rem",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#93c5fd" }}>
                Report Details
              </h3>

              <div style={{ marginTop: "1.5rem" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                    Subject
                  </p>
                  <p style={{ margin: 0, color: "#fff" }}>
                    {selectedReport.subject}
                  </p>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                    Description
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "#d1d5db",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedReport.description}
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                      Reported By
                    </p>
                    <p style={{ margin: 0, color: "#fff" }}>
                      {selectedReport.reportedBy}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                      Type
                    </p>
                    <p style={{ margin: 0, color: "#fff" }}>
                      {selectedReport.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                      Priority
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: getPriorityColor(selectedReport.priority),
                        fontWeight: "600",
                      }}
                    >
                      {selectedReport.priority}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                      Status
                    </p>
                    <select
                      value={selectedReport.status}
                      onChange={(e) =>
                        handleUpdateStatus(selectedReport.id, e.target.value)
                      }
                      style={{
                        padding: "0.5rem",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "6px",
                        color: "#fff",
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                      Created
                    </p>
                    <p style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 0.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
                      Updated
                    </p>
                    <p style={{ margin: 0, color: "#fff", fontSize: "0.9rem" }}>
                      {new Date(selectedReport.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
