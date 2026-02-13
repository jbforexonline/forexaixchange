"use client";
import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { getTransactions, getBetHistory } from "../../lib/api/spin";
import "../Styles/UserDashboard.scss";

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { wallet, loading: walletLoading } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txResponse, betsResponse] = await Promise.all([
          getTransactions(1, 10),
          getBetHistory(1, 10)
        ]);
        setTransactions(txResponse.data || []);
        setBets(betsResponse.data || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const userStats = {
    balance: wallet?.available || 0,
    totalDeposited: wallet?.totalDeposited || 0,
    totalWithdrawn: wallet?.totalWithdrawn || 0,
    totalWon: wallet?.totalWon || 0,
    totalLost: wallet?.totalLost || 0,
    activeBets: bets.filter(b => b.status === 'ACCEPTED').length
  };


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
            <h3>Total Deposited</h3>
            <p className="stat-value">${userStats.totalDeposited.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Total Won</h3>
            <p className="stat-value" style={{ color: '#4ade80' }}>+${userStats.totalWon.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3>Active Bets</h3>
            <p className="stat-value">{userStats.activeBets}</p>
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
            <div className="wallet-summary">
              <h3>Wallet Summary</h3>
              <div className="wallet-details">
                <div className="wallet-item">
                  <span className="label">Available:</span>
                  <span className="value">${wallet?.available?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="wallet-item">
                  <span className="label">Held:</span>
                  <span className="value">${wallet?.held?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="wallet-item">
                  <span className="label">Total Won:</span>
                  <span className="value positive">+${wallet?.totalWon?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="wallet-item">
                  <span className="label">Total Lost:</span>
                  <span className="value negative">-${wallet?.totalLost?.toFixed(2) || "0.00"}</span>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <a href="/dashboard/deposit" className="action-btn primary">
                  <span className="btn-icon">💸</span>
                  Deposit
                </a>
                <a href="/dashboard/transfer" className="action-btn">
                  <span className="btn-icon">💳</span>
                  Transfer
                </a>
                <a href="/dashboard/spin" className="action-btn">
                  <span className="btn-icon">🎰</span>
                  Place Bet
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "investments" && (
          <div className="investments-content">
            <div className="investments-header">
              <h3>Active Bets</h3>
              <a href="/dashboard/spin" className="add-investment-btn">+ Place New Bet</a>
            </div>
            
            <div className="investments-grid">
              {loading ? (
                <div>Loading bets...</div>
              ) : bets.length === 0 ? (
                <div className="empty-state">No active bets. <a href="/dashboard/spin">Place your first bet!</a></div>
              ) : (
                bets.slice(0, 6).map(bet => (
                  <div key={bet.id} className="investment-card">
                    <div className="investment-header">
                      <h4>Spin #{bet.round?.roundNumber || 'N/A'}</h4>
                      <span className={`status ${bet.status.toLowerCase()}`}>
                        {bet.status}
                      </span>
                    </div>
                    <div className="investment-details">
                      <div className="detail-item">
                        <span className="label">Bet:</span>
                        <span className="value">{bet.selection} - {bet.market}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Amount:</span>
                        <span className="value">${bet.amountUsd.toFixed(2)}</span>
                      </div>
                      {bet.payoutAmount && (
                        <div className="detail-item">
                          <span className="label">Payout:</span>
                          <span className={`value ${bet.isWinner ? 'positive' : 'negative'}`}>
                            {bet.isWinner ? '+' : ''}${bet.payoutAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="transactions-content">
            <div className="transactions-header">
              <h3>Recent Transactions</h3>
            </div>
            
            <div className="transactions-table">
              {loading ? (
                <div>Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">No transactions yet.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(transaction => {
                      const date = new Date(transaction.createdAt).toLocaleDateString();
                      const isPositive = ['DEPOSIT', 'INTERNAL_TRANSFER_RECEIVED', 'SPIN_WIN', 'AFFILIATE_EARNING'].includes(transaction.type);
                      return (
                        <tr key={transaction.id}>
                          <td>
                            <span className={`transaction-type ${transaction.type.toLowerCase()}`}>
                              {transaction.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ color: isPositive ? '#4ade80' : '#ef4444' }}>
                            {isPositive ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                          </td>
                          <td>${parseFloat(transaction.fee || 0).toFixed(2)}</td>
                          <td>{date}</td>
                          <td>
                            <span className={`status ${transaction.status.toLowerCase()}`}>
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}