"use client";
/**
 * BetForm Component
 * Handles bet placement with market/selection/amount
 * Updated v2.1: Supports sub-round durations (5, 10, 20 minutes)
 */
import React, { useState, useEffect } from "react";
import {
  placeBet,
  type PlaceBetDto,
  type BetMarket,
  type BetSelection,
  isPremiumUser,
} from "@/lib/api/spin";
import { useWallet } from "@/hooks/useWallet";
import { useRound, type UserRoundDuration } from "@/hooks/useRound";
import { useDemo } from "@/context/DemoContext";
import "./BetForm.scss";

interface BetFormProps {
  onBetPlaced?: () => void;
  onError?: (error: string) => void;
}

const quickAmounts = [5, 10, 25, 50, 100];

export default function BetForm({ onBetPlaced, onError }: BetFormProps) {
  const { wallet, loading: walletLoading, refresh: refreshWallet } = useWallet();
  const {
    round,
    state: roundState,
    countdown,
    timeUntilFreeze,
    subRoundCountdown,
    subRoundTimeUntilFreeze,
    userDuration,
    currentQuarter,
    loading: roundLoading,
    setUserDuration,
  } = useRound();
  const { isDemo } = useDemo();

  const [selectedMarket, setSelectedMarket] = useState<BetMarket>("OUTER");
  const [selectedSelection, setSelectedSelection] = useState<BetSelection>("BUY");
  const [amount, setAmount] = useState<string>("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const isPremium = isPremiumUser();
  const minBet = 1;
  const maxBet = isPremium ? 200 : 1000; // Premium: $200, Regular: $1000

  // Update selection when market changes
  useEffect(() => {
    const defaultSelections: Record<BetMarket, BetSelection> = {
      OUTER: 'BUY',
      MIDDLE: 'BLUE',
      INNER: 'HIGH_VOL',
      GLOBAL: 'INDECISION',
    };
    setSelectedSelection(defaultSelections[selectedMarket]);
  }, [selectedMarket]);

  const getSelectionsForMarket = (market: BetMarket): BetSelection[] => {
    const selections: Record<BetMarket, BetSelection[]> = {
      OUTER: ['BUY', 'SELL'],
      MIDDLE: ['BLUE', 'RED'],
      INNER: ['HIGH_VOL', 'LOW_VOL'],
      GLOBAL: ['INDECISION'],
    };
    return selections[market];
  };

  const getSelectionLabel = (selection: BetSelection): string => {
    const labels: Record<BetSelection, string> = {
      BUY: '📈 Buy',
      SELL: '📉 Sell',
      BLUE: '🔵 Blue',
      RED: '🔴 Red',
      HIGH_VOL: '⚡ High Volatile',
      LOW_VOL: '📊 Low Volatile',
      INDECISION: '🎯 Indecision',
    };
    return labels[selection];
  };

  const getDurationLabel = (): string => {
    if (userDuration === 5) {
      return `Q${currentQuarter}`;
    } else if (userDuration === 10) {
      return `H${currentQuarter}`;
    }
    return 'Full';
  };

  // Calculate derived state
  const betAmount = parseFloat(amount) || 0;
  const availableBalance = isDemo ? (wallet?.demoAvailable ?? 0) : (wallet?.available ?? 0);
  const isInvalidAmount = betAmount < minBet || betAmount > maxBet;
  const isInsufficientFunds = betAmount > availableBalance;
  // Use sub-round freeze time for the user's selected duration
  const displayFreezeTime = subRoundTimeUntilFreeze ?? timeUntilFreeze;
  const isFrozen = roundState !== 'open' || displayFreezeTime <= 0;
  const canPlaceBet = !isFrozen && round && !isSubmitting && !walletLoading && !roundLoading;
  const isButtonDisabled = isSubmitting || isInvalidAmount || isInsufficientFunds || !canPlaceBet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (isInvalidAmount) {
        throw new Error(`Bet must be between $${minBet} and $${maxBet}`);
      }
      if (!wallet) {
        throw new Error("Wallet not loaded");
      }
      if (isInsufficientFunds) {
        throw new Error("Insufficient balance");
      }
      if (!round) {
        throw new Error("Waiting for next round...");
      }
      if (isFrozen) {
        throw new Error("Market is closed for your timeframe");
      }

      const dto: PlaceBetDto = {
        market: selectedMarket,
        selection: selectedSelection,
        amountUsd: betAmount,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        isDemo,
        userRoundDuration: userDuration, // v2.1: Include user's selected duration
      };

      const bet = await placeBet(dto);
      setSuccess(`${isDemo ? '[DEMO] ' : ''}Bet placed! $${betAmount.toFixed(2)} on ${selectedSelection} (${userDuration}m)`);
      setAmount("10");
      refreshWallet();
      onBetPlaced?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setError(message);
      onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDurationChange = (duration: UserRoundDuration) => {
    setUserDuration(duration);
  };

  return (
    <div className={`bet-bar ${isExpanded ? "expanded" : ""}`}>
      <button
        className="bet-bar-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded 
          ? "▼ COLLAPSE BET PANEL" 
          : (
            <span>
              ▲ PLACE BET 
              {round && !isFrozen && <span style={{marginLeft: '10px', opacity: 0.8}}>⏳ {displayFreezeTime}s</span>}
              {round && isFrozen && <span style={{marginLeft: '10px', opacity: 0.8}}>⏳ Next: {subRoundCountdown ?? countdown}s</span>}
            </span>
          )
        }
      </button>

      <div className="bet-bar-content">
        <div className="bet-bar-header">
          <div className="balance-display">
            <span className="label">{isDemo ? 'Demo ' : ''}Balance:</span>
            <span className="amount">
              ${availableBalance.toFixed(2)}
            </span>
          </div>

          {/* Duration Selector - v2.1 */}
          <div className="duration-selector">
            <span className="duration-label">Duration:</span>
            <div className="duration-buttons">
              <button
                type="button"
                className={`duration-btn ${userDuration === 5 ? 'active' : ''}`}
                onClick={() => handleDurationChange(5)}
                title="5-minute quarters (4 settlements per round)"
              >
                5m
              </button>
              <button
                type="button"
                className={`duration-btn ${userDuration === 10 ? 'active' : ''}`}
                onClick={() => handleDurationChange(10)}
                title="10-minute halves (2 settlements per round)"
              >
                10m
              </button>
              <button
                type="button"
                className={`duration-btn ${userDuration === 20 ? 'active' : ''}`}
                onClick={() => handleDurationChange(20)}
                title="Full 20-minute round (1 settlement)"
              >
                20m
              </button>
            </div>
            {userDuration !== 20 && (
              <span className="duration-info">{getDurationLabel()}</span>
            )}
          </div>

          {!canPlaceBet && (
            <div className="status-warning">
              {roundLoading && "🔄 Loading..."}
              {isFrozen && !roundLoading && `❌ Betting closed (${userDuration}m freeze)`}
            </div>
          )}
          {round && !isFrozen && (
            <div className={`timer-display ${displayFreezeTime < 15 ? 'urgent' : ''}`}>
              ⏳ Closing in: <strong>{displayFreezeTime}s</strong>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bet-bar-form">
          {/* Error/Success Messages */}
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <div className="form-row">
            {/* Market Selection */}
            <div className="form-section">
              <label>Market</label>
              <div className="btn-group">
                <button
                  type="button"
                  className={selectedMarket === "OUTER" ? "active" : ""}
                  onClick={() => setSelectedMarket("OUTER")}
                >
                  Direction
                </button>
                <button
                  type="button"
                  className={selectedMarket === "MIDDLE" ? "active" : ""}
                  onClick={() => setSelectedMarket("MIDDLE")}
                >
                  Color
                </button>
                <button
                  type="button"
                  className={selectedMarket === "INNER" ? "active" : ""}
                  onClick={() => setSelectedMarket("INNER")}
                >
                  Volatility
                </button>
                <button
                  type="button"
                  className={selectedMarket === "GLOBAL" ? "active" : ""}
                  onClick={() => setSelectedMarket("GLOBAL")}
                >
                  Indecision
                </button>
              </div>
            </div>

            {/* Selection Buttons */}
            <div className="form-section">
              <label>Choose Side</label>
              <div className="selection-buttons">
                {getSelectionsForMarket(selectedMarket).map((selection) => (
                  <button
                    key={selection}
                    type="button"
                    className={`selection-btn ${selectedSelection === selection ? 'active' : ''} ${selection.toLowerCase().replace('_', '-')}`}
                    onClick={() => setSelectedSelection(selection)}
                  >
                    {getSelectionLabel(selection)}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div className="form-section">
              <label>Amount</label>
              <div className="amount-controls">
                <input
                  type="number"
                  min={minBet}
                  max={maxBet}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  disabled={isSubmitting}
                />
                <div className="quick-amounts">
                  {quickAmounts
                    .filter((a) => a <= maxBet)
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        disabled={isSubmitting}
                        className={amount === amt.toString() ? 'active' : ''}
                      >
                        ${amt}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`submit-btn ${isButtonDisabled ? "disabled" : "active"} ${displayFreezeTime < 15 && !isFrozen ? 'pulsing' : ''}`}
              disabled={isButtonDisabled}
            >
              {isSubmitting
                ? "⏳ PLACING..."
                : isFrozen 
                  ? "❌ CLOSED" 
                  : `🎯 PLACE BET (${displayFreezeTime}s)`}
            </button>
          </div>

          {/* Info/Notices */}
          <div className="form-notices">
            {userDuration !== 20 && (
              <div className="rule-item duration-notice">
                <span className="rule-icon">⏱️</span>
                <span className="rule-text">
                  {userDuration === 5 
                    ? `Quarter ${currentQuarter} of 4 - settles every 5 minutes`
                    : `Half ${currentQuarter} of 2 - settles every 10 minutes`
                  }
                </span>
              </div>
            )}
            {!isPremium && (
              <div className="rule-item premium-notice">
                <span className="rule-icon">⭐</span>
                <span className="rule-text">Upgrade to Premium for higher limits ($200/order)</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
