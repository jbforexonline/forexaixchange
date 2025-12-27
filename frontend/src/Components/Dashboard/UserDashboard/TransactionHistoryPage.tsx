"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getTransactions } from "../../../lib/api/spin";
import "../../../styles/wallet-theme.css";

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const typeFilter = filter === "ALL" ? undefined : filter;
      console.log("🔍 Fetching transactions with filter:", typeFilter, "page:", page);
      const response = await getTransactions(page, 20, typeFilter);
      console.log("📦 Transaction API response:", response);
      
      // Handle nested data structure: response.data.data contains the array
      // Backend wraps in {data: {data: Array, meta: {...}}}
      const transactionsData = response?.data?.data || response?.data || [];
      const meta = response?.data?.meta || response?.meta;
      console.log("📋 Transactions data:", transactionsData);
      console.log("📊 Transactions count:", Array.isArray(transactionsData) ? transactionsData.length : 0);
      
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setTotalPages(meta?.totalPages || 1);
    } catch (error) {
      console.error("❌ Failed to fetch transactions:", error);
      console.error("❌ Error details:", {
        message: error?.message,
        stack: error?.stack,
        response: error?.response
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when page or filter changes
  useEffect(() => {
    fetchTransactions();
  }, [page, filter]);

  // Refresh when navigating to this page or when window gains focus (e.g., after making a deposit)
  useEffect(() => {
    const handleFocus = () => {
      const isHistoryPage = pathname === "/history" || pathname === "/user-dashboard/history";
      if (isHistoryPage) {
        fetchTransactions();
      }
    };

    // Listen for custom event from deposit/withdraw pages
    const handleTransactionCreated = () => {
      fetchTransactions();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('transactionCreated', handleTransactionCreated);

    // Also fetch on mount/route change
    handleFocus();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('transactionCreated', handleTransactionCreated);
    };
  }, [pathname]);

  const getTransactionColor = (type) => {
    if (type === "DEPOSIT" || type === "INTERNAL_TRANSFER_RECEIVED" || type === "SPIN_WIN") {
      return "#10b981"; // Green
    }
    if (type === "WITHDRAWAL" || type === "INTERNAL_TRANSFER_SENT" || type === "SPIN_LOSS") {
      return "#ef4444"; // Red
    }
    return "#6b7280"; // Gray
  };

  const getTransactionSign = (type) => {
    if (type === "DEPOSIT" || type === "INTERNAL_TRANSFER_RECEIVED" || type === "SPIN_WIN") {
      return "+";
    }
    if (type === "WITHDRAWAL" || type === "INTERNAL_TRANSFER_SENT" || type === "SPIN_LOSS") {
      return "-";
    }
    return "";
  };

  const getTransactionIcon = (type) => {
    if (type === "DEPOSIT") return "💰";
    if (type === "WITHDRAWAL") return "💸";
    if (type.includes("TRANSFER")) return "↔️";
    if (type.includes("SPIN")) return "🎰";
    return "📋";
  };

  const formatType = (type) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="wallet-page history-theme">
      <div className="wallet-container">
        <div className="wallet-page-header">
          <h1>📋 Transaction History</h1>
          <p>View all your deposits, withdrawals, transfers, and game transactions in one place.</p>
        </div>

        {/* Filter Tabs */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {["ALL", "DEPOSIT", "WITHDRAWAL", "SPIN_WIN", "SPIN_LOSS"].map((filterType) => (
            <button
              key={filterType}
              onClick={() => {
                setFilter(filterType);
                setPage(1);
              }}
              className="filter-button"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                border: "1px solid",
                backgroundColor: filter === filterType ? "var(--history-primary)" : "var(--expert-card-alt, rgba(12, 18, 37, 0.9))",
                color: filter === filterType ? "white" : "var(--expert-text, #f6f8ff)",
                borderColor: filter === filterType ? "var(--history-primary)" : "var(--expert-border, rgba(65, 84, 131, 0.35))",
                cursor: "pointer",
                fontWeight: filter === filterType ? "600" : "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (filter !== filterType) {
                  e.currentTarget.style.borderColor = "var(--history-primary)";
                  e.currentTarget.style.color = "var(--expert-text, #f6f8ff)";
                  e.currentTarget.style.backgroundColor = "var(--expert-card-alt, rgba(12, 18, 37, 0.9))";
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== filterType) {
                  e.currentTarget.style.borderColor = "var(--expert-border, rgba(65, 84, 131, 0.35))";
                  e.currentTarget.style.color = "var(--expert-text, #f6f8ff)";
                  e.currentTarget.style.backgroundColor = "var(--expert-card-alt, rgba(12, 18, 37, 0.9))";
                }
              }}
            >
              {formatType(filterType)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="loading-state">
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No transactions yet</h3>
            <p>Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="transaction-list-card">
            {transactions.map((tx, index) => {
              const color = getTransactionColor(tx.type);
              const sign = getTransactionSign(tx.type);
              const icon = getTransactionIcon(tx.type);

              return (
                <div
                  key={tx.id}
                  className="transaction-item"
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: `${color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    {icon}
                  </div>

                  {/* Details */}
                  <div>
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem", color: "var(--expert-text, #f6f8ff)" }}>
                    {formatType(tx.type)}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--expert-muted, #98a3cd)" }}>
                    {formatDate(tx.createdAt)}
                    {tx.method && ` • ${tx.method}`}
                  </div>
                    {tx.description && (
                      <div style={{ fontSize: "0.85rem", color: "#999", marginTop: "0.25rem" }}>
                        {tx.description}
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: "700",
                      fontSize: "1.25rem",
                      color,
                    }}
                  >
                    {sign}${parseFloat(tx.amount).toFixed(2)}
                    {tx.fee && parseFloat(tx.fee) > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "#999", fontWeight: "400" }}>
                        Fee: ${parseFloat(tx.fee).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div
                    style={{
                      padding: "0.375rem 0.875rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      backgroundColor:
                        tx.status === "COMPLETED"
                          ? "#d1fae5"
                          : tx.status === "PENDING"
                          ? "#fef3c7"
                          : "#fee2e2",
                      color:
                        tx.status === "COMPLETED"
                          ? "#065f46"
                          : tx.status === "PENDING"
                          ? "#92400e"
                          : "#991b1b",
                    }}
                  >
                    {tx.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: page === 1 ? "var(--expert-card-alt, rgba(12, 18, 37, 0.5))" : "var(--expert-card-alt, rgba(12, 18, 37, 0.9))",
                border: "1px solid var(--expert-border, rgba(65, 84, 131, 0.35))",
                borderRadius: "8px",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontWeight: "600",
                color: page === 1 ? "var(--expert-muted, #98a3cd)" : "var(--expert-text, #f6f8ff)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (page !== 1) {
                  e.currentTarget.style.borderColor = "var(--history-primary)";
                  e.currentTarget.style.color = "var(--history-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (page !== 1) {
                  e.currentTarget.style.borderColor = "var(--expert-border, rgba(65, 84, 131, 0.35))";
                  e.currentTarget.style.color = "var(--expert-text, #f6f8ff)";
                }
              }}
            >
              ← Previous
            </button>
            <span
              style={{
                padding: "0.75rem 1.5rem",
                fontWeight: "600",
                color: "var(--expert-text, #f6f8ff)",
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: page === totalPages ? "#f5f5f5" : "white",
                border: "2px solid var(--neutral-border)",
                borderRadius: "8px",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontWeight: "600",
                color: page === totalPages ? "#999" : "var(--neutral-text-dark)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (page !== totalPages) {
                  e.currentTarget.style.borderColor = "var(--history-primary)";
                  e.currentTarget.style.color = "var(--history-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (page !== totalPages) {
                  e.currentTarget.style.borderColor = "var(--neutral-border)";
                  e.currentTarget.style.color = "var(--neutral-text-dark)";
                }
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
