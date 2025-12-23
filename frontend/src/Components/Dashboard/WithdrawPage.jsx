"use client";
import React, { useState, useEffect } from "react";
import "../Styles/withdraw.scss";
import { useWallet } from "../../hooks/useWallet";
import { createDeposit, createWithdrawal, getTransactions } from "../../lib/api/spin";

export default function WithdrawPage() {
  const { wallet, loading: walletLoading, error: walletError } = useWallet();
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
  const [transactionType, setTransactionType] = useState("withdraw");

  // Fetch transactions on mount
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getTransactions(1, 10);
        // Ensure transactions is always an array
        const transactionsData = response?.data || response || [];
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
        setTransactions([]); // Ensure it's an empty array on error
      }
    };
    fetchTransactions();
  }, []);

  const handleRequest = async () => {
    setError(null);
    setSuccess(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amountNum = parseFloat(amount);
    if (transactionType === "withdraw" && wallet && wallet.available < amountNum) {
      setError("Insufficient funds");
      return;
    }

    // For withdrawals, bank details are optional (stored in metadata)
    // For deposits, mobile money is instant, bank requires admin approval

    setLoading(true);
    try {
      const method = withdrawMethod === "bank" ? "Bank" : mobileMoneyDetails.provider || "MTN";
      const reference = withdrawMethod === "bank" 
        ? `BANK-${bankDetails.accountNumber}-${Date.now()}`
        : `MOBILE-${mobileMoneyDetails.phoneNumber}-${Date.now()}`;

      if (transactionType === "withdraw") {
        const result = await createWithdrawal({
          amount: amountNum,
          method,
          reference,
        });
        setSuccess(
          `Withdrawal request submitted successfully! $${result.amount} will be processed. Fee: $${result.fee.toFixed(2)}`
        );
        // Refresh wallet and transactions
        window.location.reload();
      } else {
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
        // Refresh wallet and transactions
        window.location.reload();
      }

      // Reset form
      setAmount("");
      setBankDetails({
        accountNumber: "",
        bankName: "",
        accountName: "",
        routingNumber: "",
      });
      setMobileMoneyDetails({
        phoneNumber: "",
        provider: "",
      });
    } catch (err) {
      setError(err?.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="withdraw-page">
      <div className="withdraw-container">
        {/* Header */}
        <div className="page-header">
          <h1>
            {transactionType === "withdraw" ? "Withdraw Funds" : "Deposit Funds"}
          </h1>
          <p>
            {transactionType === "withdraw"
              ? "Transfer your earnings to your bank account or mobile money."
              : "Add funds to your account securely."}
          </p>
        </div>

        <div className="withdraw-content">
          {/* Left Section */}
          <div className="withdraw-form-section">
            {/* Balance */}
            <div className="balance-card">
              <h3>Available Balance</h3>
              <div className="balance-amount">
                ${walletLoading ? "Loading..." : wallet?.available?.toFixed(2) || "0.00"}
              </div>
              <p>Ready for {transactionType === "withdraw" ? "withdrawal" : "deposit"}</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="alert alert-error" style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#fee", color: "#c33", borderRadius: "4px" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" style={{ padding: "1rem", marginBottom: "1rem", backgroundColor: "#efe", color: "#3c3", borderRadius: "4px" }}>
                {success}
              </div>
            )}

            {/* Form */}
            <div className="withdraw-form">
              <div className="form-group">
                <label>Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                >
                  <option value="withdraw">Withdraw</option>
                  <option value="deposit">Deposit</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input">
                  <span className="currency">$</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label> Method</label>
                <div className="method-selector">
                  <button
                    className={`method-btn ${
                      withdrawMethod === "bank" ? "active" : ""
                    }`}
                    onClick={() => setWithdrawMethod("bank")}
                    type="button"
                  >
                    🏦 Bank Transfer
                  </button>
                  <button
                    className={`method-btn ${
                      withdrawMethod === "mobile" ? "active" : ""
                    }`}
                    onClick={() => setWithdrawMethod("mobile")}
                    type="button"
                  >
                    📱 Mobile Money
                  </button>
                </div>
              </div>

              {/* Bank Details */}
              {withdrawMethod === "bank" && (
                <div className="bank-details">
                  <h4>Bank Details</h4>
                  <div className="form-group">
                    <label>Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter account number"
                      value={bankDetails.accountNumber}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          accountNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      placeholder="Enter bank name"
                      value={bankDetails.bankName}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          bankName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Enter account holder name"
                      value={bankDetails.accountName}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          accountName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Routing Number</label>
                    <input
                      type="text"
                      placeholder="Enter routing number"
                      value={bankDetails.routingNumber}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          routingNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Mobile Money Details */}
              {withdrawMethod === "mobile" && (
                <div className="mobile-details">
                  <h4>Mobile Money Details</h4>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="Enter mobile number"
                      value={mobileMoneyDetails.phoneNumber}
                      onChange={(e) =>
                        setMobileMoneyDetails({
                          ...mobileMoneyDetails,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. MTN, Airtel"
                      value={mobileMoneyDetails.provider}
                      onChange={(e) =>
                        setMobileMoneyDetails({
                          ...mobileMoneyDetails,
                          provider: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <button 
                className="withdraw-btn" 
                onClick={handleRequest}
                disabled={loading || walletLoading}
              >
                {loading ? "Processing..." : transactionType === "withdraw" ? "Request Withdrawal" : "Make Deposit"}
              </button>
            </div>
          </div>

          {/* Right Section */}
          <div className="transaction-section">
            <h3>Recent Transactions</h3>
            <div className="transaction-list">
              {!Array.isArray(transactions) || transactions.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
                  No transactions yet
                </div>
              ) : (
                transactions.map((tx) => {
                  const isDeposit = tx.type === "DEPOSIT" || tx.type === "INTERNAL_TRANSFER_RECEIVED";
                  const isWithdrawal = tx.type === "WITHDRAWAL" || tx.type === "INTERNAL_TRANSFER_SENT";
                  const date = new Date(tx.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  
                  return (
                    <div key={tx.id} className="transaction-item">
                      <div className="transaction-info">
                        <div className="transaction-type">{tx.method || tx.type}</div>
                        <div className="transaction-date">{date}</div>
                      </div>
                      <div className="transaction-amount" style={{ color: isDeposit ? "#3c3" : "#c33" }}>
                        {isDeposit ? "+" : "-"}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                      </div>
                      <div className={`transaction-status ${tx.status.toLowerCase()}`}>
                        {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
