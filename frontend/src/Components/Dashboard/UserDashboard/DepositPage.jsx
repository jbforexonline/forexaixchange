"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "../../../hooks/useWallet";
import { createDeposit, getTransactions } from "../../../lib/api/spin";
import "../../../styles/wallet-theme.css";

export default function DepositPage() {
  const { wallet, loading: walletLoading, refresh } = useWallet();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MTN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getTransactions(1, 10, "DEPOSIT");
        setTransactions(response.data || []);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      }
    };
    fetchTransactions();
  }, []);

  const handleDeposit = async () => {
    setError(null);
    setSuccess(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const amountNum = parseFloat(amount);
      const reference = `DEPOSIT-${method}-${Date.now()}`;
      
      const result = await createDeposit({
        amount: amountNum,
        method,
        reference,
      });

      setSuccess(`✅ Deposit completed instantly! $${amountNum.toFixed(2)} added to your wallet.`);
      setAmount("");
      
      // Refresh wallet and transactions
      await refresh();
      const response = await getTransactions(1, 10, "DEPOSIT");
      setTransactions(response.data || []);
      
      // Dispatch event to notify history page to refresh
      window.dispatchEvent(new CustomEvent('transactionCreated'));
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err?.message || "Failed to process deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

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
    <div className="wallet-page deposit-theme">
      <div className="wallet-container">
        <div className="wallet-page-header">
          <h1>💰 Make a Deposit</h1>
          <p>Add funds to your account instantly. All deposits are processed immediately for testing.</p>
        </div>

        {/* Balance Card */}
        <div className="balance-card">
          <h3>Available Balance</h3>
          <div className="balance-amount">
            ${walletLoading ? "Loading..." : (wallet?.available?.toFixed(2) || "0.00")}
          </div>
          <p className="balance-subtitle">Ready for deposits and trading</p>
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

        {/* Deposit Form */}
        <div className="wallet-form-card">
          <div className="form-group">
            <label>Deposit Amount</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem", fontWeight: "600", color: "#10b981" }}>$</span>
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
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="form-input"
            >
              <option value="MTN">📱 MTN Mobile Money</option>
              <option value="MoMo">📱 MoMo Mobile Money</option>
              <option value="Bank">🏦 Bank Transfer</option>
              <option value="Visa">💳 Visa Card</option>
              <option value="Crypto">₿ Cryptocurrency</option>
            </select>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#10b981", fontWeight: "500" }}>
              ✓ Instant processing - funds available immediately
            </p>
          </div>

          <button
            onClick={handleDeposit}
            disabled={loading || walletLoading || !amount || parseFloat(amount) <= 0}
            className="primary-button"
          >
            {loading ? "⏳ Processing..." : "💵 Make Deposit"}
          </button>
        </div>

        {/* Recent Deposits */}
        {transactions.length > 0 && (
          <div className="wallet-form-card">
            <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "700", color: "var(--expert-text, #f6f8ff)" }}>
              Recent Deposits
            </h2>
            <div className="transaction-list-card">
              {transactions.map((tx, index) => (
                <div key={tx.id} className="transaction-item">
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}>
                    💰
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem", color: "var(--expert-text, #f6f8ff)" }}>
                      {tx.method || "Deposit"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--expert-muted, #98a3cd)" }}>
                      {formatDate(tx.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "700", fontSize: "1.25rem", color: "#10b981" }}>
                      +${parseFloat(tx.amount).toFixed(2)}
                    </div>
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
          </div>
        )}
      </div>
    </div>
  );
}
