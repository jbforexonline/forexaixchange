"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  User,
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trophy,
  XCircle,
  MinusCircle,
  DollarSign,
  Filter
} from 'lucide-react';
import {
  getRoundHistory,
  getBetHistory,
  getBetStats,
  type Bet
} from '@/lib/api/spin';

// Selection color mapping
const SELECTION_COLORS: Record<string, string> = {
  BUY: '#22c55e',
  SELL: '#ef4444',
  BLUE: '#3b82f6',
  RED: '#f97316',
  HIGH_VOL: '#8b5cf6',
  LOW_VOL: '#06b6d4',
  INDECISION: '#fbbf24'
};

const SELECTION_LABELS: Record<string, string> = {
  BUY: 'Buy',
  SELL: 'Sell',
  BLUE: 'Blue',
  RED: 'Red',
  HIGH_VOL: 'High Volatile',
  LOW_VOL: 'Low Volatile',
  INDECISION: 'Indecision'
};

const MARKET_LABELS: Record<string, string> = {
  OUTER: 'Direction',
  MIDDLE: 'Color',
  INNER: 'Volatility',
  GLOBAL: 'Indecision'
};

interface Round {
  id: string;
  roundNumber: number;
  state: string;
  openedAt: string;
  settledAt?: string;
  outerWinner?: string | null;
  middleWinner?: string | null;
  innerWinner?: string | null;
  indecisionTriggered?: boolean;
  totalVolume?: number;
  _count?: {
    bets: number;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UserStats {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  winRate: number;
  totalWagered: number;
  totalWon: number;
  profitLoss: number;
}

const WinnerBadge: React.FC<{ selection: string | null; tied?: boolean }> = ({ selection, tied }) => {
  if (!selection) return <span className="no-winner">-</span>;
  
  return (
    <span 
      className={`winner-badge ${tied ? 'tied' : ''}`}
      style={{ 
        backgroundColor: `${SELECTION_COLORS[selection]}20`,
        color: SELECTION_COLORS[selection],
        borderColor: SELECTION_COLORS[selection]
      }}
    >
      {SELECTION_LABELS[selection] || selection}
      {tied && <span className="tie-indicator">TIE</span>}
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WON': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'LOST': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'ACCEPTED': return { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' };
      case 'CANCELLED': return { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' };
      default: return { bg: 'rgba(100, 200, 255, 0.15)', color: '#64c8ff', border: 'rgba(100, 200, 255, 0.3)' };
    }
  };
  
  const colors = getStatusColor(status);
  
  return (
    <span 
      className="status-badge"
      style={{ 
        backgroundColor: colors.bg,
        color: colors.color,
        borderColor: colors.border
      }}
    >
      {status === 'WON' && <Trophy size={12} />}
      {status === 'LOST' && <XCircle size={12} />}
      {status === 'ACCEPTED' && <Clock size={12} />}
      {status === 'CANCELLED' && <MinusCircle size={12} />}
      {status}
    </span>
  );
};

export default function SpinHistoryPage() {
  const [activeTab, setActiveTab] = useState<'rounds' | 'personal'>('rounds');
  
  // Rounds state
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundsMeta, setRoundsMeta] = useState<PaginationMeta | null>(null);
  const [roundsPage, setRoundsPage] = useState(1);
  const [roundsLoading, setRoundsLoading] = useState(true);

  // Personal bets state
  const [bets, setBets] = useState<Bet[]>([]);
  const [betsMeta, setBetsMeta] = useState<PaginationMeta | null>(null);
  const [betsPage, setBetsPage] = useState(1);
  const [betsLoading, setBetsLoading] = useState(true);
  
