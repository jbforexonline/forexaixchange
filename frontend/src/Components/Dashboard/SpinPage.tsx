"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import "../Styles/SpinPage.scss";
import SpinWheel from "../Spin/SpinWheel";
import RecentSpinsTable from "../Spin/RecentSpinsTable";
import { useRound } from "@/hooks/useRound";
import { useWallet } from "@/hooks/useWallet";
import { getCurrentRoundBets, placeBet, isPremiumUser, getBetHistory } from "@/lib/api/spin";
import type { Bet, BetMarket, BetSelection } from "@/lib/api/spin";
import { getWebSocketClient, initWebSocket } from "@/lib/websocket";
import { getCurrentUser, logout } from "@/lib/auth";
import { 
  Wallet, 
  Settings, 
  Crown, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  PlayCircle,
  TestTube,
  Clock,
  CalendarClock,
  Home,
  History,
  BarChart3,
  AppWindow,
  BookOpen,
  ArrowUpCircle,
  ArrowDownCircle,
  FileText,
  ChevronUp
} from "lucide-react";
import { useDemo } from "@/context/DemoContext";

type MarketOption = {
  market: BetMarket;
  selection: BetSelection;
  label: string;
  icon: string;
  color: string;
};

const MARKET_OPTIONS: MarketOption[] = [
  { market: 'OUTER', selection: 'BUY', label: 'BUY', icon: '▲', color: '#22c55e' },
  { market: 'OUTER', selection: 'SELL', label: 'SELL', icon: '▼', color: '#ef4444' },
  { market: 'MIDDLE', selection: 'BLUE', label: 'BLUE', icon: '●', color: '#3b82f6' },
  { market: 'MIDDLE', selection: 'RED', label: 'RED', icon: '●', color: '#ef4444' },
  { market: 'INNER', selection: 'HIGH_VOL', label: 'HIGH', icon: '⚡', color: '#f59e0b' },
  { market: 'INNER', selection: 'LOW_VOL', label: 'LOW', icon: '◆', color: '#06b6d4' },
  { market: 'GLOBAL', selection: 'INDECISION', label: 'INDECISION', icon: '◈', color: '#fbbf24' },
];

// Round duration options for premium users (in minutes)
const ROUND_DURATIONS = [5, 10, 15, 20];

