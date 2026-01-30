"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import "../Styles/SpinPage.scss";
import SpinWheel from "../Spin/SpinWheel";
import RecentSpinsTable from "../Spin/RecentSpinsTable";
import { useRound } from "@/hooks/useRound";
import { useWallet } from "@/hooks/useWallet";
import { getCurrentRoundBets, placeBet, isPremiumUser, getBetHistory, cancelBet, getRecentRounds } from "@/lib/api/spin";
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
// Note: 15-minute option removed per spec v2.1
const ROUND_DURATIONS = [5, 10, 20];

// Scheduled order type for future rounds
type ScheduledOrder = {
  id: string;
  provisionalRoundNumber: number;
  scheduledTime: Date;
  market: BetMarket;
  selection: BetSelection;
  amount: number;
  duration: number;
  status: 'pending' | 'placed' | 'failed';
};

// Future round type for scheduling display
type FutureRound = {
  provisionalNumber: number;
  estimatedStartTime: Date;
  estimatedEndTime: Date;
  checkpointLabel: string; // Q1, Q2, H1, H2, or Full
};

export default function SpinPage() {
  const router = useRouter();
  // Premium features state - must be defined before useRound
  const [selectedRoundDuration, setSelectedRoundDuration] = useState<number>(20);
  
  // Pass user's selected duration to useRound for sub-round timing calculation
  const { 
    round, 
    totals, 
    state: roundState, 
    countdown, 
    timeUntilFreeze, 
    subRoundCountdown,
    subRoundTimeUntilFreeze,
    currentQuarter,
    userDuration,
    setUserDuration,
    loading, 
    error 
  } = useRound(selectedRoundDuration as 5 | 10 | 20);
  
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
  const [ticketTab, setTicketTab] = useState<'active' | 'scheduled' | 'previous'>('active');
  const [cancellingBetId, setCancellingBetId] = useState<string | null>(null);
  const [previousBets, setPreviousBets] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Cancel confirmation state
  const [cancelConfirmation, setCancelConfirmation] = useState<{
    type: 'active' | 'scheduled';
    id: string;
    bet?: Bet;
    order?: ScheduledOrder;
  } | null>(null);
  
  // Premium features state (continued - selectedRoundDuration defined before useRound)
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [scheduledOrders, setScheduledOrders] = useState<ScheduledOrder[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedFutureRound, setSelectedFutureRound] = useState<FutureRound | null>(null);
  
  // Navigation menu state
  const [activeNavPopup, setActiveNavPopup] = useState<string | null>(null);
  
  // Previous round winners (for 40-second highlight)
  const [previousWinners, setPreviousWinners] = useState<{
    outer?: "BUY" | "SELL";
    color?: "BLUE" | "RED";
    vol?: "HIGH" | "LOW";
    indecision?: boolean;
  } | undefined>(undefined);
  
  // Recent bet placed (for confirmation animation on wheel)
  const [recentBetPlaced, setRecentBetPlaced] = useState<{ selection: string; amount: number } | null>(null);
  
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
  
  // Sync local duration state with useRound hook when duration changes
  useEffect(() => {
    if (setUserDuration && isPremium) {
      setUserDuration(selectedRoundDuration as 5 | 10 | 20);
    }
  }, [selectedRoundDuration, setUserDuration, isPremium]);
  
  // v2.1: Use sub-round countdown based on user's selected duration
  const displayCountdown = effectiveRoundDuration === 20 
    ? countdown 
    : (subRoundCountdown ?? countdown);
  
  // Use sub-round freeze time for betting cutoff
  const effectiveTimeUntilFreeze = effectiveRoundDuration === 20
    ? timeUntilFreeze
    : (subRoundTimeUntilFreeze ?? timeUntilFreeze);

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

  // Process scheduled orders when a new round opens
  useEffect(() => {
    if (!round || roundState !== 'open' || scheduledOrders.length === 0) return;
    
    const processScheduledOrders = async () => {
      const now = Date.now();
      const ordersToProcess = scheduledOrders.filter(order => {
        // Process orders that are due (within 30 seconds of scheduled time or past it)
        const timeDiff = order.scheduledTime.getTime() - now;
        return timeDiff <= 30000 && order.status === 'pending' && 
               order.provisionalRoundNumber === round.roundNumber;
      });
      
      for (const order of ordersToProcess) {
        try {
          await placeBet({
            market: order.market,
            selection: order.selection,
            amountUsd: order.amount,
            idempotencyKey: `sched-${order.id}`,
            isDemo: isDemo,
            userRoundDuration: order.duration as 5 | 10 | 20,
          });
          
          // Mark as placed
          setScheduledOrders(prev => 
            prev.map(o => o.id === order.id ? { ...o, status: 'placed' as const } : o)
          );
          
          setBetSuccess(`Scheduled order placed: $${order.amount} on ${order.selection}`);
          refreshWallet();
          
          // Refresh bets
          const bets = await getCurrentRoundBets();
          setUserBets(bets);
        } catch (err) {
          // Mark as failed
          setScheduledOrders(prev => 
            prev.map(o => o.id === order.id ? { ...o, status: 'failed' as const } : o)
          );
          setBetError(`Scheduled order failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
      
      // Remove placed/failed orders after processing
      setTimeout(() => {
        setScheduledOrders(prev => prev.filter(o => o.status === 'pending'));
      }, 5000);
    };
    
    processScheduledOrders();
  }, [round?.roundNumber, roundState, scheduledOrders, isDemo, refreshWallet]);

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
        userRoundDuration: effectiveRoundDuration as 5 | 10 | 20, // v2.1: Pass user's duration preference
      });

      // Don't show toast - wheel will display confirmation on semicircle
      refreshWallet();
      
      // Trigger wheel confirmation animation (shows on the semicircle)
      setRecentBetPlaced({ selection: selectedOption.selection, amount: pendingBetAmount, label: selectedOption.label });
      setTimeout(() => setRecentBetPlaced(null), 3500);
      
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
  
  // Store winners when round settles for 40-second highlight in next round
  const [previousRoundNumber, setPreviousRoundNumber] = useState<number | null>(null);
  const [previousWinnersFetchedForRound, setPreviousWinnersFetchedForRound] = useState<number | null>(null);
  
  useEffect(() => {
    if (winners && roundState === 'settled' && round) {
      console.log('Storing previous winners:', winners, 'from round:', round.roundNumber);
      setPreviousWinners(winners as any);
      setPreviousRoundNumber(round.roundNumber);
    }
  }, [winners, roundState, round]);
  
  // Fetch previous round winners on page load if we're in an open state and within first 40 seconds
  useEffect(() => {
    const fetchPreviousRoundWinners = async () => {
      if (!round || roundState !== 'open' || previousWinners || previousWinnersFetchedForRound === round.roundNumber) {
        return;
      }
      
      // Only show previous winners in first 40 seconds of the round
      const roundOpenedAt = new Date(round.openedAt).getTime();
      const now = Date.now();
      const secondsSinceOpen = (now - roundOpenedAt) / 1000;
      
      if (secondsSinceOpen > 40) {
        console.log('Round already past 40s, not fetching previous winners');
        return;
      }
      
      console.log('Fetching previous round winners for highlight...');
      setPreviousWinnersFetchedForRound(round.roundNumber);
      
      try {
        const { data: recentRounds } = await getRecentRounds(1);
        if (recentRounds && recentRounds.length > 0) {
          const lastRound = recentRounds[0];
          console.log('Found last settled round:', lastRound.roundNumber, lastRound);
          
          if (lastRound.indecisionTriggered) {
            setPreviousWinners({ indecision: true, outer: undefined, color: undefined, vol: undefined });
          } else {
            let vol: "HIGH" | "LOW" | undefined = undefined;
            if (lastRound.innerWinner === "HIGH_VOL") vol = "HIGH";
            else if (lastRound.innerWinner === "LOW_VOL") vol = "LOW";
            
            setPreviousWinners({
              outer: lastRound.outerWinner || undefined,
              color: lastRound.middleWinner || undefined,
              vol: vol,
              indecision: false,
            });
          }
          setPreviousRoundNumber(lastRound.roundNumber);
          
          // Set timeout to clear after remaining time (40s - time already passed)
          const remainingTime = Math.max(0, (40 - secondsSinceOpen) * 1000);
          console.log(`Will clear previous winners in ${remainingTime / 1000}s`);
          setTimeout(() => {
            console.log('Clearing previous winners after timeout');
            setPreviousWinners(undefined);
            setPreviousRoundNumber(null);
          }, remainingTime);
        }
      } catch (error) {
        console.error('Failed to fetch previous round winners:', error);
      }
    };
    
    fetchPreviousRoundWinners();
  }, [round, roundState, previousWinners, previousWinnersFetchedForRound]);
  
  // Clear previous winners after 40 seconds into the new round (when we captured winners from settlement)
  useEffect(() => {
    if (roundState === 'open' && previousWinners && round && previousRoundNumber !== null && previousRoundNumber !== round.roundNumber) {
      console.log('New round started, will clear previous winners in 40s');
      const timer = setTimeout(() => {
        console.log('Clearing previous winners after 40s');
        setPreviousWinners(undefined);
        setPreviousRoundNumber(null);
      }, 40000);
      return () => clearTimeout(timer);
    }
  }, [roundState, previousWinners, round, previousRoundNumber]);
  
  // Convert user bets to format for SpinWheel
  const placedBetsForWheel = useMemo(() => {
    return userBets.map(bet => ({
      market: bet.market,
      selection: bet.selection,
      amount: Number(bet.amountUsd),
      timestamp: new Date(bet.createdAt).getTime(),
    }));
  }, [userBets]);
  
  // Current selection for wheel highlighting
  const currentSelectionForWheel = useMemo(() => {
    return {
      market: selectedOption.market,
      selection: selectedOption.selection,
    };
  }, [selectedOption]);

  // User can bet if their sub-round is still open (not frozen)
  const canBet = roundState === 'open' && round && !isPlacingBet && effectiveTimeUntilFreeze > 0;

  // Calculate future rounds for scheduling (up to 2 hours ahead)
  const futureRounds = useMemo((): FutureRound[] => {
    if (!round || !isPremium) return [];
    
    const rounds: FutureRound[] = [];
    const roundDurationMs = 20 * 60 * 1000; // Main round is always 20 min
    const subRoundDurationMs = effectiveRoundDuration * 60 * 1000;
    const maxScheduleTime = 2 * 60 * 60 * 1000; // 2 hours in ms
    
    const currentRoundStart = new Date(round.openedAt).getTime();
    const currentRoundEnd = new Date(round.settleAt).getTime();
    
    // Calculate how many sub-rounds/checkpoints to show based on duration
    let maxRounds: number;
    if (effectiveRoundDuration === 5) {
      maxRounds = 24; // 24 × 5 min = 120 min = 2 hours
    } else if (effectiveRoundDuration === 10) {
      maxRounds = 12; // 12 × 10 min = 120 min = 2 hours
    } else {
      maxRounds = 6; // 6 × 20 min = 120 min = 2 hours
    }
    
    // For sub-rounds within the current main round
    if (effectiveRoundDuration === 5 || effectiveRoundDuration === 10) {
      const checkpointsPerRound = effectiveRoundDuration === 5 ? 4 : 2;
      const now = Date.now();
      
      // Calculate current checkpoint within the round
      const elapsed = now - currentRoundStart;
      const currentCheckpoint = Math.floor(elapsed / subRoundDurationMs);
      
      // Add remaining checkpoints in current round
      for (let i = currentCheckpoint + 1; i < checkpointsPerRound; i++) {
        const checkpointTime = currentRoundStart + (i + 1) * subRoundDurationMs;
        if (checkpointTime - now <= maxScheduleTime) {
          rounds.push({
            provisionalNumber: round.roundNumber,
            estimatedStartTime: new Date(currentRoundStart + i * subRoundDurationMs),
            estimatedEndTime: new Date(checkpointTime),
            checkpointLabel: effectiveRoundDuration === 5 ? `Q${i + 1}` : `H${i + 1}`,
          });
        }
      }
    }
    
    // Add future main rounds
    let futureRoundNumber = round.roundNumber + 1;
    let nextRoundStart = currentRoundEnd;
    
    while (rounds.length < maxRounds && nextRoundStart - Date.now() < maxScheduleTime) {
      const nextRoundEnd = nextRoundStart + roundDurationMs;
      
      if (effectiveRoundDuration === 20) {
        // Full round
        rounds.push({
          provisionalNumber: futureRoundNumber,
          estimatedStartTime: new Date(nextRoundStart),
          estimatedEndTime: new Date(nextRoundEnd),
          checkpointLabel: 'Full',
        });
      } else {
        // Sub-rounds within the future round
        const checkpointsPerRound = effectiveRoundDuration === 5 ? 4 : 2;
        for (let i = 0; i < checkpointsPerRound && rounds.length < maxRounds; i++) {
          const checkpointStart = nextRoundStart + i * subRoundDurationMs;
          const checkpointEnd = nextRoundStart + (i + 1) * subRoundDurationMs;
          
          if (checkpointStart - Date.now() < maxScheduleTime) {
            rounds.push({
              provisionalNumber: futureRoundNumber,
              estimatedStartTime: new Date(checkpointStart),
              estimatedEndTime: new Date(checkpointEnd),
              checkpointLabel: effectiveRoundDuration === 5 ? `Q${i + 1}` : `H${i + 1}`,
            });
          }
        }
      }
      
      futureRoundNumber++;
      nextRoundStart = nextRoundEnd;
    }
    
    return rounds;
  }, [round, effectiveRoundDuration, isPremium]);

  // Handle scheduling an order for a future round
  const handleScheduleOrder = (futureRound: FutureRound) => {
    setSelectedFutureRound(futureRound);
    setShowScheduleModal(true);
  };

  // Confirm scheduled order
  const handleConfirmScheduledOrder = () => {
    if (!selectedFutureRound) return;
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) {
      setBetError('Minimum order is $1');
      return;
    }
    
    const newOrder: ScheduledOrder = {
      id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      provisionalRoundNumber: selectedFutureRound.provisionalNumber,
      scheduledTime: selectedFutureRound.estimatedStartTime,
      market: selectedOption.market,
      selection: selectedOption.selection,
      amount: amount,
      duration: effectiveRoundDuration,
      status: 'pending',
    };
    
    setScheduledOrders(prev => [...prev, newOrder]);
    setShowScheduleModal(false);
    setSelectedFutureRound(null);
    setBetSuccess(`Scheduled $${amount} on ${selectedOption.label} for Round #${selectedFutureRound.provisionalNumber} ${selectedFutureRound.checkpointLabel}`);
  };

  // Remove a scheduled order
  const handleRemoveScheduledOrder = (orderId: string) => {
    setScheduledOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Format time for display
  const formatScheduleTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `in ${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `in ${hours}h ${mins}m`;
    }
  };

  // Show cancel confirmation for active bet
  const handleCancelActiveBet = (bet: Bet) => {
    if (!isPremium) {
      setBetError('Premium subscription required to cancel orders');
      return;
    }
    
    if (effectiveTimeUntilFreeze <= 0) {
      setBetError('Cannot cancel - market is frozen');
      return;
    }
    
    setCancelConfirmation({ type: 'active', id: bet.id, bet });
  };

  // Show cancel confirmation for scheduled order
  const handleCancelScheduledOrder = (order: ScheduledOrder) => {
    setCancelConfirmation({ type: 'scheduled', id: order.id, order });
  };

  // Confirm and execute cancellation
  const confirmCancellation = async () => {
    if (!cancelConfirmation) return;
    
    const { type, id, bet, order } = cancelConfirmation;
    
    if (type === 'active' && bet) {
      setCancellingBetId(id);
      try {
        await cancelBet(id);
        setBetSuccess('Order cancelled successfully. Funds returned to wallet.');
        refreshWallet();
        
        // Remove from active bets
        setUserBets(prev => prev.filter(b => b.id !== id));
        
        // Refresh the history from backend to get the updated cancelled bet
        // This ensures we have all previous bets including the newly cancelled one
        try {
          const response = await getBetHistory(1, 50);
          let bets = [];
          if (Array.isArray(response)) {
            bets = response;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            bets = response.data.data;
          } else if (response.data && Array.isArray(response.data)) {
            bets = response.data;
          } else if (response.bets && Array.isArray(response.bets)) {
            bets = response.bets;
          }
          setPreviousBets(bets);
        } catch (historyErr) {
          // If fetching history fails, add cancelled bet locally with round info
          const cancelledBet = {
            ...bet,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
            roundNumber: round?.roundNumber,
            round: bet.round || { roundNumber: round?.roundNumber, state: 'CANCELLED' },
          };
          setPreviousBets(prev => {
            // Avoid duplicates
            const filtered = prev.filter(b => b.id !== id);
            return [cancelledBet, ...filtered];
          });
        }
        
      } catch (err) {
        setBetError(err instanceof Error ? err.message : 'Failed to cancel order');
      } finally {
        setCancellingBetId(null);
      }
    } else if (type === 'scheduled' && order) {
      // Remove from scheduled orders
      setScheduledOrders(prev => prev.filter(o => o.id !== id));
      
      // For scheduled orders (not yet placed), just add locally since they're not in backend
      const cancelledOrder = {
        id: order.id,
        market: order.market,
        selection: order.selection,
        amountUsd: order.amount,
        status: 'CANCELLED',
        userRoundDuration: order.duration,
        createdAt: new Date().toISOString(),
        cancelledAt: new Date().toISOString(),
        roundNumber: order.provisionalRoundNumber,
        round: {
          roundNumber: order.provisionalRoundNumber,
          state: 'SCHEDULED',
        },
      };
      setPreviousBets(prev => [cancelledOrder, ...prev]);
      setBetSuccess('Scheduled order cancelled');
    }
    
    setCancelConfirmation(null);
  };

  // Calculate totals for display (ensure userBets is array and filter out cancelled)
  const betsArray = Array.isArray(userBets) 
    ? userBets.filter(bet => bet.status !== 'CANCELLED') 
    : [];
  const totalBets = betsArray.reduce((sum, bet) => sum + Number(bet.amountUsd || 0), 0);
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
                onClick={() => setTicketTab('active')}
              >
                Active {betsArray.length > 0 && `(${betsArray.length})`}
              </button>
              <button
                className={`tab-btn ${ticketTab === 'scheduled' ? 'active' : ''}`}
                onClick={() => setTicketTab('scheduled')}
              >
                Scheduled {scheduledOrders.length > 0 && `(${scheduledOrders.length})`}
              </button>
              <button
                className={`tab-btn ${ticketTab === 'previous' ? 'active' : ''}`}
                onClick={async () => {
                  setTicketTab('previous');
                  if (previousBets.length === 0 && !loadingHistory) {
                    setLoadingHistory(true);
                    try {
                      const response = await getBetHistory(1, 50);
                      console.log('Bet history response:', response);
                      
                      // Handle different response structures
                      let bets = [];
                      if (Array.isArray(response)) {
                        bets = response;
                      } else if (response.data?.data && Array.isArray(response.data.data)) {
                        bets = response.data.data;
                      } else if (response.data && Array.isArray(response.data)) {
                        bets = response.data;
                      } else if (response.bets && Array.isArray(response.bets)) {
                        bets = response.bets;
                      } else if (response.data?.bets && Array.isArray(response.data.bets)) {
                        bets = response.data.bets;
                      }
                      
                      console.log('Parsed bets:', bets);
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
                        {bet.userRoundDuration && (
                          <span className="ticket-duration">{bet.userRoundDuration}m</span>
                        )}
                      </div>
                      <div className="ticket-meta">
                        <span className="ticket-amount">
                          ${Number(bet.amountUsd || 0).toFixed(2)}
                        </span>
                        <span className="ticket-time">
                          {new Date(bet.createdAt).toLocaleTimeString()}
                        </span>
                        {/* Cancel button for premium users (before freeze) */}
                        {isPremium && effectiveTimeUntilFreeze > 0 && (
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelActiveBet(bet)}
                            disabled={cancellingBetId === bet.id}
                            title="Cancel order (refund to wallet)"
                          >
                            {cancellingBetId === bet.id ? '...' : '✕ Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Scheduled Tickets */}
            {ticketTab === 'scheduled' && (
              <div className="tickets-list">
                {scheduledOrders.length === 0 ? (
                  <div className="empty-state">
                    <p>No scheduled orders.</p>
                    <p className="hint">Use "Schedule Ahead" to place orders for future rounds.</p>
                  </div>
                ) : (
                  scheduledOrders.map((order) => (
                    <div key={order.id} className={`ticket-row scheduled-ticket ${order.status}`}>
                      <div className="ticket-main">
                        <span className="ticket-round">
                          Round #{order.provisionalRoundNumber}
                        </span>
                        <span className="ticket-selection" style={{ 
                          color: MARKET_OPTIONS.find(o => o.selection === order.selection)?.color 
                        }}>
                          {MARKET_OPTIONS.find(o => o.selection === order.selection)?.icon} {order.selection}
                        </span>
                        <span className="ticket-duration">{order.duration}m</span>
                        <span className={`ticket-status ${order.status}`}>
                          {order.status === 'pending' ? '⏳ Pending' : 
                           order.status === 'placed' ? '✓ Placed' : '✗ Failed'}
                        </span>
                      </div>
                      <div className="ticket-meta">
                        <span className="ticket-amount">
                          ${order.amount.toFixed(2)}
                        </span>
                        <span className="ticket-time">
                          {order.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {/* Cancel button for pending scheduled orders */}
                        {order.status === 'pending' && (
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelScheduledOrder(order)}
                            title="Cancel scheduled order"
                          >
                            ✕ Cancel
                          </button>
                        )}
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
                    const cancelled = bet.status === 'CANCELLED';
                    const pending = bet.status === 'PENDING' || bet.status === 'ACCEPTED';
                    
                    const statusClass = won ? 'won' : lost ? 'lost' : cancelled ? 'cancelled' : 'pending';
                    const statusLabel = won ? '✓ WON' : lost ? '✗ LOST' : cancelled ? '⊘ CANCELLED' : '⏳ PENDING';
                    
                    return (
                      <div 
                        key={bet.id} 
                        className={`ticket-row previous-ticket ${statusClass}`}
                      >
                        <div className="ticket-main">
                          <span className="ticket-market">
                            {getTicketMarketLabel(bet.market)}
                          </span>
                          <span className="ticket-selection">
                            {getTicketSelectionLabel(bet.selection)}
                          </span>
                          <span className={`ticket-status ${statusClass}`}>
                            {statusLabel}
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
                          {cancelled && (
                            <span className="ticket-refund">
                              Refunded
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

      {/* Schedule Panel Modal - Shows future rounds */}
      {showSchedulePanel && isPremium && (
        <div className="schedule-panel-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowSchedulePanel(false);
        }}>
          <div className="schedule-panel-modal">
            <div className="schedule-panel-header">
              <h2>Schedule Future Orders</h2>
              <p className="subtitle">
                {effectiveRoundDuration === 5 ? '5-minute quarters' : 
                 effectiveRoundDuration === 10 ? '10-minute halves' : 
                 '20-minute rounds'} • Up to 2 hours ahead
              </p>
              <button 
                className="close-btn"
                onClick={() => setShowSchedulePanel(false)}
              >
                ✕
              </button>
            </div>

            {/* Future Rounds List */}
            <div className="future-rounds-list">
              {futureRounds.length === 0 ? (
                <div className="empty-state">
                  No future rounds available for scheduling.
                </div>
              ) : (
                futureRounds.map((fr, index) => {
                  const hasScheduledOrder = scheduledOrders.some(
                    o => o.provisionalRoundNumber === fr.provisionalNumber && 
                         o.scheduledTime.getTime() === fr.estimatedStartTime.getTime()
                  );
                  
                  return (
                    <div 
                      key={`${fr.provisionalNumber}-${fr.checkpointLabel}-${index}`} 
                      className={`future-round-item ${hasScheduledOrder ? 'has-order' : ''}`}
                    >
                      <div className="round-info">
                        <span className="round-number">
                          Round #{fr.provisionalNumber}
                          {fr.checkpointLabel !== 'Full' && (
                            <span className="checkpoint-label">{fr.checkpointLabel}</span>
                          )}
                        </span>
                        <span className="round-time">
                          {formatScheduleTime(fr.estimatedStartTime)}
                        </span>
                        <span className="round-time-exact">
                          {fr.estimatedStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' → '}
                          {fr.estimatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="round-actions">
                        {hasScheduledOrder ? (
                          <span className="scheduled-badge">Scheduled</span>
                        ) : (
                          <button 
                            className="schedule-order-btn"
                            onClick={() => handleScheduleOrder(fr)}
                          >
                            + Schedule Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Scheduled Orders Section */}
            {scheduledOrders.length > 0 && (
              <div className="scheduled-orders-section">
                <h3>Your Scheduled Orders ({scheduledOrders.length})</h3>
                <div className="scheduled-orders-list">
                  {scheduledOrders.map(order => (
                    <div key={order.id} className="scheduled-order-item">
                      <div className="order-details">
                        <span className="order-round">
                          Round #{order.provisionalRoundNumber}
                        </span>
                        <span className="order-selection" style={{ 
                          color: MARKET_OPTIONS.find(o => o.selection === order.selection)?.color 
                        }}>
                          {order.selection}
                        </span>
                        <span className="order-amount">${order.amount.toFixed(2)}</span>
                        <span className="order-time">
                          {order.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button 
                        className="remove-order-btn"
                        onClick={() => handleRemoveScheduledOrder(order.id)}
                        title="Remove scheduled order"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="schedule-panel-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowSchedulePanel(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Order Confirmation Modal */}
      {showScheduleModal && selectedFutureRound && (
        <div className="schedule-confirm-overlay">
          <div className="schedule-confirm-modal">
            <h2>Schedule Order</h2>
            <p className="subtitle">
              Round #{selectedFutureRound.provisionalNumber} 
              {selectedFutureRound.checkpointLabel !== 'Full' && ` ${selectedFutureRound.checkpointLabel}`}
            </p>
            
            <div className="schedule-details">
              <div className="detail-row">
                <span className="label">Scheduled Time</span>
                <span className="value">
                  {selectedFutureRound.estimatedStartTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  {' - '}
                  {selectedFutureRound.estimatedEndTime.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Selection</span>
                <span className="value" style={{ color: selectedOption.color }}>
                  {selectedOption.icon} {selectedOption.label}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Amount</span>
                <span className="value">${parseFloat(betAmount || '0').toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Duration</span>
                <span className="value">{effectiveRoundDuration} min</span>
              </div>
            </div>
            
            <p className="disclaimer">
              This order will be automatically placed when the round opens.
              Ensure you have sufficient balance at that time.
            </p>
            
            <div className="actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedFutureRound(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmScheduledOrder}
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelConfirmation && (
        <div className="cancel-confirm-overlay">
          <div className="cancel-confirm-modal">
            <h2>Cancel Order?</h2>
            <p className="subtitle">Are you sure you want to cancel this order?</p>
            
            <div className="cancel-details">
              {cancelConfirmation.type === 'active' && cancelConfirmation.bet && (
                <>
                  <div className="detail-row">
                    <span className="label">Market</span>
                    <span className="value">{getTicketMarketLabel(cancelConfirmation.bet.market)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Selection</span>
                    <span className="value">{cancelConfirmation.bet.selection}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Amount</span>
                    <span className="value">${Number(cancelConfirmation.bet.amountUsd || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
              {cancelConfirmation.type === 'scheduled' && cancelConfirmation.order && (
                <>
                  <div className="detail-row">
                    <span className="label">Round</span>
                    <span className="value">#{cancelConfirmation.order.provisionalRoundId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Market</span>
                    <span className="value">{getTicketMarketLabel(cancelConfirmation.order.market)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Selection</span>
                    <span className="value">{cancelConfirmation.order.selection}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Amount</span>
                    <span className="value">${Number(cancelConfirmation.order.amount || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            
            <p className="disclaimer">
              Your funds will be returned to your wallet. No charges will apply.
            </p>
            
            <div className="actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCancelConfirmation(null)}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmCancellation}
                disabled={cancellingBetId === cancelConfirmation.id}
              >
                {cancellingBetId === cancelConfirmation.id ? 'Cancelling...' : 'Yes, Cancel Order'}
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
            currentSelection={currentSelectionForWheel}
            placedBets={placedBetsForWheel}
            recentBetPlaced={recentBetPlaced}
            previousWinners={previousWinners}
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
            className="nav-btn active"
            title="Spin"
          >
            <AppWindow size={18} />
            <span>Spin</span>
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => router.push('/spin-history')}
            title="Spin History"
          >
            <History size={18} />
            <span>Spin History</span>
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => router.push('/statistics')}
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
            <button 
              className="schedule-btn"
              onClick={() => setShowSchedulePanel(!showSchedulePanel)}
            >
              {showSchedulePanel ? 'Hide Schedule' : 'View Future Rounds'}
              <span className="schedule-count">
                {scheduledOrders.length > 0 && `(${scheduledOrders.length})`}
              </span>
            </button>
            
            {/* Scheduled Orders Summary */}
            {scheduledOrders.length > 0 && (
              <div className="scheduled-orders-summary">
                <span className="summary-label">Pending Orders:</span>
                <span className="summary-count">{scheduledOrders.length}</span>
              </div>
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
