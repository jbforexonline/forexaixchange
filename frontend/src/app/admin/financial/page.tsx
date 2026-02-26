"use client";

// Force this admin-only page to be fully dynamic so Next.js
// doesn't try to statically prerender it during the build/export phase.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";
import { useRouter } from "next/navigation";
import { useToast } from "@/Components/Common/Toast/ToastContext";
import { 
  Users,
  ArrowDownCircle, 
  ArrowUpCircle, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Banknote,
  PieChart,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  DollarSign
} from "lucide-react";
import {
  getDeposits,
  getPendingDeposits,
  getWithdrawals,
  getPendingWithdrawals,
  getApprovedWithdrawals,
  approveDeposit,
  rejectDeposit,
  approveWithdrawal,
  rejectWithdrawal,
  markWithdrawalPaid,
  createDepositForUser,
  type Deposit,
  type Withdrawal,
} from "@/lib/api/finance-admin";
import "./FinancialManagement.scss";

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_ADMIN];

type TabType = 'overview' | 'deposits' | 'withdrawals' | 'disputes';

function FinancialManagementContent() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { role, isLoading: layoutLoading } = useLayoutState();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'overview');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Data states
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Deposit[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Withdrawal[]>([]);
  const [approvedWithdrawals, setApprovedWithdrawals] = useState<Withdrawal[]>([]);

  // Filters
  const [depositFilter, setDepositFilter] = useState<string>('all');
  const [withdrawalFilter, setWithdrawalFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create deposit form
  const [showCreateDeposit, setShowCreateDeposit] = useState(false);
  const [depositForm, setDepositForm] = useState({
    userId: '',
    amount: '',
    method: 'BANK_TRANSFER',
    referenceId: '',
  });

  // Access control
  useEffect(() => {
    if (!layoutLoading && role && !ALLOWED_ROLES.includes(role as UserRole)) {
      router.push('/admin/dashboard');
    }
  }, [role, layoutLoading, router]);

  useEffect(() => {
    if (tabFromUrl && ['overview', 'deposits', 'withdrawals', 'disputes'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [pending, approved] = await Promise.all([
          getPendingDeposits().catch(() => ({ data: [] })),
          getPendingWithdrawals().catch(() => ({ data: [] })),
        ]);
        setPendingDeposits(Array.isArray(pending) ? pending : (pending?.data || []));
        setPendingWithdrawals(Array.isArray(approved) ? approved : (approved?.data || []));
      } else if (activeTab === 'deposits') {
        const [all, pending] = await Promise.all([
          getDeposits({ limit: 100 }).catch(() => ({ data: [] })),
          getPendingDeposits().catch(() => ({ data: [] })),
        ]);
        setAllDeposits(Array.isArray(all) ? all : (all?.data || []));
        setPendingDeposits(Array.isArray(pending) ? pending : (pending?.data || []));
      } else if (activeTab === 'withdrawals') {
        const [all, pending, approved] = await Promise.all([
          getWithdrawals({ limit: 100 }).catch(() => ({ data: [] })),
          getPendingWithdrawals().catch(() => ({ data: [] })),
          getApprovedWithdrawals().catch(() => ({ data: [] })),
        ]);
        setAllWithdrawals(Array.isArray(all) ? all : (all?.data || []));
        setPendingWithdrawals(Array.isArray(pending) ? pending : (pending?.data || []));
        setApprovedWithdrawals(Array.isArray(approved) ? approved : (approved?.data || []));
      } else if (activeTab === 'disputes') {
        // Load disputed/pending items
        const [deposits, withdrawals] = await Promise.all([
          getPendingDeposits().catch(() => ({ data: [] })),
          getPendingWithdrawals().catch(() => ({ data: [] })),
        ]);
        setPendingDeposits(Array.isArray(deposits) ? deposits : (deposits?.data || []));
        setPendingWithdrawals(Array.isArray(withdrawals) ? withdrawals : (withdrawals?.data || []));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Deposit actions
  const handleApproveDeposit = async (id: string) => {
    setProcessingId(id);
    try {
      await approveDeposit(id);
      setPendingDeposits(prev => prev.filter(d => d.id !== id));
      toast.success("Deposit approved - funds credited to user");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve deposit");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    
    setProcessingId(id);
    try {
      await rejectDeposit(id, reason);
      setPendingDeposits(prev => prev.filter(d => d.id !== id));
      toast.success("Deposit rejected");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject deposit");
    } finally {
      setProcessingId(null);
    }
  };

  // Withdrawal actions
  const handleApproveWithdrawal = async (id: string) => {
    setProcessingId(id);
    try {
      await approveWithdrawal(id);
      setPendingWithdrawals(prev => prev.filter(w => w.id !== id));
      toast.success("Withdrawal approved - ready for payout");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve withdrawal");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    
    setProcessingId(id);
    try {
      await rejectWithdrawal(id, reason);
      setPendingWithdrawals(prev => prev.filter(w => w.id !== id));
      toast.success("Withdrawal rejected - funds returned to user");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject withdrawal");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    const reference = window.prompt("Enter payout reference (transaction ID, etc):");
    if (!reference) return;
    
    setProcessingId(id);
    try {
      await markWithdrawalPaid(id, reference);
      setApprovedWithdrawals(prev => prev.filter(w => w.id !== id));
      toast.success("Withdrawal marked as paid");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark as paid");
    } finally {
      setProcessingId(null);
    }
  };

  // Create deposit for user
  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositForm.userId || !depositForm.amount) {
      toast.error("User ID and amount are required");
      return;
    }
    
    try {
      await createDepositForUser({
        userId: depositForm.userId,
        amount: parseFloat(depositForm.amount),
        method: depositForm.method,
        referenceId: depositForm.referenceId || undefined,
      });
      toast.success("Deposit created and credited to user");
      setShowCreateDeposit(false);
      setDepositForm({ userId: '', amount: '', method: 'BANK_TRANSFER', referenceId: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create deposit");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
      PENDING_REVIEW: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
      APPROVED: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa' },
      CREDITED: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
      PAID: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
      REJECTED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
      CANCELLED: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.text,
        padding: '0.25rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '600',
      }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (layoutLoading) {
    return <div className="financial-management"><div className="loading-state"><RefreshCw className="spinner" /><p>Loading...</p></div></div>;
  }

  return (
    <div className="financial-management">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <DollarSign size={28} /> Financial Management
        </h1>
        <p>Manage user deposits, withdrawals, and transaction disputes</p>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <PieChart size={16} /> Overview
        </button>
        <button className={`tab-btn ${activeTab === 'deposits' ? 'active' : ''}`} onClick={() => setActiveTab('deposits')}>
          <ArrowDownCircle size={16} /> User Deposits
        </button>
        <button className={`tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`} onClick={() => setActiveTab('withdrawals')}>
          <ArrowUpCircle size={16} /> User Withdrawals
        </button>
        <button className={`tab-btn ${activeTab === 'disputes' ? 'active' : ''}`} onClick={() => setActiveTab('disputes')}>
          <AlertTriangle size={16} /> Disputes / Pending
          {(pendingDeposits.length + pendingWithdrawals.length) > 0 && (
            <span className="badge">{pendingDeposits.length + pendingWithdrawals.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spinner" />
          <p>Loading transactions...</p>
        </div>
      ) : (
        <div className="content-section">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <ArrowDownCircle size={28} color="#10b981" />
                  </div>
                  <div>
                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem' }}>Pending Deposits</p>
                    <p style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{pendingDeposits.length}</p>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <ArrowUpCircle size={28} color="#ef4444" />
                  </div>
                  <div>
                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem' }}>Pending Withdrawals</p>
                    <p style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{pendingWithdrawals.length}</p>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '12px' }}>
                    <Clock size={28} color="#60a5fa" />
                  </div>
                  <div>
                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem' }}>Approved (Awaiting Payout)</p>
                    <p style={{ color: '#fff', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{approvedWithdrawals.length}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                  Quick Actions
                </h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowCreateDeposit(true)}
                    style={{
                      backgroundColor: '#10b981',
                      border: 'none',
                      color: '#fff',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: '500',
                    }}
                  >
                    <ArrowDownCircle size={18} /> Create Deposit for User
                  </button>
                  <button
                    onClick={() => setActiveTab('disputes')}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#f59e0b',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: '500',
                    }}
                  >
                    <AlertTriangle size={18} /> Review Pending Items
                  </button>
                </div>
              </div>

              {/* Recent Pending Items */}
              {(pendingDeposits.length > 0 || pendingWithdrawals.length > 0) && (
                <div className="card">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
                    <Clock size={20} /> Requires Your Attention
                  </h2>
                  {pendingDeposits.slice(0, 3).map(d => (
                    <div key={d.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                    }}>
                      <div>
                        <p style={{ color: '#10b981', margin: 0, fontWeight: '500' }}>Deposit Request</p>
                        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem' }}>
                          {d.user?.email || d.userId} - ${parseFloat(String(d.amount || 0)).toFixed(2)} via {d.method}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleApproveDeposit(d.id)} disabled={processingId === d.id} style={{
                          backgroundColor: '#10b981', border: 'none', color: '#fff',
                          padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        }}>Approve</button>
                        <button onClick={() => handleRejectDeposit(d.id)} disabled={processingId === d.id} style={{
                          backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                          padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        }}>Reject</button>
                      </div>
                    </div>
                  ))}
                  {pendingWithdrawals.slice(0, 3).map(w => (
                    <div key={w.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                    }}>
                      <div>
                        <p style={{ color: '#ef4444', margin: 0, fontWeight: '500' }}>Withdrawal Request</p>
                        <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem' }}>
                          {w.user?.email || w.userId} - ${parseFloat(String(w.grossAmount || 0)).toFixed(2)} via {w.method}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleApproveWithdrawal(w.id)} disabled={processingId === w.id} style={{
                          backgroundColor: '#10b981', border: 'none', color: '#fff',
                          padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        }}>Approve</button>
                        <button onClick={() => handleRejectWithdrawal(w.id)} disabled={processingId === w.id} style={{
                          backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                          padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                        }}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* DEPOSITS TAB */}
          {activeTab === 'deposits' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <ArrowDownCircle size={20} /> User Deposits
                </h2>
                <button
                  onClick={() => setShowCreateDeposit(true)}
                  style={{
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  + Create Deposit
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <select
                  value={depositFilter}
                  onChange={(e) => setDepositFilter(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="CREDITED">Credited</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(depositFilter === 'all' ? allDeposits : allDeposits.filter(d => d.status === depositFilter)).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                          No deposits found
                        </td>
                      </tr>
                    ) : (
                      (depositFilter === 'all' ? allDeposits : allDeposits.filter(d => d.status === depositFilter)).map(d => (
                        <tr key={d.id}>
                          <td>
                            <p style={{ margin: 0, color: '#fff' }}>{d.user?.username || 'Unknown'}</p>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>{d.user?.email}</p>
                          </td>
                          <td style={{ color: '#10b981', fontWeight: '600' }}>${parseFloat(String(d.amount || 0)).toFixed(2)}</td>
                          <td>{d.method}</td>
                          <td>{getStatusBadge(d.status)}</td>
                          <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{new Date(d.createdAt).toLocaleString()}</td>
                          <td>
                            {d.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleApproveDeposit(d.id)} disabled={processingId === d.id} style={{
                                  backgroundColor: '#10b981', border: 'none', color: '#fff',
                                  padding: '0.375rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                                }}>Approve</button>
                                <button onClick={() => handleRejectDeposit(d.id)} disabled={processingId === d.id} style={{
                                  backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                                  padding: '0.375rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                                }}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WITHDRAWALS TAB */}
          {activeTab === 'withdrawals' && (
            <>
              {/* Pending Withdrawals */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} /> Pending Review ({pendingWithdrawals.length})
                </h2>
                <div className="table-container" style={{ marginTop: '1rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Net</th>
                        <th>Method</th>
                        <th>Destination</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                            <CheckCircle size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                            <p>No pending withdrawals</p>
                          </td>
                        </tr>
                      ) : (
                        pendingWithdrawals.map(w => (
                          <tr key={w.id}>
                            <td>
                              <p style={{ margin: 0, color: '#fff' }}>{w.user?.username || 'Unknown'}</p>
                              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>{w.user?.email}</p>
                            </td>
                            <td style={{ color: '#ef4444', fontWeight: '600' }}>${parseFloat(String(w.grossAmount || 0)).toFixed(2)}</td>
                            <td style={{ color: '#f59e0b' }}>${parseFloat(String(w.netAmount || 0)).toFixed(2)}</td>
                            <td>{w.method}</td>
                            <td style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{w.destination || '-'}</td>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{new Date(w.createdAt).toLocaleString()}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleApproveWithdrawal(w.id)} disabled={processingId === w.id} style={{
                                  backgroundColor: '#10b981', border: 'none', color: '#fff',
                                  padding: '0.375rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                                }}>Approve</button>
                                <button onClick={() => handleRejectWithdrawal(w.id)} disabled={processingId === w.id} style={{
                                  backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                                  padding: '0.375rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                                }}>Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approved - Ready for Payout */}
              <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Banknote size={20} /> Approved - Ready for Payout ({approvedWithdrawals.length})
                </h2>
                <p style={{ color: '#9ca3af', margin: '0.5rem 0 1rem 0', fontSize: '0.9rem' }}>
                  These withdrawals have been approved. Process the payment via your payment gateway, then mark as paid.
                </p>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Net Amount</th>
                        <th>Method</th>
                        <th>Destination</th>
                        <th>Approved</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedWithdrawals.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                            No withdrawals awaiting payout
                          </td>
                        </tr>
                      ) : (
                        approvedWithdrawals.map(w => (
                          <tr key={w.id}>
                            <td>
                              <p style={{ margin: 0, color: '#fff' }}>{w.user?.username || 'Unknown'}</p>
                              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>{w.user?.email}</p>
                            </td>
                            <td style={{ color: '#f59e0b', fontWeight: '600' }}>${parseFloat(String(w.netAmount || 0)).toFixed(2)}</td>
                            <td>{w.method}</td>
                            <td style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{w.destination || '-'}</td>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{new Date(w.processedAt || w.createdAt).toLocaleString()}</td>
                            <td>
                              <button onClick={() => handleMarkPaid(w.id)} disabled={processingId === w.id} style={{
                                backgroundColor: '#10b981', border: 'none', color: '#fff',
                                padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                              }}>
                                {processingId === w.id ? <RefreshCw className="spinner" size={16} /> : <Banknote size={16} />}
                                Mark Paid
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* DISPUTES TAB */}
          {activeTab === 'disputes' && (
            <div className="card">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} /> Disputes & Pending Transactions
              </h2>
              <p style={{ color: '#9ca3af', margin: '0.5rem 0 1.5rem 0' }}>
                Review and resolve pending transactions. Contact users if more information is needed.
              </p>

              {pendingDeposits.length === 0 && pendingWithdrawals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <CheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
                  <p style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: '500' }}>All Clear!</p>
                  <p style={{ color: '#9ca3af' }}>No pending transactions requiring review</p>
                </div>
              ) : (
                <>
                  {pendingDeposits.map(d => (
                    <div key={d.id} style={{
                      padding: '1.5rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '12px',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <ArrowDownCircle size={20} color="#10b981" />
                            <span style={{ color: '#10b981', fontWeight: '600' }}>Deposit Request</span>
                            {getStatusBadge(d.status)}
                          </div>
                          <p style={{ color: '#fff', margin: '0 0 0.25rem 0' }}>
                            <strong>{d.user?.username || 'Unknown'}</strong> ({d.user?.email})
                          </p>
                          <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                            Amount: <span style={{ color: '#10b981', fontWeight: '600' }}>${parseFloat(String(d.amount || 0)).toFixed(2)}</span> via {d.method}
                          </p>
                          {d.referenceId && (
                            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>Reference: {d.referenceId}</p>
                          )}
                          <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                            Submitted: {new Date(d.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleApproveDeposit(d.id)} disabled={processingId === d.id} style={{
                            backgroundColor: '#10b981', border: 'none', color: '#fff',
                            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                          }}>
                            {processingId === d.id ? <RefreshCw className="spinner" size={16} /> : <CheckCircle size={16} />}
                            {' '}Approve & Credit
                          </button>
                          <button onClick={() => handleRejectDeposit(d.id)} disabled={processingId === d.id} style={{
                            backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                          }}>
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingWithdrawals.map(w => (
                    <div key={w.id} style={{
                      padding: '1.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px',
                      marginBottom: '1rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <ArrowUpCircle size={20} color="#ef4444" />
                            <span style={{ color: '#ef4444', fontWeight: '600' }}>Withdrawal Request</span>
                            {getStatusBadge(w.status)}
                          </div>
                          <p style={{ color: '#fff', margin: '0 0 0.25rem 0' }}>
                            <strong>{w.user?.username || 'Unknown'}</strong> ({w.user?.email})
                          </p>
                          <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                            Gross: <span style={{ color: '#ef4444', fontWeight: '600' }}>${parseFloat(String(w.grossAmount || 0)).toFixed(2)}</span>
                            {' '}| Net: <span style={{ color: '#f59e0b', fontWeight: '600' }}>${parseFloat(String(w.netAmount || 0)).toFixed(2)}</span>
                            {' '}via {w.method}
                          </p>
                          {w.destination && (
                            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.85rem' }}>Destination: {w.destination}</p>
                          )}
                          <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                            Submitted: {new Date(w.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleApproveWithdrawal(w.id)} disabled={processingId === w.id} style={{
                            backgroundColor: '#10b981', border: 'none', color: '#fff',
                            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                          }}>
                            {processingId === w.id ? <RefreshCw className="spinner" size={16} /> : <CheckCircle size={16} />}
                            {' '}Approve
                          </button>
                          <button onClick={() => handleRejectWithdrawal(w.id)} disabled={processingId === w.id} style={{
                            backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                            padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '500',
                          }}>
                            <XCircle size={16} /> Reject & Refund
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Deposit Modal */}
      {showCreateDeposit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#1f2937',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>Create Deposit for User</h3>
            <p style={{ color: '#9ca3af', margin: '0 0 1.5rem 0', fontSize: '0.85rem' }}>
              Use this if a user has payment issues and you need to manually credit their account after verifying payment.
            </p>
            <form onSubmit={handleCreateDeposit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                  User ID *
                </label>
                <input
                  type="text"
                  required
                  value={depositForm.userId}
                  onChange={(e) => setDepositForm({ ...depositForm, userId: e.target.value })}
                  placeholder="Enter user's ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                  Payment Method
                </label>
                <select
                  value={depositForm.method}
                  onChange={(e) => setDepositForm({ ...depositForm, method: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                  }}
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CARD">Card</option>
                  <option value="CRYPTO">Crypto</option>
                  <option value="MANUAL">Manual Adjustment</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                  Reference ID (optional)
                </label>
                <input
                  type="text"
                  value={depositForm.referenceId}
                  onChange={(e) => setDepositForm({ ...depositForm, referenceId: e.target.value })}
                  placeholder="Transaction reference for audit"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => { setShowCreateDeposit(false); setDepositForm({ userId: '', amount: '', method: 'BANK_TRANSFER', referenceId: '' }); }} style={{
                  flex: 1, padding: '0.75rem', borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" style={{
                  flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none',
                  backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: '500',
                }}>Create & Credit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancialManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="financial-management">
          <div className="loading-state">
            <RefreshCw className="spinner" />
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <FinancialManagementContent />
    </Suspense>
  );
}
