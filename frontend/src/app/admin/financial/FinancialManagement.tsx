"use client";
import React, { useState, useEffect } from "react";
import { useToast } from "@/Components/Common/Toast/ToastContext";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Settings, 
  RefreshCw, 
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Users
} from "lucide-react";
import "./FinancialManagement.scss";
import { 
  getPendingTransactions, 
  approveTransaction, 
  rejectTransaction,
  getPendingTransfers,
  approveTransfer,
  rejectTransfer,
  getSystemConfig,
  updateSystemConfig,
  getAllTransactions,
  PendingTransaction,
  InternalTransfer,
  SystemConfig,
  TransactionResponse
} from "@/lib/api/admin-finance";

export default function FinancialManagement() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'pending' | 'transfers' | 'config' | 'all'>('pending');
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [transactionMeta, setTransactionMeta] = useState({ page: 1, totalPages: 1 });
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [limitValue, setLimitValue] = useState<string>("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, [activeTab, transactionMeta.page, filterType, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const data = await getPendingTransactions();
        setTransactions(data);
      } else if (activeTab === 'transfers') {
        const data = await getPendingTransfers();
        setTransfers(data);
      } else if (activeTab === 'config') {
        const data = await getSystemConfig();
        setConfigs(data);
        const limit = data.find(c => c.key === 'WITHDRAWAL_LIMIT');
        if (limit) setLimitValue(limit.value);
        else setLimitValue("2000"); // Default
      } else if (activeTab === 'all') {
        const res = await getAllTransactions(transactionMeta.page, 15, filterType, filterStatus);
        setAllTransactions(res.data || []);
        setTransactionMeta({ page: res.meta.page, totalPages: res.meta.totalPages });
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTransaction = async (id: string) => {
    setProcessingId(id);
    try {
      await approveTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success("Transaction approved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve transaction");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransaction = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success("Transaction rejected successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject transaction");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTransfer = async (id: string) => {
    setProcessingId(id);
    try {
      await approveTransfer(id);
      setTransfers(prev => prev.filter(t => t.id !== id));
      toast.success("Transfer approved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve transfer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransfer = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectTransfer(id);
      setTransfers(prev => prev.filter(t => t.id !== id));
      toast.success("Transfer rejected successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject transfer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateLimit = async () => {
    setLoading(true);
    try {
      await updateSystemConfig('WITHDRAWAL_LIMIT', limitValue);
      toast.success("Withdrawal limit updated successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update limit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="financial-management">
      <div className="page-header">
        <h1>Financial Management</h1>
        <p>Monitor approvals, control limits, and manage internal transfers</p>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pending'); setTransactionMeta({ ...transactionMeta, page: 1 }); }}
        >
          Pending Approvals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => { setActiveTab('transfers'); setTransactionMeta({ ...transactionMeta, page: 1 }); }}
        >
          Internal Transfers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setTransactionMeta({ ...transactionMeta, page: 1 }); }}
        >
          All History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Financial Limits
        </button>
      </div>

      {loading && !processingId ? (
        <div className="loading-state">
          <RefreshCw className="spinner" />
          <p>Loading financial data...</p>
        </div>
      ) : (
        <div className="content-section">
          {activeTab === 'pending' && (
            <div className="card">
              <h2><CreditCard size={20} /> Pending Deposits & Withdrawals</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-state">No pending transactions found</td>
                      </tr>
                    ) : (
                      transactions.map(t => (
                        <tr key={t.id}>
                          <td>
                            <div className="user-cell">
                              <span className="username">{t.user?.username}</span>
                              <span className="email">{t.user?.email}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${t.type.toLowerCase()}`}>
                              {t.type}
                            </span>
                          </td>
                          <td>
                            <span className={`amount ${t.type === 'DEPOSIT' ? 'positive' : 'negative'}`}>
                              {t.type === 'DEPOSIT' ? '+' : '-'}${Number(t.amount).toFixed(2)}
                            </span>
                          </td>
                          <td>{t.method}</td>
                          <td>{t.reference || 'N/A'}</td>
                          <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="actions">
                              <button 
                                className="approve-btn" 
                                onClick={() => handleApproveTransaction(t.id)}
                                disabled={processingId === t.id}
                                title="Approve"
                              >
                                {processingId === t.id ? <RefreshCw className="spinner" size={16} /> : <CheckCircle size={18} />}
                              </button>
                              <button 
                                className="reject-btn" 
                                onClick={() => handleRejectTransaction(t.id)}
                                disabled={processingId === t.id}
                                title="Reject"
                              >
                                {processingId === t.id ? <RefreshCw className="spinner" size={16} /> : <XCircle size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transfers' && (
            <div className="card">
              <h2><Users size={20} /> Pending Internal Transfers</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sender</th>
                      <th>Recipient</th>
                      <th>Amount</th>
                      <th>Fee</th>
                      <th>Fee Payer</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-state">No pending transfers found</td>
                      </tr>
                    ) : (
                      transfers.map(tr => (
                        <tr key={tr.id}>
                          <td>
                            <div className="user-cell">
                              <span className="username">{tr.sender?.username}</span>
                              <span className="email">{tr.sender?.email}</span>
                            </div>
                          </td>
                          <td>
                            <div className="user-cell">
                              <span className="username">{tr.recipient?.username}</span>
                              <span className="email">{tr.recipient?.email}</span>
                            </div>
                          </td>
                          <td className="amount negative">-${Number(tr.amount).toFixed(2)}</td>
                          <td>${Number(tr.fee).toFixed(2)}</td>
                          <td>{tr.feePayer}</td>
                          <td>{new Date(tr.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="actions">
                              <button 
                                className="approve-btn" 
                                onClick={() => handleApproveTransfer(tr.id)}
                                disabled={processingId === tr.id}
                                title="Approve"
                              >
                                {processingId === tr.id ? <RefreshCw className="spinner" size={16} /> : <CheckCircle size={18} />}
                              </button>
                              <button 
                                className="reject-btn" 
                                onClick={() => handleRejectTransfer(tr.id)}
                                disabled={processingId === tr.id}
                                title="Reject"
                              >
                                {processingId === tr.id ? <RefreshCw className="spinner" size={16} /> : <XCircle size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'all' && (
            <div className="card">
              <div className="card-header-with-actions">
                <h2><DollarSign size={20} /> Platform Transaction History</h2>
                <div className="filters">
                   <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setTransactionMeta({ ...transactionMeta, page: 1 }); }}>
                      <option value="ALL">All Types</option>
                      <option value="DEPOSIT">Deposits</option>
                      <option value="WITHDRAWAL">Withdrawals</option>
                      <option value="SPIN_WIN">Spin Wins</option>
                      <option value="SPIN_LOSS">Spin Losses</option>
                      <option value="INTERNAL_TRANSFER_SENT">Transfers Sent</option>
                      <option value="INTERNAL_TRANSFER_RECEIVED">Transfers Received</option>
                   </select>
                   <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTransactionMeta({ ...transactionMeta, page: 1 }); }}>
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="FAILED">Failed</option>
                   </select>
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-state">No transactions match your filters</td>
                      </tr>
                    ) : (
                      allTransactions.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }}>{t.id}</td>
                          <td>
                            <div className="user-cell">
                               <span className="username">{t.user?.username}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${t.type.toLowerCase()}`}>
                              {t.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span className={`amount ${['DEPOSIT', 'SPIN_WIN', 'INTERNAL_TRANSFER_RECEIVED'].includes(t.type) ? 'positive' : 'negative'}`}>
                              {Number(t.amount).toFixed(2)}
                            </span>
                          </td>
                          <td>
                             <span className={`status-pill ${t.status.toLowerCase()}`}>
                                {t.status}
                             </span>
                          </td>
                          <td>{new Date(t.createdAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {transactionMeta.totalPages > 1 && (
                <div className="pagination">
                  <button 
                    disabled={transactionMeta.page === 1}
                    onClick={() => setTransactionMeta(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </button>
                  <span className="page-info">Page {transactionMeta.page} of {transactionMeta.totalPages}</span>
                  <button 
                    disabled={transactionMeta.page === transactionMeta.totalPages}
                    onClick={() => setTransactionMeta(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="card">
              <h2><Settings size={20} /> Financial Limits Control</h2>
              <div className="config-form">
                <div className="form-group">
                  <label htmlFor="withdrawal-limit">Daily Withdrawal Limit (Regular Users)</label>
                  <div className="input-wrapper">
                    <span>$</span>
                    <input 
                      id="withdrawal-limit"
                      type="number" 
                      value={limitValue} 
                      onChange={(e) => setLimitValue(e.target.value)}
                      placeholder="e.g. 2000"
                    />
                  </div>
                  <p className="help-text">This limit applies to all non-premium users. Premium users have unlimited withdrawals.</p>
                </div>
                <button 
                  className="save-btn" 
                  onClick={handleUpdateLimit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Update Limit'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