export default function SpinPage() {
  const router = useRouter();
  const { round, totals, state: roundState, countdown, timeUntilFreeze, loading, error } = useRound();
  const { wallet, refresh: refreshWallet } = useWallet();
  const { isDemo, toggleDemo } = useDemo();
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [selectedOption, setSelectedOption] = useState<MarketOption>(MARKET_OPTIONS[0]);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betSuccess, setBetSuccess] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBetAmount, setPendingBetAmount] = useState<number | null>(null);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [ticketTab, setTicketTab] = useState<'active' | 'previous'>('active');
  const [previousBets, setPreviousBets] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Premium features state
  const [selectedRoundDuration, setSelectedRoundDuration] = useState<number>(20);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [scheduledRounds, setScheduledRounds] = useState<number>(0); // 0 = no scheduling
  
  // Navigation menu state
  const [activeNavPopup, setActiveNavPopup] = useState<string | null>(null);
  
  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeNavPopup && !target.closest('.nav-btn-wrapper')) {
        setActiveNavPopup(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeNavPopup]);
  
  const user = getCurrentUser();
  const isPremium = isPremiumUser();
  const maxBet = isPremium ? 200 : 1000;
  
  // Normal users always get 20-minute rounds
  const effectiveRoundDuration = isPremium ? selectedRoundDuration : 20;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  useEffect(() => {
    initWebSocket();
  }, []);

  useEffect(() => {
    if (round) {
      getCurrentRoundBets()
        .then(setUserBets)
        .catch(console.error);
    } else {
      setUserBets([]);
    }
  }, [round?.id]);

  useEffect(() => {
    const wsClient = getWebSocketClient();
    const unsubscribe = wsClient.on('betPlaced', () => {
      if (round) {
        getCurrentRoundBets()
          .then(setUserBets)
          .catch(console.error);
      }
    });
    return unsubscribe;
  }, [round?.id]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (betSuccess) {
      const timer = setTimeout(() => setBetSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [betSuccess]);

  useEffect(() => {
    if (betError) {
      const timer = setTimeout(() => setBetError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [betError]);

  const handlePlaceBet = async () => {
    if (!round || roundState !== 'open') {
      setBetError('Market is closed');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) {
      setBetError('Minimum order is $1');
      return;
    }

    if (amount > maxBet) {
      setBetError(`Maximum order is $${maxBet}`);
      return;
    }

    if (wallet && amount > wallet.available) {
      setBetError('Insufficient funds');
      return;
    }

    // Open in-app confirmation modal
    setPendingBetAmount(amount);
    setShowConfirmModal(true);
  };

  const handleConfirmPlaceBet = async () => {
    if (!round || roundState !== 'open' || pendingBetAmount == null) {
      setShowConfirmModal(false);
      return;
    }

    setIsPlacingBet(true);
    setBetError(null);

    try {
      // Close the modal immediately for a smooth UX (order continues in background)
      setShowConfirmModal(false);
      setPendingBetAmount(null);

      await placeBet({
        market: selectedOption.market,
        selection: selectedOption.selection,
        amountUsd: pendingBetAmount,
        idempotencyKey: `bet-${Date.now()}-${Math.random()}`,
        isDemo: isDemo,
      });

      setBetSuccess(`${isDemo ? '[DEMO] ' : ''}$${pendingBetAmount} on ${selectedOption.label}`);
      refreshWallet();
      
      // Refresh bets
      if (round) {
        const bets = await getCurrentRoundBets();
        setUserBets(bets);
      }
    } catch (err) {
      setBetError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setBetAmount(amount.toString());
  };

  const adjustAmount = (delta: number) => {
    const current = parseFloat(betAmount) || 0;
    const newAmount = Math.max(1, Math.min(maxBet, current + delta));
    setBetAmount(newAmount.toString());
  };

  // Extract winners from round data
  const winners = useMemo(() => {
    if (roundState !== 'settled' || !round) return undefined;
    
    if (round.indecisionTriggered) {
      return { indecision: true, outer: undefined, color: undefined, vol: undefined };
    }
    
    let vol: "HIGH" | "LOW" | undefined = undefined;
    if (round.innerWinner === "HIGH_VOL") vol = "HIGH";
    else if (round.innerWinner === "LOW_VOL") vol = "LOW";
    
    return {
      outer: round.outerWinner || undefined,
      color: round.middleWinner || undefined,
      vol: vol,
      indecision: false,
    };
  }, [roundState, round]);

  // Use full round countdown (total time until settlement) for the center timer.
  // Backend already enforces a 1-minute freeze (no market) via freezeAt,
  // and useRound exposes that through roundState/timeUntilFreeze for bet disabling.
  const displayCountdown = countdown;
  const canBet = roundState === 'open' && round && !isPlacingBet;

  // Calculate totals for display (ensure userBets is array)
  const betsArray = Array.isArray(userBets) ? userBets : [];
  const totalBets = betsArray.reduce((sum, bet) => sum + bet.amountUsd, 0);
  const potentialWin = totalBets * 2;

  const getTicketMarketLabel = (market: BetMarket) => {
    switch (market) {
      case 'OUTER':
        return 'Direction';
      case 'MIDDLE':
        return 'Color';
      case 'INNER':
        return 'Volatility';
      case 'GLOBAL':
        return 'Indecision';
      default:
        return market;
    }
  };

  const getTicketSelectionLabel = (selection: BetSelection) => {
    switch (selection) {
      case 'BUY':
        return 'Buy';
      case 'SELL':
        return 'Sell';
      case 'BLUE':
        return 'Blue';
      case 'RED':
        return 'Red';
      case 'HIGH_VOL':
        return 'High Volatile';
      case 'LOW_VOL':
        return 'Low Volatile';
      case 'INDECISION':
        return 'Indecision';
      default:
        return selection;
    }
  };

  return (
    <div className={`spin-gaming-container ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      {showConfirmModal && pendingBetAmount != null && (
        <div className="spin-confirm-overlay">
          <div className="spin-confirm-modal">
            <h2>Confirm Your Order</h2>
            <p className="subtitle">{isDemo ? 'Demo order' : 'Live order'}</p>
            <div className="details">
              <div className="row">
                <span className="label">Selection</span>
                <span className="value">{selectedOption.label}</span>
              </div>
              <div className="row">
                <span className="label">Amount</span>
                <span className="value">${pendingBetAmount.toFixed(2)}</span>
              </div>
              {round && (
                <div className="row">
                  <span className="label">Round</span>
                  <span className="value">#{round.roundNumber}</span>
                </div>
              )}
            </div>
            <p className="disclaimer">
              Once placed, this order cannot be cancelled for the current round.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={isPlacingBet}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmPlaceBet}
                disabled={isPlacingBet}
              >
                {isPlacingBet ? 'Placing…' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTicketsModal && (
        <div className="spin-tickets-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowTicketsModal(false);
        }}>
          <div className="spin-tickets-modal">
            <div className="tickets-header">
              <h2>My Tickets</h2>
              <button 
                className="close-btn"
                onClick={() => setShowTicketsModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="tickets-tabs">
              <button
                className={`tab-btn ${ticketTab === 'active' ? 'active' : ''}`}
                onClick={async () => {
                  setTicketTab('active');
                }}
              >
                Active
              </button>
              <button
                className={`tab-btn ${ticketTab === 'previous' ? 'active' : ''}`}
                onClick={async () => {
                  setTicketTab('previous');
                  if (previousBets.length === 0 && !loadingHistory) {
                    setLoadingHistory(true);
                    try {
                      const response = await getBetHistory(1, 20);
                      console.log('Bet history response:', response);
                      
                      // Handle different response structures
                      let bets = [];
                      if (Array.isArray(response)) {
                        bets = response;
                      } else if (response.data && Array.isArray(response.data)) {
                        bets = response.data;
                      } else if (response.bets && Array.isArray(response.bets)) {
                        bets = response.bets;
                      } else if (response.data?.bets && Array.isArray(response.data.bets)) {
                        bets = response.data.bets;
                      }
                      
                      setPreviousBets(bets);
                    } catch (error) {
                      console.error('Error loading bet history:', error);
                      setPreviousBets([]);
                    } finally {
                      setLoadingHistory(false);
                    }
                  }
                }}
              >
                Previous
              </button>
            </div>

            {/* Active Tickets */}
            {ticketTab === 'active' && (
              <div className="tickets-list">
                {betsArray.length === 0 ? (
                  <div className="empty-state">
                    You have no active tickets for this round yet.
                  </div>
                ) : (
                  betsArray.map((bet) => (
                    <div key={bet.id} className="ticket-row active-ticket">
                      <div className="ticket-main">
                        <span className="ticket-market">
                          {getTicketMarketLabel(bet.market)}
                        </span>
                        <span className="ticket-selection">
                          {getTicketSelectionLabel(bet.selection)}
                        </span>
                        <span className={`ticket-mode ${bet.isDemo ? 'demo' : 'live'}`}>
                          {bet.isDemo ? 'Demo' : 'Live'}
                        </span>
                      </div>
                      <div className="ticket-meta">
                        <span className="ticket-amount">
                          ${Number(bet.amountUsd || 0).toFixed(2)}
                        </span>
                        <span className="ticket-time">
                          {new Date(bet.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Previous Tickets */}
            {ticketTab === 'previous' && (
              <div className="tickets-list">
                {loadingHistory ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading history...</p>
                  </div>
                ) : !Array.isArray(previousBets) || previousBets.length === 0 ? (
                  <div className="empty-state">
                    No previous tickets found.
                  </div>
                ) : (
                  previousBets.map((bet) => {
                    const won = bet.status === 'WON';
                    const lost = bet.status === 'LOST';
                    const pending = bet.status === 'PENDING' || bet.status === 'ACCEPTED';
                    
                    return (
                      <div 
                        key={bet.id} 
                        className={`ticket-row previous-ticket ${won ? 'won' : lost ? 'lost' : 'pending'}`}
                      >
                        <div className="ticket-main">
                          <span className="ticket-market">
                            {getTicketMarketLabel(bet.market)}
                          </span>
                          <span className="ticket-selection">
                            {getTicketSelectionLabel(bet.selection)}
                          </span>
                          <span className={`ticket-status ${won ? 'won' : lost ? 'lost' : 'pending'}`}>
                            {won ? '✓ WON' : lost ? '✗ LOST' : '⏳ PENDING'}
                          </span>
                        </div>
                        <div className="ticket-meta">
                          <span className="ticket-amount">
                            ${Number(bet.amountUsd || 0).toFixed(2)}
                          </span>
                          {won && bet.winAmountUsd && (
                            <span className="ticket-win">
                              +${Number(bet.winAmountUsd).toFixed(2)}
                            </span>
                          )}
                          <span className="ticket-round">
                            Round #{bet.roundNumber || bet.round?.roundNumber || 'N/A'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="tickets-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowTicketsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Main Gaming Area */}
      <div className="spin-gaming-main">
        {/* Spin Wheel - Centered and Prominent */}
        <div className="wheel-area">
          {loading && !round && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          )}

          <SpinWheel 
            state={roundState} 
            countdownSec={displayCountdown} 
            winners={winners}
            roundDurationMin={effectiveRoundDuration}
          />
        </div>

        {/* Error/Success Toast */}
        {(betError || betSuccess) && (
          <div className={`toast-message ${betError ? 'error' : 'success'}`}>
            {betError || betSuccess}
          </div>
        )}

        {error && (
          <div className="connection-error">
            ⚠ Connection issue
          </div>
        )}

      </div>

      {/* Bottom Left Panel - Navigation + Results */}
      <div className="bottom-left-panel">
        {/* Vertical Navigation Bar */}
        <nav className="vertical-nav">
          <button 
            className="nav-btn"
            onClick={() => router.push('/dashboard')}
            title="Dashboard"
          >
            <Home size={18} />
            <span>Home</span>
          </button>
          
          <button 
            className="nav-btn active"
            title="Spin"
          >
            <AppWindow size={18} />
            <span>Spin</span>
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => router.push('/dashboard/history')}
            title="History"
          >
            <History size={18} />
            <span>History</span>
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => router.push('/dashboard/settings')}
            title="Statistics"
          >
            <BarChart3 size={18} />
            <span>Stats</span>
          </button>
          
          {/* Wallet with popup submenu */}
          <div className="nav-btn-wrapper">
            <button 
              className={`nav-btn ${activeNavPopup === 'wallet' ? 'expanded' : ''}`}
              onClick={() => setActiveNavPopup(activeNavPopup === 'wallet' ? null : 'wallet')}
              title="Wallet"
            >
              <Wallet size={18} />
              <span>Wallet</span>
              <ChevronUp size={14} className={`chevron ${activeNavPopup === 'wallet' ? 'open' : ''}`} />
            </button>
            {activeNavPopup === 'wallet' && (
              <div className="nav-popup">
                <button onClick={() => { router.push('/dashboard/deposit'); setActiveNavPopup(null); }}>
                  <ArrowUpCircle size={16} />
                  <span>Deposit</span>
                </button>
                <button onClick={() => { router.push('/dashboard/wallet'); setActiveNavPopup(null); }}>
                  <ArrowDownCircle size={16} />
                  <span>Withdraw</span>
                </button>
                <button onClick={() => { router.push('/dashboard/history'); setActiveNavPopup(null); }}>
                  <FileText size={16} />
                  <span>Transactions</span>
                </button>
              </div>
            )}
          </div>
          
          <button 
            className="nav-btn"
            onClick={() => router.push('/premium')}
            title="Premium"
          >
            <Crown size={18} />
            <span>Premium</span>
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => router.push('/dashboard/affiliate')}
            title="Affiliate"
          >
            <BookOpen size={18} />
            <span>Affiliate</span>
          </button>
        </nav>
        
        {/* Recent Results Table */}
        <div className="results-panel">
          <RecentSpinsTable maxResults={4} />
        </div>
      </div>

      {/* Right Sidebar - Fixed Panel */}
      <aside className={`right-sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Toggle Button */}
        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarExpanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Company Branding */}
        <div className="sidebar-header">
          <div className="company-logo">
            <img src="/image/logo.png" alt="ForexAI" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} />
          </div>
          {sidebarExpanded && (
            <div className="company-name">ForexAI Exchange</div>
          )}
        </div>

        {/* User Profile */}
        <div className="user-section">
          <div className="user-avatar">
            <div className="avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          {sidebarExpanded && (
            <div className="user-info">
              <span className="username">{user?.username || 'Guest'}</span>
              {isPremium && (
                <span className="premium-badge">
                  <Crown size={12} /> Premium
                </span>
              )}
            </div>
          )}
        </div>

        {/* Settings and Logout - Top Priority */}
        <nav className="sidebar-menu top-menu">
          <button 
            className="menu-item settings-btn"
            onClick={() => router.push('/settings')}
            title="Settings"
          >
            <Settings size={18} />
            {sidebarExpanded && <span>Settings</span>}
          </button>
          <button 
            className="menu-item logout-btn" 
            onClick={handleLogout} 
            title="Logout"
          >
            <LogOut size={18} />
            {sidebarExpanded && <span>Logout</span>}
          </button>
        </nav>

        {/* Demo/Live Toggle */}
        <div className="mode-toggle-section">
          <button 
            className={`mode-toggle-btn ${isDemo ? 'demo' : 'live'}`}
            onClick={toggleDemo}
            title={isDemo ? 'Switch to Live Mode' : 'Switch to Demo Mode'}
          >
            {isDemo ? <TestTube size={18} /> : <PlayCircle size={18} />}
            {sidebarExpanded && (
              <span className="mode-label">{isDemo ? 'Demo Mode' : 'Live Mode'}</span>
            )}
          </button>
          {sidebarExpanded && (
            <span className="mode-hint">
              {isDemo ? 'Practice with virtual funds' : 'Real money trading'}
            </span>
          )}
        </div>

        {/* Balance Display */}
        <div className="balance-section">
          <div className="balance-icon">
            <Wallet size={18} />
          </div>
          {sidebarExpanded && (
            <div className="balance-content">
              <span className="balance-label">{isDemo ? 'Demo Balance' : 'Balance'}</span>
              <span className={`balance-value ${isDemo ? 'demo' : ''}`}>
                ${wallet?.available.toFixed(2) || '0.00'}
              </span>
              {wallet && wallet.held > 0 && (
                <span className="balance-held">In play: ${wallet.held.toFixed(2)}</span>
              )}
            </div>
          )}
        </div>

        {/* Premium Round Duration Selector */}
        {isPremium && sidebarExpanded && (
          <div className="premium-controls">
            <div className="control-header">
              <Clock size={14} />
              <span>Round Duration</span>
            </div>
            <div className="duration-selector">
              {ROUND_DURATIONS.map(duration => (
                <button
                  key={duration}
                  className={`duration-btn ${selectedRoundDuration === duration ? 'active' : ''}`}
                  onClick={() => setSelectedRoundDuration(duration)}
                >
                  {duration}m
                </button>
              ))}
            </div>
            
            {/* Scheduling Control */}
            <div className="control-header" style={{ marginTop: '12px' }}>
              <CalendarClock size={14} />
              <span>Schedule Ahead</span>
            </div>
            <div className="schedule-selector">
              <select
                value={scheduledRounds}
                onChange={(e) => setScheduledRounds(Number(e.target.value))}
                className="schedule-dropdown"
              >
                <option value={0}>No scheduling</option>
                <option value={3}>3 rounds (~{3 * selectedRoundDuration}min)</option>
                <option value={6}>6 rounds (~{6 * selectedRoundDuration}min)</option>
                <option value={12}>12 rounds (~{Math.min(120, 12 * selectedRoundDuration)}min)</option>
                <option value={24}>Up to 2 hours</option>
              </select>
            </div>
            {scheduledRounds > 0 && (
              <span className="schedule-info">
                Auto-betting for {scheduledRounds} rounds
              </span>
            )}
          </div>
        )}

        {/* Non-premium round info */}
        {!isPremium && sidebarExpanded && (
          <div className="round-info-section">
            <div className="round-duration-display">
              <Clock size={14} />
              <span>20 min rounds</span>
            </div>
            <button 
              className="upgrade-hint"
              onClick={() => router.push('/premium')}
            >
              <Crown size={12} />
              Upgrade for flexible timing
            </button>
          </div>
        )}
      </aside>

      {/* Bottom Order Bar - Like Expert Option */}
      <div className="betting-bar">
        {/* Amount Control */}
        <div className="amount-section">
          <button className="amount-adjust" onClick={() => adjustAmount(-5)}>−</button>
          <div className="amount-display">
            <span className="amount-currency">$</span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="amount-input"
              min="1"
              max={maxBet}
            />
            <span className="amount-label">investment</span>
          </div>
          <button className="amount-adjust" onClick={() => adjustAmount(5)}>+</button>
          
          {/* Quick amounts */}
          <div className="quick-amounts">
            {[5, 10, 25, 50, 100].map(amt => (
              <button 
                key={amt} 
                className={`quick-btn ${betAmount === amt.toString() ? 'active' : ''}`}
                onClick={() => handleQuickAmount(amt)}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Market Selection - Always selectable */}
        <div className="markets-section">
          {MARKET_OPTIONS.map((option) => (
            <button
              key={`${option.market}-${option.selection}`}
              className={`market-btn ${selectedOption.selection === option.selection ? 'selected' : ''}`}
              style={{ 
                '--btn-color': option.color,
                borderColor: selectedOption.selection === option.selection ? option.color : 'transparent'
              } as React.CSSProperties}
              onClick={() => setSelectedOption(option)}
            >
              <span className="market-icon" style={{ color: option.color }}>{option.icon}</span>
              <span className="market-label">
                {option.selection === 'HIGH_VOL'
                  ? 'HIGH VOLATILE'
                  : option.selection === 'LOW_VOL'
                  ? 'LOW VOLATILE'
                  : option.label}
              </span>
              {totals && (
                <span className="market-total">
                  {option.market === 'OUTER' && option.selection === 'BUY' && `$${totals.outer?.BUY || 0}`}
                  {option.market === 'OUTER' && option.selection === 'SELL' && `$${totals.outer?.SELL || 0}`}
                  {option.market === 'MIDDLE' && option.selection === 'BLUE' && `$${totals.middle?.BLUE || 0}`}
                  {option.market === 'MIDDLE' && option.selection === 'RED' && `$${totals.middle?.RED || 0}`}
                  {option.market === 'INNER' && option.selection === 'HIGH_VOL' && `$${totals.inner?.HIGH_VOL || 0}`}
                  {option.market === 'INNER' && option.selection === 'LOW_VOL' && `$${totals.inner?.LOW_VOL || 0}`}
                  {option.market === 'GLOBAL' && `$${totals.global?.INDECISION || 0}`}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* My Ticket + Make Order Buttons */}
        <div className="action-section">
          <button
            type="button"
            className="tickets-btn"
            onClick={() => setShowTicketsModal(true)}
          >
            My Ticket
          </button>

          <button 
            className={`place-bet-btn ${!canBet ? 'disabled' : ''}`}
            onClick={handlePlaceBet}
            disabled={!canBet}
          >
            {isPlacingBet ? (
              <span className="btn-loading">●●●</span>
            ) : roundState === 'frozen' ? (
              <>⏱️ TIME OUT</>
            ) : roundState === 'settled' ? (
              <>⏳ NEXT ROUND</>
            ) : roundState === 'preopen' ? (
              <>⏳ WAITING</>
            ) : (
              <>
                <span className="btn-icon" style={{ color: selectedOption.color }}>{selectedOption.icon}</span>
                <span className="btn-text">MAKE ORDER</span>
                <span className="btn-amount">${parseFloat(betAmount || '0').toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
