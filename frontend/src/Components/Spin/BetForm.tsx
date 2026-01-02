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
  onBetPlaced?: (bet: any) => void;
  onError?: (error: string) => void;
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
  const [isExpanded, setIsExpanded] = useState(false);

  const isPremium = isPremiumUser();
  const minBet = 1;
  const maxBet = isPremium ? 200 : 100;
  const betAmount = parseFloat(amount) || 0;
  const availableBalance = wallet?.available || 0;
  const isFrozen = roundState === "frozen" || roundState === "settled";
  const isInsufficientFunds = betAmount > 0 && betAmount > availableBalance;
  const isInvalidAmount = betAmount < minBet || betAmount > maxBet;
  const hasNoRound = !round;

  // Allow betting when: round exists, not frozen, and has balance
  const canPlaceBet =
    !isFrozen && round && availableBalance >= minBet && !loading;
  const isButtonDisabled =
    loading ||
    !canPlaceBet ||
    walletLoading ||
    isInvalidAmount ||
    isInsufficientFunds ||
    hasNoRound;

  useEffect(() => {
    switch (market) {
      case "OUTER":
        setSelection("BUY");
        break;
      case "MIDDLE":
        setSelection("BLUE");
        break;
      case "INNER":
        setSelection("HIGH_VOL");
        break;
      case "GLOBAL":
        setSelection("INDECISION");
        break;
    }
  }, [market]);

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
      onBetPlaced?.(bet);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to place bet";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

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

            <div className="form-section">
              <label>Selection</label>
              <div className="btn-group">
                {market === "OUTER" && (
                  <>
                    <button
                      type="button"
                      className={selection === "BUY" ? "active buy" : ""}
                      onClick={() => setSelection("BUY")}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      className={selection === "SELL" ? "active sell" : ""}
                      onClick={() => setSelection("SELL")}
                    >
                      SELL
                    </button>
                  </>
                )}
                {market === "MIDDLE" && (
                  <>
                    <button
                      type="button"
                      className={selection === "BLUE" ? "active blue" : ""}
                      onClick={() => setSelection("BLUE")}
                    >
                      BLUE
                    </button>
                    <button
                      type="button"
                      className={selection === "RED" ? "active red" : ""}
                      onClick={() => setSelection("RED")}
                    >
                      RED
                    </button>
                  </>
                )}
                {market === "INNER" && (
                  <>
                    <button
                      type="button"
                      className={selection === "HIGH_VOL" ? "active" : ""}
                      onClick={() => setSelection("HIGH_VOL")}
                    >
                      HIGH
                    </button>
                    <button
                      type="button"
                      className={selection === "LOW_VOL" ? "active" : ""}
                      onClick={() => setSelection("LOW_VOL")}
                    >
                      LOW
                    </button>
                  </>
                )}
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

          {error && <div className="error-msg">❌ {error}</div>}
          {success && <div className="success-msg">✅ {success}</div>}
        </form>
      </div>
    </div>
  );
}
