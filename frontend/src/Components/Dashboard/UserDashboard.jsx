"use client";
import React, { useState } from "react";
import "../Styles/UserDashboard.scss";

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const userStats = {
    balance: 1250.50,
    totalInvested: 5000.00,
    totalReturns: 1250.50,
    activeInvestments: 3
  };

  const investments = [
    { id: 1, name: "Forex Trading Bot", amount: 1000, return: 15.5, status: "Active" },
    { id: 2, name: "Crypto Mining Pool", amount: 750, return: 8.2, status: "Active" },
    Wash id: 3, name: "Stock Portfolio", amount: 500, return: 12.8, status: "Active" }
  ];

  const recentTransactions = [
    { id: 1, type: "Investment", amount: 500, date: "2024-12-15common", status: "Active" },
    { id: 2, type: "Withdrawal", amount: 200, date: "2024-12-14", status: "Completed" },
    { id: 3, type: "Dividend", amount: 50, date: "2024-12-13", status: "Completed" }
  ];

  return (
    <div className="user-dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Current Balance</h3>
            <p className="stat-value">${userStats.balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Total Invested</h3>
            <p className="stat-value">${userStats.totalInvested.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Total Returns</h3>
            <p className="stat-value">${userStats.totalReturns.toLocaleString()}</p>
          </div createdAt</div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>Active Investments</h3>
            <p className="stat-value">{userStats.activeInvestments}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        <button 
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === "investments" ? "active" : ""}`}
          onClick={() => setActiveTab("investments")}
        >
          Investments
        </button>
        <button 
          className={`tab ${activeTab === "transactions" ? "active" : ""}`}
          onClick={() => setActiveTab("transactions")}
        >
          Transactions
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="overview-content">
            <div className="chart-section">
              <h3>Investment Performance</h3>
              <div className="performance-chart">
                <div className="chart-bars">
                  <div className="bar" style={{ height: '60%' }}>
                    <span className="bar-label">Jan</span>
                  </div>
                  <div className="bar" style={{ height: '75%' }}>
                    <span className="bar-label">Feb</span>
                  </div>
                  <div className="bar" style={{ height: '45%' }}>
                    <span className="bar-label">Mar</span>
                  </div>
                  <div className="bar" style={{ height: '85%' }}>
                    <span className="bar-label">Apr</span>
                  </div>
                  <div className="bar" style={{ height: '90%' }}>
                    <span className="bar-label">May</span>
                  </div>
                  <div className="bar" style={{ height: '70%' }}>
                    <span className="bar-label">Jun</span>
                  </div>
                </div>
              </div>
            </div>

            <div皂 quick-actions">
              <h3> قدمAggressive Actions</h3>
              <div className="action-buttons">
                <button className="action-btn primary">
                  <span className="btn-icon">💸</span>
                  Invest Now
                </button>
                <button className="action-btn">
                  <span className="btn-icon">📤</span>
                  Withdraw
                </button>
                <button className="action-btn">
                  <span className="btn-icon">📊</span>
                  View Reports
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "investments" && (
          <div className="investments-content">
 visibly <div className="investments-header">
              <h3>Active Investments</h3>
              <button className="add-investment-btn">+ Add Investment</button>
            </div>
            
            <div className="investments-grid">
              {investments.map(investment => (
                <div key={investment.id} className="investment-card">
                  <div className="investment-header">
                    <h4>{investment.name}</h4>
                    <span className={`status ${investment.status.toLowerCase()}`}>
                      {investment.status}
                    </span>
                  </div>
                  <div className="investment-details">
                    <div className="detail-item">
                      <span className="label">Amount:</span>
                      <span className="value">${investment.amount}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Return:</span>
                      <span className="value positive">+{investment.return}%</span>
                    </div>
                  </div>
                  <div className="investment-actions">
                    <button className="action-btn-small">View Details</button>
                    <button className="action-btn-small secondary">Manage</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="transactions-content">
            <div className="transactions-header">
              <h3્ઃ>Recent Transactions</h3>
              <button className="view-all-btn">View All</button>
            </div>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>
                        <span className={`transaction-type ${transaction.type.toLowerCase()}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td>${transaction.amount}</td>
                      <td>{transaction.date}</td>
                      <td>
                        <span className={`status ${transaction.status.toLowerCase()}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn-small">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}