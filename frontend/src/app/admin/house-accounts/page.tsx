"use client";

// Force this admin-only page to be fully dynamic so Next.js
// doesn't try to prerender it during the build/export phase.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLayoutState } from "@/hooks/useLayoutState";
import { UserRole, isAdminRole } from "@/lib/layoutConfig";
import { useRouter } from "next/navigation";
import { useToast } from "@/Components/Common/Toast/ToastContext";
import { 
  Building2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Send,
  Download,
  Upload,
  History,
  TrendingUp,
  PieChart,
  DollarSign,
  AlertTriangle,
  Banknote,
  BarChart3,
  Shield
} from "lucide-react";
import {
  getHouseAccountsDetailed,
  getHouseStatus,
  getSettlements,
  getSettlementsSummary,
  getBankSnapshots,
  transferBetweenHouseAccounts,
  withdrawHouseToBank,
  depositHouseFromBank,
  updateBankBalance,
  type HouseAccountDetailed,
  type ReserveStatus,
  type Settlement,
  type SettlementSummary,
} from "@/lib/api/finance-admin";
import "../financial/FinancialManagement.scss";

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_ADMIN];

type TabType = 'overview' | 'accounts' | 'settlements' | 'bank';

function HouseAccountsContent() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { role, isLoading: layoutLoading } = useLayoutState();
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'overview');
  const [loading, setLoading] = useState(true);

  // Sync with URL param changes
  useEffect(() => {
    if (tabFromUrl && ['overview', 'accounts', 'bank', 'settlements'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Data states
  const [houseAccounts, setHouseAccounts] = useState<HouseAccountDetailed[]>([]);
  const [reserveStatus, setReserveStatus] = useState<ReserveStatus | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const [bankSnapshots, setBankSnapshots] = useState<any[]>([]);

  // Action modals
  const [showHouseAction, setShowHouseAction] = useState<'deposit' | 'withdraw' | 'transfer' | 'bank-update' | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<HouseAccountDetailed | null>(null);
  const [houseActionForm, setHouseActionForm] = useState({
    amount: '',
    toAccountId: '',
    bankReference: '',
    reason: '',
  });
  const [bankUpdateForm, setBankUpdateForm] = useState({
    bankBalance: '',
    bankAccountRef: '',
    notes: '',
  });

  // Access control
  useEffect(() => {
    if (!layoutLoading && role && !ALLOWED_ROLES.includes(role as UserRole)) {
      router.push('/admin/dashboard');
    }
  }, [role, layoutLoading, router]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'accounts') {
        const [accountsData, houseData] = await Promise.all([
          getHouseAccountsDetailed().catch((err) => {
            console.error('Failed to fetch detailed accounts:', err);
            return [];
          }),
          getHouseStatus().catch(() => ({ houseAccounts: {}, reserveStatus: null })),
        ]);
        
        let accounts = Array.isArray(accountsData) ? accountsData : [];
        
        // If detailed endpoint returns empty, create accounts from houseStatus
        if (accounts.length === 0 && houseData?.houseAccounts) {
          const simpleAccounts = houseData.houseAccounts;
          accounts = Object.entries(simpleAccounts).map(([key, value]) => ({
            id: `SYS_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`.replace('__', '_'),
            type: key.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, ''),
            name: key.replace(/([A-Z])/g, ' $1').trim(),
            balance: String(value || 0),
            currency: 'USD',
            stats: { transactionCount: 0, totalDebits: '0', totalCredits: '0' },
            recentTransactions: [],
          }));
        }
        
        setHouseAccounts(accounts as HouseAccountDetailed[]);
        setReserveStatus(houseData?.reserveStatus || null);
      }
      
      if (activeTab === 'settlements') {
        const [settlementsData, summaryData] = await Promise.all([
          getSettlements({ limit: 50 }).catch(() => ({ settlements: [], total: 0 })),
          getSettlementsSummary().catch(() => null),
        ]);
        setSettlements(settlementsData?.settlements || []);
        setSettlementSummary(summaryData);
      }

      if (activeTab === 'bank') {
        const [houseData, snapshots] = await Promise.all([
          getHouseStatus().catch(() => ({ reserveStatus: null })),
          getBankSnapshots(20).catch(() => []),
        ]);
        setReserveStatus(houseData?.reserveStatus || null);
        setBankSnapshots(Array.isArray(snapshots) ? snapshots : []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // House account actions
  const handleHouseDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !houseActionForm.amount || !houseActionForm.reason) {
      toast.error("Amount and reason are required");
      return;
    }
    
    try {
      await depositHouseFromBank({
        toAccountId: selectedAccount.id,
        amount: parseFloat(houseActionForm.amount),
        bankReference: houseActionForm.bankReference || undefined,
        reason: houseActionForm.reason,
      });
      toast.success(`Deposit of $${houseActionForm.amount} recorded`);
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to record deposit");
    }
  };

  const handleHouseWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !houseActionForm.amount || !houseActionForm.reason) {
      toast.error("Amount and reason are required");
      return;
    }
    
    try {
      await withdrawHouseToBank({
        fromAccountId: selectedAccount.id,
        amount: parseFloat(houseActionForm.amount),
        bankReference: houseActionForm.bankReference || undefined,
        reason: houseActionForm.reason,
      });
      toast.success(`Withdrawal of $${houseActionForm.amount} recorded`);
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to record withdrawal");
    }
  };

  const handleHouseTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !houseActionForm.amount || !houseActionForm.toAccountId || !houseActionForm.reason) {
      toast.error("All fields are required");
      return;
    }
    
    try {
      await transferBetweenHouseAccounts({
        fromAccountId: selectedAccount.id,
        toAccountId: houseActionForm.toAccountId,
        amount: parseFloat(houseActionForm.amount),
        reason: houseActionForm.reason,
      });
      toast.success(`Transfer of $${houseActionForm.amount} completed`);
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to transfer");
    }
  };

  const handleBankUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankUpdateForm.bankBalance) {
      toast.error("Bank balance is required");
      return;
    }
    
    try {
      await updateBankBalance(
        parseFloat(bankUpdateForm.bankBalance),
        bankUpdateForm.bankAccountRef || undefined,
        bankUpdateForm.notes || undefined,
      );
      toast.success("Bank balance updated");
      closeModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update bank balance");
    }
  };

  const closeModal = () => {
    setShowHouseAction(null);
    setSelectedAccount(null);
    setHouseActionForm({ amount: '', toAccountId: '', bankReference: '', reason: '' });
    setBankUpdateForm({ bankBalance: '', bankAccountRef: '', notes: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'CRITICAL': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'HOUSE_PROFIT': return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' };
      case 'OPERATING_CAPITAL': return { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' };
      case 'CLEARING': return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
      case 'FEE_COLLECTION': return { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.3)', text: '#ec4899' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280' };
    }
  };

  // Calculate totals (excluding deprecated RESERVE_FUND)
  const activeAccounts = houseAccounts.filter(a => a.type !== 'RESERVE_FUND');
  const totalHouseBalance = activeAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

  if (layoutLoading) {
    return <div className="financial-management"><div className="loading-state"><RefreshCw className="spinner" /><p>Loading...</p></div></div>;
  }

  return (
    <div className="financial-management">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={28} /> System / House Accounts
        </h1>
        <p>User funds, settlement profits, winner payouts, and loser collection management</p>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <PieChart size={16} /> Overview
        </button>
        <button className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
          <Wallet size={16} /> House Accounts
        </button>
        <button className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`} onClick={() => setActiveTab('bank')}>
          <Banknote size={16} /> Bank & Reserve
        </button>
        <button className={`tab-btn ${activeTab === 'settlements' ? 'active' : ''}`} onClick={() => setActiveTab('settlements')}>
          <BarChart3 size={16} /> Settlements
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spinner" />
          <p>Loading house accounts data...</p>
        </div>
      ) : (
        <div className="content-section">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <Banknote size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Bank Balance</p>
                  <p style={{ color: '#10b981', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                    ${parseFloat(String(reserveStatus?.bankBalance || 0)).toLocaleString()}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>External bank account</p>
                </div>

                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <Building2 size={32} color="#60a5fa" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Total House Funds</p>
                  <p style={{ color: '#60a5fa', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                    ${totalHouseBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>Across {activeAccounts.length} accounts</p>
                </div>

                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <DollarSign size={32} color="#ef4444" style={{ marginBottom: '0.5rem' }} />
                  <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>User Liabilities</p>
                  <p style={{ color: '#ef4444', fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                    ${parseFloat(String(reserveStatus?.totalUserLiabilities || 0)).toLocaleString()}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>Owed to users</p>
                </div>

                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <Shield size={32} color={getStatusColor(reserveStatus?.status || 'HEALTHY')} style={{ marginBottom: '0.5rem' }} />
                  <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>Reserve Ratio</p>
                  <p style={{ color: getStatusColor(reserveStatus?.status || 'HEALTHY'), fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                    {((parseFloat(String(reserveStatus?.reserveRatio || 1))) * 100).toFixed(1)}%
                  </p>
                  <span style={{
                    backgroundColor: getStatusColor(reserveStatus?.status || 'HEALTHY'),
                    color: '#fff',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                  }}>
                    {reserveStatus?.status || 'UNKNOWN'}
                  </span>
                </div>
              </div>

              {/* House Accounts Summary */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Wallet size={20} /> House Accounts Summary
                  </h2>
                  <button onClick={() => setActiveTab('accounts')} style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}>
                    Manage Accounts →
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {houseAccounts.filter(a => a.type !== 'RESERVE_FUND').map(account => {
                    const colors = getAccountColor(account.type);
                    return (
                      <div key={account.id} style={{
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        padding: '1rem',
                      }}>
                        <p style={{ color: '#9ca3af', margin: '0 0 0.25rem 0', fontSize: '0.8rem' }}>
                          {account.type.replace(/_/g, ' ')}
                        </p>
                        <p style={{ color: colors.text, fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                          ${parseFloat(account.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Platform Fund Management */}
              <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid #a855f7' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7' }}>
                  🏦 Platform Fund Management
                </h2>
                <p style={{ color: '#d1d5db', margin: '0.5rem 0 1rem 0', fontSize: '0.9rem' }}>
                  <strong>OPERATING CAPITAL</strong> is the treasury - the <strong>only account</strong> connected to your external bank. 
                  Solvency is ensured by maintaining <strong>Bank Balance ≥ 120% of User Liabilities</strong>.
                </p>
                
                <div style={{ 
                  backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}>
                  <div style={{ fontSize: '2rem' }}>🏦</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#a855f7', fontWeight: '600', margin: 0 }}>External Bank → OPERATING CAPITAL → Platform Accounts</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                      Owner withdraws profit: HOUSE_PROFIT → OPERATING CAPITAL → Bank (if Reserve Ratio stays ≥120%)
                    </p>
                  </div>
                </div>

                <h3 style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>Platform Accounts:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(168, 85, 247, 0.05)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                    <p style={{ color: '#a855f7', fontWeight: '600', margin: '0 0 0.5rem 0' }}>💰 OPERATING CAPITAL (Treasury)</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Bank-connected. Receives user deposits, pays user withdrawals, disburses winner payouts.</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <p style={{ color: '#10b981', fontWeight: '600', margin: '0 0 0.5rem 0' }}>📈 HOUSE PROFIT</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Profits from round settlements (loser collection - winner payouts). Owner can withdraw to bank.</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(236, 72, 153, 0.05)', borderRadius: '8px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                    <p style={{ color: '#ec4899', fontWeight: '600', margin: '0 0 0.5rem 0' }}>💳 FEE COLLECTION</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Platform fees (2%) collected each round. Transfer to Operating Capital to withdraw.</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <p style={{ color: '#f59e0b', fontWeight: '600', margin: '0 0 0.5rem 0' }}>⚡ CLEARING</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Temporary holding during round settlements. Should be ~$0 after settlement completes.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* HOUSE ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Wallet size={20} /> House Accounts Management
                    </h2>
                    <p style={{ color: '#9ca3af', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                      Treasury Model: Only <strong style={{ color: '#a855f7' }}>OPERATING CAPITAL</strong> connects to external bank
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.85rem' }}>Total Balance</p>
                    <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                      ${totalHouseBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                  {houseAccounts.filter(a => a.type !== 'RESERVE_FUND').map(account => {
                    const colors = getAccountColor(account.type);
                    const balance = parseFloat(account.balance || '0');
                    return (
                      <div key={account.id} style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        borderLeft: `4px solid ${colors.text}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <p style={{ color: colors.text, fontWeight: '600', margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>
                              {account.type.replace(/_/g, ' ')}
                              {account.type === 'OPERATING_CAPITAL' && (
                                <span style={{ 
                                  backgroundColor: '#a855f7', 
                                  color: '#fff', 
                                  fontSize: '0.6rem', 
                                  padding: '0.15rem 0.4rem', 
                                  borderRadius: '3px', 
                                  marginLeft: '0.5rem',
                                  verticalAlign: 'middle',
                                }}>
                                  🏦 TREASURY
                                </span>
                              )}
                            </p>
                            <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0, fontFamily: 'monospace' }}>{account.id}</p>
                          </div>
                          <span style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                          }}>
                            {account.stats?.transactionCount || 0} transactions
                          </span>
                        </div>

                        <p style={{ 
                          color: balance >= 0 ? '#10b981' : '#ef4444', 
                          fontSize: '2rem', 
                          fontWeight: 'bold', 
                          margin: '0 0 1.5rem 0' 
                        }}>
                          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>

                        {/* Action Buttons - Treasury Model: Only OPERATING_CAPITAL connects to bank */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {account.type === 'OPERATING_CAPITAL' ? (
                            <>
                              {/* OPERATING_CAPITAL (Treasury) - Bank operations */}
                              <button
                                onClick={() => { setSelectedAccount(account); setShowHouseAction('deposit'); }}
                                style={{
                                  flex: 1,
                                  minWidth: '100px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  color: '#10b981',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                }}
                              >
                                <Upload size={16} /> From Bank
                              </button>
                              <button
                                onClick={() => { setSelectedAccount(account); setShowHouseAction('withdraw'); }}
                                disabled={balance <= 0}
                                style={{
                                  flex: 1,
                                  minWidth: '100px',
                                  backgroundColor: balance > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                  border: `1px solid ${balance > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                                  color: balance > 0 ? '#ef4444' : '#6b7280',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  cursor: balance > 0 ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                }}
                              >
                                <Download size={16} /> To Bank
                              </button>
                              <button
                                onClick={() => { setSelectedAccount(account); setShowHouseAction('transfer'); }}
                                disabled={balance <= 0}
                                style={{
                                  flex: 1,
                                  minWidth: '100px',
                                  backgroundColor: balance > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                  border: `1px solid ${balance > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                                  color: balance > 0 ? '#60a5fa' : '#6b7280',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  cursor: balance > 0 ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                }}
                              >
                                <Send size={16} /> Transfer
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Other accounts - Internal transfers only */}
                              <button
                                onClick={() => { 
                                  setSelectedAccount(account); 
                                  setShowHouseAction('transfer');
                                  // Pre-select OPERATING_CAPITAL as destination
                                  const operatingAccount = houseAccounts.find(a => a.type === 'OPERATING_CAPITAL');
                                  if (operatingAccount) {
                                    setHouseActionForm(prev => ({ ...prev, toAccountId: operatingAccount.id }));
                                  }
                                }}
                                disabled={balance <= 0}
                                style={{
                                  flex: 2,
                                  backgroundColor: balance > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                  border: `1px solid ${balance > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                                  color: balance > 0 ? '#60a5fa' : '#6b7280',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  cursor: balance > 0 ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                }}
                              >
                                <Send size={16} /> Transfer to Operating
                              </button>
                              <button
                                onClick={() => { setSelectedAccount(account); setShowHouseAction('transfer'); }}
                                disabled={balance <= 0}
                                style={{
                                  flex: 1,
                                  backgroundColor: balance > 0 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                  border: `1px solid ${balance > 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                                  color: balance > 0 ? '#a78bfa' : '#6b7280',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  cursor: balance > 0 ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                }}
                              >
                                <RefreshCw size={16} /> Other
                              </button>
                            </>
                          )}
                        </div>
                        
                        {/* Info text for non-treasury accounts */}
                        {account.type !== 'OPERATING_CAPITAL' && (
                          <p style={{ 
                            color: '#6b7280', 
                            fontSize: '0.7rem', 
                            margin: '0.75rem 0 0 0',
                            fontStyle: 'italic',
                          }}>
                            💡 To withdraw to bank: Transfer to Operating Capital first
                          </p>
                        )}

                        {/* Recent Transactions */}
                        {account.recentTransactions && account.recentTransactions.length > 0 && (
                          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '1.5rem', paddingTop: '1rem' }}>
                            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <History size={12} /> Recent Activity
                            </p>
                            {account.recentTransactions.slice(0, 3).map((tx: any, idx: number) => (
                              <div key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '0.5rem 0',
                                borderBottom: idx < 2 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                              }}>
                                <div>
                                  <p style={{ color: '#d1d5db', margin: 0, fontSize: '0.8rem' }}>
                                    {tx.description?.substring(0, 35)}{tx.description?.length > 35 ? '...' : ''}
                                  </p>
                                  <p style={{ color: '#6b7280', margin: 0, fontSize: '0.7rem' }}>
                                    {new Date(tx.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span style={{ 
                                  color: tx.direction === 'CREDIT' ? '#10b981' : '#ef4444',
                                  fontWeight: '600',
                                  fontSize: '0.9rem',
                                }}>
                                  {tx.direction === 'CREDIT' ? '+' : '-'}${parseFloat(tx.amount || '0').toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* BANK & RESERVE TAB */}
          {activeTab === 'bank' && (
            <>
              {/* Bank Balance Card */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Banknote size={20} /> External Bank Balance
                    </h2>
                    <p style={{ color: '#9ca3af', margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
                      Your actual bank account balance - update this to match your bank statement
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHouseAction('bank-update')}
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
                    <RefreshCw size={16} /> Update Bank Balance
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '2rem' }}>
                  <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                    <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0' }}>Bank Balance</p>
                    <p style={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
                      ${parseFloat(String(reserveStatus?.bankBalance || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                    <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0' }}>User Liabilities</p>
                    <p style={{ color: '#ef4444', fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
                      ${parseFloat(String(reserveStatus?.totalUserLiabilities || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: `rgba(${reserveStatus?.status === 'HEALTHY' ? '16, 185, 129' : reserveStatus?.status === 'WARNING' ? '245, 158, 11' : '239, 68, 68'}, 0.1)`, borderRadius: '12px' }}>
                    <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0' }}>Reserve Ratio</p>
                    <p style={{ color: getStatusColor(reserveStatus?.status || 'HEALTHY'), fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
                      {((parseFloat(String(reserveStatus?.reserveRatio || 1))) * 100).toFixed(1)}%
                    </p>
                    <span style={{
                      backgroundColor: getStatusColor(reserveStatus?.status || 'HEALTHY'),
                      color: '#fff',
                      padding: '0.375rem 1rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}>
                      {reserveStatus?.status || 'UNKNOWN'}
                    </span>
                  </div>
                </div>

                {(reserveStatus as any)?.isWithdrawalsLocked && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                    <p style={{ color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} /> Withdrawals are currently LOCKED due to low reserve ratio
                    </p>
                  </div>
                )}
              </div>

              {/* Bank Snapshot History */}
              <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={20} /> Bank Balance History
                </h2>
                <div className="table-container" style={{ marginTop: '1rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Bank Balance</th>
                        <th>User Liabilities</th>
                        <th>Reserve Ratio</th>
                        <th>Reference</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankSnapshots.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                            No bank snapshots yet
                          </td>
                        </tr>
                      ) : (
                        bankSnapshots.map((snapshot: any) => (
                          <tr key={snapshot.id}>
                            <td>{new Date(snapshot.createdAt).toLocaleString()}</td>
                            <td style={{ color: '#10b981', fontWeight: '600' }}>
                              ${parseFloat(snapshot.bankBalance || 0).toLocaleString()}
                            </td>
                            <td style={{ color: '#ef4444' }}>
                              ${parseFloat(snapshot.totalUserLiabilities || 0).toLocaleString()}
                            </td>
                            <td>
                              <span style={{
                                color: parseFloat(snapshot.reserveRatio || 0) >= 1.2 ? '#10b981' : '#f59e0b',
                              }}>
                                {(parseFloat(snapshot.reserveRatio || 0) * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{snapshot.bankAccountRef || '-'}</td>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{snapshot.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SETTLEMENTS TAB */}
          {activeTab === 'settlements' && (
            <>
              {/* Settlement Summary */}
              {settlementSummary && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} /> Settlement Analytics
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                      <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Total Rounds</p>
                      <p style={{ color: '#10b981', fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                        {settlementSummary.totalSettlements}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                      <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Total Volume</p>
                      <p style={{ color: '#60a5fa', fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                        ${parseFloat(String(settlementSummary.totalPool || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px' }}>
                      <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>Paid to Winners</p>
                      <p style={{ color: '#a855f7', fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                        ${parseFloat(String(settlementSummary.totalPayouts || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                      <p style={{ color: '#9ca3af', margin: '0 0 0.5rem 0', fontSize: '0.85rem' }}>House Profit</p>
                      <p style={{ color: '#f59e0b', fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                        ${parseFloat(String(settlementSummary.totalHouseProfit || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <p style={{ color: '#fff', fontWeight: '500', margin: '0 0 0.5rem 0' }}>Today</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#d1d5db' }}>{settlementSummary.today?.settlements || 0} rounds settled</span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                          +${parseFloat(String(settlementSummary.today?.profit || 0)).toFixed(2)} profit
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                      <p style={{ color: '#fff', fontWeight: '500', margin: '0 0 0.5rem 0' }}>This Week</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#d1d5db' }}>{settlementSummary.thisWeek?.settlements || 0} rounds settled</span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                          +${parseFloat(String(settlementSummary.thisWeek?.profit || 0)).toFixed(2)} profit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement History */}
              <div className="card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={20} /> Settlement History
                </h2>
                <div className="table-container" style={{ marginTop: '1rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Pool</th>
                        <th>Payouts</th>
                        <th>Fees</th>
                        <th>Profit</th>
                        <th>Bets (W/L)</th>
                        <th>Settled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlements.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                            No settlements found. Settlements are created when rounds complete.
                          </td>
                        </tr>
                      ) : (
                        settlements.map(s => (
                          <tr key={s.id}>
                            <td>
                              <span style={{ fontWeight: '600', color: '#fff' }}>#{s.roundNumber}</span>
                              {s.round?.indecisionTriggered && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                  color: '#a855f7',
                                  padding: '0.125rem 0.375rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                }}>INDECISION</span>
                              )}
                            </td>
                            <td>${parseFloat(String(s.totalPool || 0)).toFixed(2)}</td>
                            <td style={{ color: '#ef4444' }}>-${parseFloat(String(s.totalPayouts || 0)).toFixed(2)}</td>
                            <td style={{ color: '#f59e0b' }}>${parseFloat(String(s.houseFee || 0)).toFixed(2)}</td>
                            <td style={{ 
                              color: parseFloat(String(s.houseProfit || 0)) >= 0 ? '#10b981' : '#ef4444',
                              fontWeight: '600',
                            }}>
                              {parseFloat(String(s.houseProfit || 0)) >= 0 ? '+' : ''}${parseFloat(String(s.houseProfit || 0)).toFixed(2)}
                            </td>
                            <td>
                              <span style={{ color: '#10b981' }}>{s.winningBets}</span>
                              <span style={{ color: '#6b7280' }}>/</span>
                              <span style={{ color: '#ef4444' }}>{s.losingBets}</span>
                            </td>
                            <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                              {new Date(s.settledAt).toLocaleString()}
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
        </div>
      )}

      {/* Action Modals */}
      {showHouseAction && (showHouseAction === 'bank-update' || selectedAccount) && (
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
            maxWidth: '480px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            {showHouseAction === 'bank-update' ? (
              <>
                <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>Update Bank Balance</h3>
                <p style={{ color: '#9ca3af', margin: '0 0 1.5rem 0', fontSize: '0.85rem' }}>
                  Enter the current balance shown in your bank account
                </p>
                <form onSubmit={handleBankUpdate}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                      Bank Balance (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={bankUpdateForm.bankBalance}
                      onChange={(e) => setBankUpdateForm({ ...bankUpdateForm, bankBalance: e.target.value })}
                      placeholder="50000.00"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        fontSize: '1.1rem',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                      Bank Account Reference
                    </label>
                    <input
                      type="text"
                      value={bankUpdateForm.bankAccountRef}
                      onChange={(e) => setBankUpdateForm({ ...bankUpdateForm, bankAccountRef: e.target.value })}
                      placeholder="Account ending in 1234"
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
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                      Notes
                    </label>
                    <input
                      type="text"
                      value={bankUpdateForm.notes}
                      onChange={(e) => setBankUpdateForm({ ...bankUpdateForm, notes: e.target.value })}
                      placeholder="Monthly reconciliation"
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
                    <button type="button" onClick={closeModal} style={{
                      flex: 1, padding: '0.75rem', borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer',
                    }}>Cancel</button>
                    <button type="submit" style={{
                      flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none',
                      backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: '500',
                    }}>Update Balance</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>
                  {showHouseAction === 'deposit' && `💰 Deposit from Bank → ${selectedAccount?.type.replace(/_/g, ' ')}`}
                  {showHouseAction === 'withdraw' && `🏦 Withdraw to Bank ← ${selectedAccount?.type.replace(/_/g, ' ')}`}
                  {showHouseAction === 'transfer' && `🔄 Internal Transfer from ${selectedAccount?.type.replace(/_/g, ' ')}`}
                </h3>
                <p style={{ color: '#9ca3af', margin: '0 0 1.5rem 0', fontSize: '0.85rem' }}>
                  {selectedAccount?.type === 'OPERATING_CAPITAL' 
                    ? '📍 Treasury Account - connects to external bank'
                    : '📍 Internal account - transfer to Operating Capital to withdraw'}
                  <br />
                  Current Balance: ${parseFloat(selectedAccount?.balance || '0').toLocaleString()}
                </p>
                <form onSubmit={
                  showHouseAction === 'deposit' ? handleHouseDeposit :
                  showHouseAction === 'withdraw' ? handleHouseWithdraw :
                  handleHouseTransfer
                }>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                      Amount (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={showHouseAction !== 'deposit' ? parseFloat(selectedAccount?.balance || '0') : undefined}
                      required
                      value={houseActionForm.amount}
                      onChange={(e) => setHouseActionForm({ ...houseActionForm, amount: e.target.value })}
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

                  {showHouseAction === 'transfer' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                        Transfer To *
                      </label>
                      <select
                        required
                        value={houseActionForm.toAccountId}
                        onChange={(e) => setHouseActionForm({ ...houseActionForm, toAccountId: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          backgroundColor: '#1f2937',
                          color: '#fff',
                        }}
                      >
                        <option value="">Select destination account...</option>
                        {houseAccounts.filter(a => a.id !== selectedAccount?.id).map(a => (
                          <option key={a.id} value={a.id}>
                            {a.type.replace(/_/g, ' ')} (${parseFloat(a.balance).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(showHouseAction === 'deposit' || showHouseAction === 'withdraw') && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                        Bank Reference
                      </label>
                      <input
                        type="text"
                        value={houseActionForm.bankReference}
                        onChange={(e) => setHouseActionForm({ ...houseActionForm, bankReference: e.target.value })}
                        placeholder="Transaction ID, wire reference, etc."
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
                  )}

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                      Reason *
                    </label>
                    <input
                      type="text"
                      required
                      value={houseActionForm.reason}
                      onChange={(e) => setHouseActionForm({ ...houseActionForm, reason: e.target.value })}
                      placeholder="Brief description of this action"
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
                    <button type="button" onClick={closeModal} style={{
                      flex: 1, padding: '0.75rem', borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer',
                    }}>Cancel</button>
                    <button type="submit" style={{
                      flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none',
                      backgroundColor: showHouseAction === 'deposit' ? '#10b981' : showHouseAction === 'withdraw' ? '#ef4444' : '#3b82f6',
                      color: '#fff', cursor: 'pointer', fontWeight: '500',
                    }}>
                      {showHouseAction === 'deposit' && 'Record Deposit'}
                      {showHouseAction === 'withdraw' && 'Record Withdrawal'}
                      {showHouseAction === 'transfer' && 'Execute Transfer'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HouseAccountsPage() {
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
      <HouseAccountsContent />
    </Suspense>
  );
}