  // User stats
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  
  // Filter state for personal history
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    setRoundsLoading(true);
    try {
      const response = await getRoundHistory(roundsPage, 20);
      // Handle response format - could be { data: [...], meta: {...} } or just the envelope
      const payload = response?.data ?? response;
      setRounds(Array.isArray(payload) ? payload : payload?.data || []);
      setRoundsMeta(payload?.meta || response?.meta || null);
    } catch (error) {
      console.error('Error fetching rounds:', error);
    } finally {
      setRoundsLoading(false);
    }
  }, [roundsPage]);

  const fetchBets = useCallback(async () => {
    setBetsLoading(true);
    try {
      const response = await getBetHistory(betsPage, 20);
      // Handle response format
      const payload = response?.data ?? response;
      let betsData = Array.isArray(payload) ? payload : payload?.data || [];
      
      // Apply client-side filter if set
      if (statusFilter) {
        betsData = betsData.filter((bet: Bet) => bet.status === statusFilter);
      }
      
      setBets(betsData);
      setBetsMeta(payload?.meta || response?.meta || null);
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setBetsLoading(false);
    }
  }, [betsPage, statusFilter]);

  const fetchUserStats = useCallback(async () => {
    try {
      const stats = await getBetStats();
      const payload = stats?.data ?? stats;
      setUserStats(payload);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rounds') {
      fetchRounds();
    } else {
      // Fetch both rounds and bets for personal history to show outcomes
      fetchRounds();
      fetchBets();
      fetchUserStats();
    }
  }, [activeTab, fetchRounds, fetchBets, fetchUserStats]);

  useEffect(() => {
    fetchBets();
  }, [statusFilter, fetchBets]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const Pagination: React.FC<{
    meta: PaginationMeta | null;
    currentPage: number;
    onPageChange: (page: number) => void;
  }> = ({ meta, currentPage, onPageChange }) => {
    if (!meta || meta.totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button 
          className="page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="page-info">
          Page {currentPage} of {meta.totalPages}
          <span className="total-items">({meta.total} items)</span>
        </span>
        <button 
          className="page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= meta.totalPages}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className="history-page">
      <div className="history-container">
        {/* Header */}
        <div className="history-header">
          <div className="header-left">
            <History size={32} className="header-icon" />
            <div>
              <h1>Spin History</h1>
              <p>View all spin results and your personal order history</p>
            </div>
          </div>
          <button 
            className="refresh-btn" 
            onClick={() => activeTab === 'rounds' ? fetchRounds() : fetchBets()}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'rounds' ? 'active' : ''}`}
            onClick={() => setActiveTab('rounds')}
          >
            <Globe size={18} />
            All Rounds History
          </button>
          <button 
            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <User size={18} />
            My Order History
          </button>
        </div>

        {/* Content */}
        {activeTab === 'rounds' ? (
          /* Rounds History */
          <div className="history-section">
            <div className="section-header">
              <h2>Round Results</h2>
              <p>Complete history of all settled rounds</p>
            </div>

            {roundsLoading ? (
              <div className="loading-state">
                <RefreshCw size={40} className="spinning" />
                <p>Loading rounds...</p>
              </div>
            ) : rounds.length === 0 ? (
              <div className="empty-state">
                <History size={60} />
                <h3>No Rounds Yet</h3>
                <p>Round history will appear here once rounds are completed.</p>
              </div>
            ) : (
              <>
                <div className="rounds-table-container">
                  <table className="rounds-table">
                    <thead>
                      <tr>
                        <th>Round #</th>
                        <th>Date</th>
                        <th>Direction Winner</th>
                        <th>Color Winner</th>
                        <th>Volatility Winner</th>
                        <th>Indecision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((round) => (
                        <tr key={round.id} className={round.state !== 'SETTLED' ? 'pending-row' : ''}>
                          <td className="round-number">#{round.roundNumber}</td>
                          <td className="date-cell">
                            {round.settledAt ? formatDate(round.settledAt) : formatDate(round.openedAt)}
                          </td>
                          <td>
                            <WinnerBadge selection={round.outerWinner || null} />
                          </td>
                          <td>
                            <WinnerBadge selection={round.middleWinner || null} />
                          </td>
                          <td>
                            <WinnerBadge selection={round.innerWinner || null} />
                          </td>
                          <td>
                            {round.indecisionTriggered ? (
                              <span className="indecision-triggered">YES</span>
                            ) : (
                              <span className="no-indecision">NO</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination 
                  meta={roundsMeta} 
                  currentPage={roundsPage} 
                  onPageChange={setRoundsPage} 
                />
              </>
            )}
          </div>
        ) : (
          /* Personal History */
          <div className="history-section">
            {/* Personal Stats Summary */}
            {userStats && (
              <div className="stats-summary">
                <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#3b82f6' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Total Orders</span>
                    <span className="stat-value">{userStats.totalBets}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#22c55e' }}>
                    <Trophy size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Won</span>
                    <span className="stat-value">{userStats.wonBets}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#ef4444' }}>
                    <XCircle size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Lost</span>
                    <span className="stat-value">{userStats.lostBets}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#fbbf24' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">{userStats.winRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ color: userStats.profitLoss >= 0 ? '#22c55e' : '#ef4444' }}>
                    <DollarSign size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Profit/Loss</span>
                    <span className="stat-value" style={{ color: userStats.profitLoss >= 0 ? '#22c55e' : '#ef4444' }}>
                      {userStats.profitLoss >= 0 ? '+' : ''}${Number(userStats.profitLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="section-header">
              <div>
                <h2>Your Orders</h2>
                <p>Complete history of your orders and outcomes</p>
              </div>
              <div className="filter-section">
                <Filter size={16} />
                <select 
                  value={statusFilter || ''} 
                  onChange={(e) => setStatusFilter(e.target.value || null)}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                  <option value="ACCEPTED">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            {betsLoading ? (
              <div className="loading-state">
                <RefreshCw size={40} className="spinning" />
                <p>Loading your orders...</p>
              </div>
            ) : bets.length === 0 ? (
              <div className="empty-state">
                <User size={60} />
                <h3>No Orders Yet</h3>
                <p>Your order history will appear here once you start placing orders.</p>
              </div>
            ) : (
              <>
                <div className="bets-table-container">
                  <table className="bets-table">
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Date</th>
                        <th>Market</th>
                        <th>Your Selection</th>
                        <th>Outcome</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payout</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map((bet) => {
                        // Find the round to get the winner for this market
                        const round = rounds.find(r => r.roundNumber === bet.round?.roundNumber);
                        let outcome: string | null = null;
                        
                        if (bet.status !== 'ACCEPTED' && bet.status !== 'CANCELLED') {
                          if (bet.market === 'OUTER') outcome = round?.outerWinner || null;
                          else if (bet.market === 'MIDDLE') outcome = round?.middleWinner || null;
                          else if (bet.market === 'INNER') outcome = round?.innerWinner || null;
                          else if (bet.market === 'GLOBAL') outcome = round?.indecisionTriggered ? 'INDECISION' : null;
                        }
                        
                        return (
                          <tr key={bet.id} className={bet.status === 'ACCEPTED' ? 'pending-row' : ''}>
                            <td className="round-number">
                              #{bet.round?.roundNumber || '-'}
                            </td>
                            <td className="date-cell">{formatDate(bet.createdAt)}</td>
                            <td className="market-cell">{MARKET_LABELS[bet.market] || bet.market}</td>
                            <td>
                              <WinnerBadge selection={bet.selection} />
                            </td>
                            <td>
                              {outcome ? (
                                <WinnerBadge selection={outcome} />
                              ) : (
                                <span className="no-winner">
                                  {bet.status === 'ACCEPTED' ? 'Pending' : '-'}
                                </span>
                              )}
                            </td>
                            <td className="amount-cell">
                              ${Number(bet.amountUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td>
                              <StatusBadge status={bet.status} />
                            </td>
                            <td className="payout-cell">
                              {bet.payoutAmount !== null && bet.payoutAmount !== undefined
                                ? `$${Number(bet.payoutAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                            <td className={`profit-cell ${bet.profitAmount !== null && bet.profitAmount !== undefined ? (Number(bet.profitAmount) >= 0 ? 'profit' : 'loss') : ''}`}>
                              {bet.profitAmount !== null && bet.profitAmount !== undefined
                                ? `${Number(bet.profitAmount) >= 0 ? '+' : ''}$${Number(bet.profitAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination 
                  meta={betsMeta} 
                  currentPage={betsPage} 
                  onPageChange={setBetsPage} 
                />
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .history-page {
          min-height: calc(100vh - 80px);
          background: linear-gradient(135deg, #0a1628 0%, #0f2744 50%, #0a1628 100%);
          padding: 2rem;
        }

        .history-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          color: #64c8ff;
        }

        .header-left h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .header-left p {
          color: rgba(165, 213, 255, 0.7);
          margin: 0.25rem 0 0 0;
          font-size: 0.9rem;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          border-radius: 8px;
          color: #64c8ff;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: rgba(100, 200, 255, 0.2);
        }

        .tab-switcher {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: rgba(15, 39, 68, 0.4);
          padding: 0.5rem;
          border-radius: 10px;
          width: fit-content;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(165, 213, 255, 0.7);
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(100, 200, 255, 0.1);
        }

        .tab-btn.active {
          background: rgba(100, 200, 255, 0.2);
          color: #64c8ff;
        }

        .history-section {
          background: rgba(15, 39, 68, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.15);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .section-header h2 {
          color: #ffffff;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .section-header p {
          color: rgba(165, 213, 255, 0.6);
          font-size: 0.85rem;
          margin: 0.25rem 0 0 0;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(165, 213, 255, 0.7);
        }

        .filter-select {
          padding: 0.5rem 1rem;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #ffffff;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .filter-select option {
          background: #0f2744;
        }

        .stats-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(100, 200, 255, 0.05);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 10px;
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(100, 200, 255, 0.1);
          border-radius: 8px;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          color: rgba(165, 213, 255, 0.6);
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .stat-value {
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .rounds-table-container,
        .bets-table-container {
          overflow-x: auto;
          margin-bottom: 1rem;
        }

        .rounds-table,
        .bets-table {
          width: 100%;
          border-collapse: collapse;
        }

        .rounds-table th,
        .rounds-table td,
        .bets-table th,
        .bets-table td {
          padding: 0.875rem 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(100, 200, 255, 0.1);
        }

        .rounds-table th,
        .bets-table th {
          color: rgba(165, 213, 255, 0.7);
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .rounds-table td,
        .bets-table td {
          color: #ffffff;
          font-size: 0.9rem;
        }

        .rounds-table tr:hover,
        .bets-table tr:hover {
          background: rgba(100, 200, 255, 0.05);
        }

        .pending-row {
          opacity: 0.7;
        }

        .round-number {
          font-weight: 600;
          color: #64c8ff;
        }

        .date-cell {
          color: rgba(165, 213, 255, 0.7);
          font-size: 0.85rem;
        }

        .market-cell {
          font-size: 0.8rem;
          color: rgba(165, 213, 255, 0.8);
          text-transform: uppercase;
        }

        .amount-cell,
        .payout-cell {
          font-family: monospace;
        }

        .profit-cell {
          font-family: monospace;
          font-weight: 600;
        }

        .profit-cell.profit {
          color: #22c55e;
        }

        .profit-cell.loss {
          color: #ef4444;
        }

        .winner-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
          border: 1px solid;
        }

        .winner-badge.tied {
          position: relative;
        }

        .tie-indicator {
          font-size: 0.6rem;
          margin-left: 0.25rem;
          opacity: 0.8;
        }

        .no-winner {
          color: rgba(165, 213, 255, 0.4);
        }

        .indecision-triggered {
          color: #fbbf24;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .no-indecision {
          color: rgba(165, 213, 255, 0.4);
          font-size: 0.8rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid;
          text-transform: uppercase;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding-top: 1rem;
        }

        .page-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.2);
          border-radius: 6px;
          color: #64c8ff;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) {
          background: rgba(100, 200, 255, 0.2);
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          color: rgba(165, 213, 255, 0.8);
          font-size: 0.9rem;
        }

        .total-items {
          color: rgba(165, 213, 255, 0.5);
          font-size: 0.8rem;
          margin-left: 0.5rem;
        }

        .loading-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          color: rgba(165, 213, 255, 0.6);
          text-align: center;
        }

        .loading-state p,
        .empty-state p {
          margin: 1rem 0 0 0;
        }

        .empty-state h3 {
          color: #ffffff;
          margin: 1rem 0 0.5rem 0;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .history-page {
            padding: 1rem;
          }

          .history-header {
            flex-direction: column;
          }

          .header-left h1 {
            font-size: 1.5rem;
          }

          .tab-switcher {
            width: 100%;
          }

          .tab-btn {
            flex: 1;
            justify-content: center;
            padding: 0.75rem 0.5rem;
            font-size: 0.8rem;
          }

          .stats-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .rounds-table th,
          .rounds-table td,
          .bets-table th,
          .bets-table td {
            padding: 0.5rem;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
