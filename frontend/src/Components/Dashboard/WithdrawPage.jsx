"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { createWithdrawal, getTransactions } from "../../lib/api/spin";
import "../../styles/wallet-theme.css";

export default function WithdrawPage() {
  const { wallet, loading: walletLoading, refresh } = useWallet();
  const [withdrawMethod, setWithdrawMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    bankName: "",
    accountName: "",
    routingNumber: "",
  });
  const [mobileMoneyDetails, setMobileMoneyDetails] = useState({
    phoneNumber: "",
    provider: "",
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getTransactions(1, 10, "WITHDRAWAL");
        // Handle nested data structure: response.data.data contains the array
        const transactionsData = response?.data?.data || response?.data || [];
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, []);

  const handleWithdraw = async () => {
    setError(null);
    setSuccess(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (wallet && wallet.available < amountNum) {
      setError("Insufficient funds");
      return;
    }

    setLoading(true);
    try {
      const method = withdrawMethod === "bank" ? "Bank" : mobileMoneyDetails.provider || "MTN";
      const reference = withdrawMethod === "bank"
        ? `BANK-${bankDetails.accountNumber}-${Date.now()}`
        : `MOBILE-${mobileMoneyDetails.phoneNumber}-${Date.now()}`;

      const result = await createWithdrawal({
        amount: amountNum,
        method,
        reference,
      });
      
      // Convert Decimal to number if needed
      const withdrawalAmount = typeof result.amount === 'object' && result.amount?.toNumber 
        ? result.amount.toNumber() 
        : parseFloat(result.amount || 0);
      const feeAmount = typeof result.fee === 'object' && result.fee?.toNumber 
        ? result.fee.toNumber() 
        : parseFloat(result.fee || 0);
      
      setSuccess(`✅ Withdrawal completed instantly! $${withdrawalAmount.toFixed(2)} withdrawn. Fee: $${feeAmount.toFixed(2)}`);
      setAmount("");
      setBankDetails({ accountNumber: "", bankName: "", accountName: "", routingNumber: "" });
      setMobileMoneyDetails({ phoneNumber: "", provider: "" });
      
      // Refresh wallet and transactions
      await refresh();
      const response = await getTransactions(1, 10, "WITHDRAWAL");
      // Handle nested data structure: response.data.data contains the array
      const transactionsData = response?.data?.data || response?.data || [];
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      
      // Dispatch event to notify history page to refresh
      window.dispatchEvent(new CustomEvent('transactionCreated'));
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err?.message || "Failed to process withdrawal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [25, 50, 100, 250, 500];

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
    <div className="wallet-page withdraw-theme">
      <div className="wallet-container">
        <div className="wallet-page-header">
          <h1>💸 Withdraw Funds</h1>
          <p>Transfer your earnings to your bank account or mobile money. All withdrawals are processed instantly for testing.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
          {/* Left: Withdrawal Form */}
          <div>
            {/* Balance Card */}
            <div className="balance-card">
              <h3>Available Balance</h3>
              <div className="balance-amount">
                ${walletLoading ? "Loading..." : (wallet?.available?.toFixed(2) || "0.00")}
              </div>
              <p className="balance-subtitle">Available for withdrawal</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            )}

            {/* Withdrawal Form */}
            <div className="wallet-form-card">
              <div className="form-group">
                <label>Withdrawal Amount</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: "600", color: "#ef4444" }}>$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    style={{ fontSize: "1.2rem", padding: "1rem" }}
                  />
                </div>
                <div className="quick-amounts">
                  {quickAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt.toString())}
                      className="quick-amount-btn"
                      style={{ borderColor: "#ef4444", color: "#ef4444", backgroundColor: "var(--expert-card-alt, rgba(12, 18, 37, 0.9))" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#ef4444";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.color = "#ef4444";
                      }}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Withdrawal Method</label>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                  <button
                    className={`method-btn ${withdrawMethod === "bank" ? "active" : ""
                      }`}
                    onClick={() => setWithdrawMethod("bank")}
                    style={{
                      flex: 1,
                      padding: "0.875rem",
                      borderRadius: "8px",
                      border: `1px solid ${withdrawMethod === "bank" ? "#ef4444" : "var(--expert-border, rgba(65, 84, 131, 0.35))"}`,
                      backgroundColor: withdrawMethod === "bank" ? "rgba(239, 68, 68, 0.2)" : "var(--expert-card-alt, rgba(12, 18, 37, 0.9))",
                      color: withdrawMethod === "bank" ? "#ef4444" : "var(--expert-text, #f6f8ff)",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    🏦 Bank
                  </button>
                  <button
                    className={`method-btn ${withdrawMethod === "mobile" ? "active" : ""
                      }`}
                    onClick={() => setWithdrawMethod("mobile")}
                    style={{
                      flex: 1,
                      padding: "0.875rem",
                      borderRadius: "8px",
                      border: `1px solid ${withdrawMethod === "mobile" ? "#ef4444" : "var(--expert-border, rgba(65, 84, 131, 0.35))"}`,
                      backgroundColor: withdrawMethod === "mobile" ? "rgba(239, 68, 68, 0.2)" : "var(--expert-card-alt, rgba(12, 18, 37, 0.9))",
                      color: withdrawMethod === "mobile" ? "#ef4444" : "var(--expert-text, #f6f8ff)",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    📱 Mobile
                  </button>
                </div>

                {/* Bank Details */}
                {withdrawMethod === "bank" && (
                  <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--expert-card-alt, rgba(12, 18, 37, 0.9))", borderRadius: "8px", border: "1px solid var(--expert-border, rgba(65, 84, 131, 0.35))" }}>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label style={{ fontSize: "0.875rem" }}>Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                        placeholder="Enter account number"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label style={{ fontSize: "0.875rem" }}>Bank Name</label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                        placeholder="Enter bank name"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                      <label style={{ fontSize: "0.875rem" }}>Account Holder Name</label>
                      <input
                        type="text"
                        value={bankDetails.accountName}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                        placeholder="Enter account holder name"
                        className="form-input"
                      />
                    </div>
                  </div>
                )}

                {/* Mobile Money Details */}
                {withdrawMethod === "mobile" && (
                  <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--expert-card-alt, rgba(12, 18, 37, 0.9))", borderRadius: "8px", border: "1px solid var(--expert-border, rgba(65, 84, 131, 0.35))" }}>
                    <div className="form-group" style={{ marginBottom: "1rem" }}>
                      <label style={{ fontSize: "0.875rem" }}>Phone Number</label>
                      <input
                        type="text"
                        value={mobileMoneyDetails.phoneNumber}
                        onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, phoneNumber: e.target.value })}
                        placeholder="Enter mobile number"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "0" }}>
                      <label style={{ fontSize: "0.875rem" }}>Provider</label>
                      <select
                        value={mobileMoneyDetails.provider}
                        onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, provider: e.target.value })}
                        className="form-input"
                      >
                        <option value="">Select provider</option>
                        <option value="MTN">MTN</option>
                        <option value="Airtel">Airtel</option>
                        <option value="MoMo">MoMo</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="withdraw-btn"
                onClick={handleRequest}
                disabled={loading || walletLoading}
              >
                {loading ? "⏳ Processing..." : "💸 Request Withdrawal"}
              </button>
            </div>
          </div>

          {/* Right Section */}
          <div className="transaction-section">
            <h3>Recent Transactions</h3>
            <div className="transaction-list">
              {(!transactions || transactions.length === 0) ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                  No transactions yet
                </div>
              ) : (
                Array.isArray(transactions) && transactions.map((tx) => {
                  const isDeposit = tx.type === "DEPOSIT" || tx.type === "INTERNAL_TRANSFER_RECEIVED";
                  const isWithdrawal = tx.type === "WITHDRAWAL" || tx.type === "INTERNAL_TRANSFER_SENT";
                  const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  return (
                    <div key={tx.id} className="transaction-item">
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "#fee2e2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                      }}>
                        💸
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", marginBottom: "0.25rem", color: "var(--expert-text, #f6f8ff)" }}>
                          {tx.method || "Withdrawal"}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "var(--expert-muted, #98a3cd)" }}>
                          {formatDate(tx.createdAt)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: "700", fontSize: "1.25rem", color: "#ef4444" }}>
                          -${parseFloat(tx.amount).toFixed(2)}
                        </div>
                        {tx.fee && parseFloat(tx.fee) > 0 && (
                          <div style={{ fontSize: "0.75rem", color: "#999" }}>
                            Fee: ${parseFloat(tx.fee).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div style={{
                        padding: "0.375rem 0.875rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        backgroundColor: "#d1fae5",
                        color: "#065f46",
                      }}>
                        {tx.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
