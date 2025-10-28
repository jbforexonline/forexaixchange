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
    routingNumber: ""
  });

  const handleWithdraw = () => {
    if (!amount || !bankDetails.accountNumber) {
      alert("Please fill in all required fields");
      return;
    }
    alert(`Withdrawal request submitted for $${amount}`);
  };

  return (
    <div className="withdraw-page">
      <div className="withdraw-container">
        <div className="page-header">
          <h1>Withdraw Funds</h1>
          <p>Transfer your earnings to your bank account</p>
        </div>

        <div className="withdraw-content">
          {/* Left Section - Withdraw Form */}
          <div className="withdraw-form-section">
            <div className="balance-card">
              <h3>Available Balance</h3>
              <div className="balance-amount">$22,800.50</div>
              <p>Ready for withdrawal</p>
            </div>

            <div className="withdraw-form">
              <div className="form-group">
                <label>Withdrawal Amount</label>
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
                <label>Withdrawal Method</label>
                <div className="method-selector">
                  <button
                    className={`method-btn ${withdrawMethod === "bank" ? "active" : ""}`}
                    onClick={() => setWithdrawMethod("bank")}
                  >
                    🏦 Bank Transfer
                  </button>
                  <button
                    className={`method-btn ${withdrawMethod === "crypto" ? "active" : ""}`}
                    onClick={() => setWithdrawMethod("crypto")}
                  >
                    Mobile Money
                  </button>
                </div>
              </div>

              {withdrawMethod === "bank" && (
                <div className="bank-details">
                  <h4>Bank Details</h4>
                  <div className="form-group">
                    <label>Account Number</label>
                    <input
                      type="text"
                      placeholder="Enter account number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      placeholder="Enter bank name"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Enter account holder name"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Routing Number</label>
                    <input
                      type="text"
                      placeholder="Enter routing number"
                      value={bankDetails.routingNumber}
                      onChange={(e) => setBankDetails({...bankDetails, routingNumber: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <button className="withdraw-btn" onClick={handleWithdraw}>
                Request Withdrawal
              </button>
            </div>
          </div>

          {/* Right Section - Transaction History */}
          <div className="transaction-section">
            <h3>Recent Withdrawals</h3>
            <div className="transaction-list">
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Mobile Money</div>
                  <div className="transaction-date">Dec 15, 2024</div>
                </div>
                <div className="transaction-amount">-$1,500.00</div>
                <div className="transaction-status completed">Completed</div>
              </div>
              
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Bank Transfer</div>
                  <div className="transaction-date">Dec 10, 2024</div>
                </div>
                <div className="transaction-amount">-$2,200.00</div>
                <div className="transaction-status completed">Completed</div>
              </div>
              
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Mobile Money</div>
                  <div className="transaction-date">Dec 8, 2024</div>
                </div>
                <div className="transaction-amount">-$850.00</div>
                <div className="transaction-status pending">Pending</div>
              </div>
              
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Bank Transfer</div>
                  <div className="transaction-date">Dec 5, 2024</div>
                </div>
                <div className="transaction-amount">-$3,100.00</div>
                <div className="transaction-status completed">Completed</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Bank Transfer</div>
                  <div className="transaction-date">Dec 10, 2024</div>
                </div>
                <div className="transaction-amount">-$2,200.00</div>
                <div className="transaction-status completed">Completed</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Bank Transfer</div>
                  <div className="transaction-date">Dec 10, 2024</div>
                </div>
                <div className="transaction-amount">-$2,200.00</div>
                <div className="transaction-status completed">Completed</div>
              </div>
              <div className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-type">Bank Transfer</div>
                  <div className="transaction-date">Dec 10, 2024</div>
                </div>
                <div className="transaction-amount">-$2,200.00</div>
                <div className="transaction-status completed">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
