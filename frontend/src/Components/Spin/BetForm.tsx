"use client";
import React, { useState, useEffect } from "react";
import {
  placeBet,
  type PlaceBetDto,
  type BetMarket,
  type BetSelection,
  isPremiumUser,
} from "@/lib/api/spin";
import { useWallet } from "@/hooks/useWallet";
import { useRound } from "@/hooks/useRound";
import { useDemo } from "@/context/DemoContext";
import "./BetForm.scss";

interface BetFormProps {
  roundId: string | null;
  roundState: 'preopen' | 'open' | 'frozen' | 'settled';
  wallet: Wallet | null;
  onBetPlaced: () => void;
}

export default function BetForm({ onBetPlaced, onError }: BetFormProps) {
  const { wallet, loading: walletLoading } = useWallet();
  const {
    round,
    state: roundState,
    countdown,
    timeUntilFreeze,
    loading: roundLoading,
  } = useRound();
  const { isDemo } = useDemo();
  const [market, setMarket] = useState<BetMarket>("OUTER");
  const [selection, setSelection] = useState<BetSelection>("BUY");
  const [amount, setAmount] = useState<string>("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

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
        throw new Error("Round is finalizing, please wait...");
      }

      const dto: PlaceBetDto = {
        market,
        selection,
        amountUsd: betAmount,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        isDemo,
      };

      const bet = await placeBet(dto);
      setSuccess(`${isDemo ? '[DEMO] ' : ''}Bet placed! $${betAmount.toFixed(2)} on ${selection}`);
      setAmount("10");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canBet = roundState === 'open' && roundId && !isSubmitting;

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
              {round && !isFrozen && <span style={{marginLeft: '10px', opacity: 0.8}}>⏳ {timeUntilFreeze}s</span>}
              {round && isFrozen && <span style={{marginLeft: '10px', opacity: 0.8}}>⏳ Next round: {countdown}s</span>}
            </span>
          )
        }
      </button>

      <div className="bet-bar-content">
        <div className="bet-bar-header">
          <div className="balance-display">
            <span className="label">Balance:</span>
            <span className="amount">
              ${(wallet?.available || 0).toFixed(2)}
            </span>
          </div>
          {!canPlaceBet && (
            <div className="status-warning">
              {roundLoading && "🔄 Fetching round data..."}
              {isFrozen && "❌ Betting closed (round frozen)"}
            </div>
          )}
          {round && !isFrozen && (
            <div className={`timer-display ${timeUntilFreeze < 10 ? 'urgent' : ''}`}>
               ⏳ Closing in: <strong>{timeUntilFreeze}s</strong>
            </div>
          )}
          {round && isFrozen && (
             <div className="timer-display waiting">
               Next round in: <strong>{countdown}s</strong>
             </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bet-bar-form">
          <div className="form-row">
            <div className="form-section">
              <label>Market</label>
              <div className="btn-group">
                <button
                  type="button"
                  className={market === "OUTER" ? "active" : ""}
                  onClick={() => setMarket("OUTER")}
                >
                  Direction
                </button>
                <button
                  type="button"
                  className={market === "MIDDLE" ? "active" : ""}
                  onClick={() => setMarket("MIDDLE")}
                >
                  Color
                </button>
                <button
                  type="button"
                  className={market === "INNER" ? "active" : ""}
                  onClick={() => setMarket("INNER")}
                >
                  Volatility
                </button>
              </div>
            </div>

        {/* Selection Buttons */}
        <div className="form-group">
          <label className="form-label">Choose Side</label>
          <div className="selection-buttons">
            {getSelectionsForMarket(selectedMarket).map((selection) => (
              <button
                key={selection}
                type="button"
                className={`selection-btn ${selectedSelection === selection ? 'active' : ''} ${selection.toLowerCase()}`}
                onClick={() => setSelectedSelection(selection)}
              >
                {getSelectionLabel(selection)}
              </button>
            ))}
          </div>
        </div>

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
                  disabled={loading}
                />
                <div className="quick-amounts">
                  {quickAmounts
                    .filter((a) => a <= maxBet)
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt.toString())}
                        disabled={loading}
                      >
                        ${amt}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={`submit-btn ${isButtonDisabled ? "disabled" : "active"} ${timeUntilFreeze < 10 ? 'pulsing' : ''}`}
              disabled={isButtonDisabled}
            >
              {loading
                ? "⏳ PLACING..."
                : isFrozen 
                  ? "❌ CLOSED" 
                  : `🎯 PLACE BET (${timeUntilFreeze}s)`}
            </button>
          </div>
          {!isPremium && (
            <div className="rule-item premium-notice">
              <span className="rule-icon">⭐</span>
              <span className="rule-text">Upgrade to Premium for higher limits ($200/order)</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
