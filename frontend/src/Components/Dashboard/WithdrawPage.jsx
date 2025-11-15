"use client";
import React, { useState } from "react";
import "../Styles/withdraw.scss";

export default function WithdrawPage() {
  const [withdrawMethod, setWithdrawMethod] = useState("bank");
  const [amount, setAmount] = useState("");
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

  const handleRequest = () => {
    if (!amount) {
      alert("Please enter an amount");
      return;
    }

    if (withdrawMethod === "bank" && !bankDetails.accountNumber) {
      alert("Please fill in your bank details");
      return;
    }

    if (withdrawMethod === "mobile" && !mobileMoneyDetails.phoneNumber) {
      alert("Please enter your mobile money details");
      return;
    }

    if (transactionType === "withdraw") {
      alert(
        `Withdrawal of $${amount} via ${
          withdrawMethod === "bank" ? "Bank Transfer" : "Mobile Money"
        } submitted successfully.`
      );
    } else {
      alert(`Deposit of $${amount} submitted successfully.`);
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
              <div className="balance-amount">$22,800.50</div>
              <p>Ready for withdrawal</p>
            </div>

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

              <button className="withdraw-btn" onClick={handleRequest}>
                Request
              </button>
            </div>
          </div>

          {/* Right Section */}
          <div className="transaction-section">
            <h3>Recent Withdrawals</h3>
            <div className="transaction-list">
              {[
                { type: "Mobile Money", date: "Dec 15, 2024", amount: -1500, status: "completed" },
                { type: "Bank Transfer", date: "Dec 10, 2024", amount: -2200, status: "completed" },
                { type: "Mobile Money", date: "Dec 8, 2024", amount: -850, status: "pending" },
                { type: "Bank Transfer", date: "Dec 5, 2024", amount: -3100, status: "completed" },
              ].map((tx, index) => (
                <div key={index} className="transaction-item">
                  <div className="transaction-info">
                    <div className="transaction-type">{tx.type}</div>
                    <div className="transaction-date">{tx.date}</div>
                  </div>
                  <div className="transaction-amount">
                    ${Math.abs(tx.amount).toFixed(2)}
                  </div>
                  <div className={`transaction-status ${tx.status}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
