"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import "../Styles/SpinPage.scss";
import SpinWheel from "../Spin/SpinWheel";
import { useRound } from "@/hooks/useRound";
import { useWallet } from "@/hooks/useWallet";
import { getCurrentRoundBets, placeBet, isPremiumUser } from "@/lib/api/spin";
import type { Bet, BetMarket, BetSelection } from "@/lib/api/spin";
import { getWebSocketClient, initWebSocket } from "@/lib/websocket";

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

export default function SpinPage() {
  const router = useRouter();
  const { round, totals, state: roundState, countdown, timeUntilFreeze, loading, error } = useRound();
  const { wallet, refresh: refreshWallet } = useWallet();
  const [userBets, setUserBets] = useState<Bet[]>([]);
  const [selectedOption, setSelectedOption] = useState<MarketOption>(MARKET_OPTIONS[0]);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betSuccess, setBetSuccess] = useState<string | null>(null);
  const [showBetsPanel, setShowBetsPanel] = useState(false);

  const isPremium = isPremiumUser();
  const maxBet = isPremium ? 200 : 1000;

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
      setBetError('Betting is closed');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) {
      setBetError('Minimum bet is $1');
      return;
    }

    if (amount > maxBet) {
      setBetError(`Maximum bet is $${maxBet}`);
      return;
    }

    if (wallet && amount > wallet.available) {
      setBetError('Insufficient funds');
      return;
    }

    setIsPlacingBet(true);
    setBetError(null);

    try {
      await placeBet({
        market: selectedOption.market,
        selection: selectedOption.selection,
        amountUsd: amount,
        idempotencyKey: `bet-${Date.now()}-${Math.random()}`,
      });

      setBetSuccess(`$${amount} on ${selectedOption.label}`);
      refreshWallet();
      
      // Refresh bets
      if (round) {
        const bets = await getCurrentRoundBets();
        setUserBets(bets);
      }
    } catch (err) {
      setBetError(err instanceof Error ? err.message : 'Failed to place bet');
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

  const displayCountdown = roundState === 'open' ? timeUntilFreeze : countdown;
  const canBet = roundState === 'open' && round && !isPlacingBet;

  // Calculate totals for display
  const totalBets = userBets.reduce((sum, bet) => sum + bet.amountUsd, 0);
  const potentialWin = totalBets * 2;

  return (
    <div className="spin-gaming-container">
      {/* Back Button - Exit Gaming Mode */}
      <button 
        className="exit-game-btn" 
        onClick={() => router.push('/user-dashboard')}
        title="Exit to Dashboard"
      >
        <span className="exit-icon">←</span>
        <span className="exit-text">Exit</span>
      </button>

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
          />
        </div>

        {/* Right Mini Panel - Wallet & Info */}
        <div className="right-mini-panel">
          <div className="mini-panel-toggle" onClick={() => setShowBetsPanel(!showBetsPanel)}>
            <span className="toggle-icon">≡</span>
          </div>
          
          <div className={`mini-panel-content ${showBetsPanel ? 'expanded' : ''}`}>
            {/* Wallet */}
            <div className="wallet-mini">
              <div className="wallet-balance">
                <span className="balance-label">Balance</span>
                <span className="balance-value">${wallet?.available.toFixed(2) || '0.00'}</span>
              </div>
              {wallet && wallet.held > 0 && (
                <div className="wallet-held">
                  <span className="held-label">In Play</span>
                  <span className="held-value">${wallet.held.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Round Info */}
            {round && (
              <div className="round-mini">
                <div className="round-number">Round #{round.roundNumber}</div>
                <div className={`round-status ${roundState}`}>
                  {roundState.toUpperCase()}
                </div>
              </div>
            )}

            {/* Active Bets */}
            {userBets.length > 0 && (
              <div className="bets-mini">
                <div className="bets-header">
                  <span>Your Bets</span>
                  <span className="bets-count">{userBets.length}</span>
                </div>
                <div className="bets-list">
                  {userBets.slice(0, 5).map(bet => (
                    <div key={bet.id} className={`bet-mini-item ${bet.status?.toLowerCase()}`}>
                      <span className="bet-selection">{bet.selection.replace('_', ' ')}</span>
                      <span className="bet-amount">${bet.amountUsd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {userBets.length > 0 && (
                  <div className="bets-total">
                    <span>Total: ${totalBets.toFixed(2)}</span>
                    <span className="potential">Win: ${potentialWin.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Premium Badge */}
            {isPremium && (
              <div className="premium-mini">
                <span>⭐ Premium</span>
              </div>
            )}
          </div>
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

      {/* Bottom Betting Bar - Like Expert Option */}
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

        {/* Market Selection */}
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
              disabled={!canBet}
            >
              <span className="market-icon" style={{ color: option.color }}>{option.icon}</span>
              <span className="market-label">{option.label}</span>
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

        {/* Place Bet Button */}
        <div className="action-section">
          <button 
            className={`place-bet-btn ${!canBet ? 'disabled' : ''}`}
            onClick={handlePlaceBet}
            disabled={!canBet}
          >
            {isPlacingBet ? (
              <span className="btn-loading">●●●</span>
            ) : roundState === 'frozen' ? (
              <>❄️ FROZEN</>
            ) : roundState === 'settled' ? (
              <>⏳ SETTLING</>
            ) : (
              <>
                <span className="btn-icon" style={{ color: selectedOption.color }}>{selectedOption.icon}</span>
                <span className="btn-text">PLACE BET</span>
                <span className="btn-amount">${parseFloat(betAmount || '0').toFixed(2)}</span>
              </>
            )}
          </button>

          {/* Timer */}
          <div className="timer-display">
            <span className="timer-value">{String(Math.floor(displayCountdown / 60)).padStart(2, '0')}:{String(displayCountdown % 60).padStart(2, '0')}</span>
            <span className="timer-label">
              {roundState === 'open' ? 'until freeze' : roundState === 'frozen' ? 'settling' : 'next round'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
