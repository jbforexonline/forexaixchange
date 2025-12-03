"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "../../../hooks/useWallet";
import { createDeposit, getTransactions } from "../../../lib/api/spin";

export default function DepositPage() {
  const { wallet, loading: walletLoading } = useWallet();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MTN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

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

      if (result.instant) {
        setSuccess(`Deposit completed instantly! $${amountNum} added to your wallet.`);
      } else {
        setSuccess(`Deposit request submitted! $${amountNum} will be added after admin approval.`);
      }

      setAmount("");
      // Refresh wallet and transactions
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err?.message || "Failed to process deposit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Make a Deposit</h1>
      <p style={{ marginBottom: "2rem", color: "#666" }}>
        Add funds to your account to start trading. Mobile money deposits are instant!
      </p>

      {/* Balance Card */}
      <div style={{
        backgroundColor: "#f5f5f5",
        padding: "1.5rem",
        borderRadius: "8px",
        marginBottom: "2rem",
      }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#666" }}>Available Balance</h3>
        <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#333" }}>
          ${walletLoading ? "Loading..." : wallet?.available?.toFixed(2) || "0.00"}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#fee",
          color: "#c33",
          borderRadius: "4px",
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: "1rem",
          marginBottom: "1rem",
          backgroundColor: "#efe",
          color: "#3c3",
          borderRadius: "4px",
        }}>
          {success}
        </div>
      )}

      {/* Deposit Form */}
      <div style={{
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Amount
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              style={{
                flex: 1,
                padding: "0.75rem",
                fontSize: "1.1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          </div>
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                }}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Payment Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="MTN">MTN Mobile Money (Instant)</option>
            <option value="MoMo">MoMo Mobile Money (Instant)</option>
            <option value="Bank">Bank Transfer (Requires Approval)</option>
            <option value="Visa">Visa Card (Requires Approval)</option>
            <option value="Crypto">Cryptocurrency (Requires Approval)</option>
          </select>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
            {method === "MTN" || method === "MoMo" 
              ? "✓ Instant processing - funds available immediately"
              : "⏳ Requires admin approval - may take 24-48 hours"}
          </p>
        </div>

        <button
          onClick={handleDeposit}
          disabled={loading || walletLoading || !amount || parseFloat(amount) <= 0}
          style={{
            width: "100%",
            padding: "1rem",
            fontSize: "1.1rem",
            fontWeight: "600",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Processing..." : "Make Deposit"}
        </button>
      </div>

      {/* Recent Deposits */}
      {transactions.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Recent Deposits</h2>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}>
            {transactions.map((tx) => {
              const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              
              return (
                <div
                  key={tx.id}
                  style={{
                    padding: "1rem",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "500" }}>{tx.method || tx.type}</div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>{date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "600", color: "#3c3" }}>
                      +${parseFloat(tx.amount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

