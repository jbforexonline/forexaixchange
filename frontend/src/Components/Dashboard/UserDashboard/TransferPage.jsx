"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "../../../hooks/useWallet";
import { createTransfer, searchUsersForTransfer, getTransactions, isPremiumUser } from "../../../lib/api/spin";

export default function TransferPage() {
  const { wallet, loading: walletLoading } = useWallet();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [feePayer, setFeePayer] = useState("SENDER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    setIsPremium(isPremiumUser());
    if (!isPremiumUser()) {
      setError("Internal transfers are available to premium users only");
    }
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getTransactions(1, 10);
        // Filter for transfer-related transactions
        const transferTxs = response.data.filter(
          (tx) => tx.type === "INTERNAL_TRANSFER_SENT" || tx.type === "INTERNAL_TRANSFER_RECEIVED"
        );
        setTransactions(transferTxs);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      }
    };
    fetchTransactions();
  }, []);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await searchUsersForTransfer(searchQuery);
        setSearchResults(users);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleTransfer = async () => {
    setError(null);
    setSuccess(null);

    if (!isPremium) {
      setError("Internal transfers are available to premium users only");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!selectedRecipient && !recipient) {
      setError("Please select or enter a recipient");
      return;
    }

    const amountNum = parseFloat(amount);
    if (wallet && wallet.available < amountNum) {
      setError("Insufficient funds");
      return;
    }

    setLoading(true);
    try {
      const recipientIdentifier = selectedRecipient?.username || selectedRecipient?.id || recipient;
      
      const result = await createTransfer({
        recipient: recipientIdentifier,
        amount: amountNum,
        feePayer,
      });

      setSuccess(
        `Transfer request submitted! $${amountNum} will be sent to ${selectedRecipient?.username || recipient} after admin approval.`
      );

      // Reset form
      setAmount("");
      setRecipient("");
      setSelectedRecipient(null);
      setSearchQuery("");
      setSearchResults([]);

      // Refresh wallet and transactions
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err?.message || "Failed to process transfer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectRecipient = (user) => {
    setSelectedRecipient(user);
    setRecipient(user.username);
    setSearchQuery(user.username);
    setSearchResults([]);
  };

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

  if (!isPremium) {
    return (
      <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>Internal Transfer</h1>
        <div style={{
          padding: "2rem",
          backgroundColor: "#fff3cd",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          color: "#856404",
        }}>
          <h3 style={{ marginTop: 0 }}>Premium Feature</h3>
          <p>Internal transfers are available to premium users only. Please upgrade to premium to use this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Internal Transfer</h1>
      <p style={{ marginBottom: "2rem", color: "#666" }}>
        Send funds to another user. Transfers require admin approval.
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

      {/* Transfer Form */}
      <div style={{
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}>
        {/* Recipient Search */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Recipient (Username, ID, or Email)
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) {
                  setSelectedRecipient(null);
                  setRecipient("");
                }
              }}
              placeholder="Search by username, ID, or email..."
              style={{
                width: "100%",
                padding: "0.75rem",
                fontSize: "1rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
            {selectedRecipient && (
              <div style={{
                marginTop: "0.5rem",
                padding: "0.5rem",
                backgroundColor: "#e7f3ff",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}>
                Selected: <strong>{selectedRecipient.username}</strong>
                {selectedRecipient.email && ` (${selectedRecipient.email})`}
                {selectedRecipient.verificationBadge && " ✓ Verified"}
                {selectedRecipient.premium && " ⭐ Premium"}
              </div>
            )}
            {searchResults.length > 0 && !selectedRecipient && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginTop: "0.25rem",
                maxHeight: "200px",
                overflowY: "auto",
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => selectRecipient(user)}
                    style={{
                      padding: "0.75rem",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "500" }}>{user.username}</div>
                      {user.email && (
                        <div style={{ fontSize: "0.85rem", color: "#666" }}>{user.email}</div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>
                      {user.verificationBadge && "✓ "}
                      {user.premium && "⭐"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searching && (
              <div style={{
                marginTop: "0.5rem",
                fontSize: "0.85rem",
                color: "#666",
              }}>
                Searching...
              </div>
            )}
          </div>
        </div>

        {/* Amount */}
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

        {/* Fee Payer */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Who pays the transfer fee?
          </label>
          <select
            value={feePayer}
            onChange={(e) => setFeePayer(e.target.value === "SENDER" ? "SENDER" : "RECIPIENT")}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="SENDER">I pay the fee (deducted from my amount)</option>
            <option value="RECIPIENT">Recipient pays the fee (deducted from their amount)</option>
          </select>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
            Transfer fees: $1-6 depending on amount (1% for amounts ≥ $2000)
          </p>
        </div>

        <button
          onClick={handleTransfer}
          disabled={loading || walletLoading || !amount || parseFloat(amount) <= 0 || !selectedRecipient}
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
          {loading ? "Processing..." : "Send Transfer"}
        </button>
      </div>

      {/* Recent Transfers */}
      {transactions.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Recent Transfers</h2>
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
              const isSent = tx.type === "INTERNAL_TRANSFER_SENT";
              
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
                    <div style={{ fontWeight: "500" }}>
                      {isSent ? "Sent" : "Received"} - {tx.description || tx.type}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#666" }}>{date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      fontWeight: "600", 
                      color: isSent ? "#c33" : "#3c3" 
                    }}>
                      {isSent ? "-" : "+"}${parseFloat(tx.amount).toFixed(2)}
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

