/**
 * BetForm Component
 * Allows users to place bets on markets
 */

import React, { useState, useEffect } from 'react';
import type { BetMarket, BetSelection, Wallet } from '@/lib/api/spin';
import { placeBet, isPremiumUser } from '@/lib/api/spin';

interface BetFormProps {
  roundId: string | null;
  roundState: 'preopen' | 'open' | 'frozen' | 'settled';
  wallet: Wallet | null;
  onBetPlaced: () => void;
}

export default function BetForm({ roundId, roundState, wallet, onBetPlaced }: BetFormProps) {
  const [selectedMarket, setSelectedMarket] = useState<BetMarket>('OUTER');
  const [selectedSelection, setSelectedSelection] = useState<BetSelection>('BUY');
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Validation
    if (!roundId) {
      setError('No active round');
      return;
    }

    if (roundState !== 'open') {
      setError('Market is closed');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < minBet) {
      setError(`Minimum order is $${minBet}`);
      return;
    }

    if (amountNum > maxBet) {
      setError(`Maximum order is $${maxBet}`);
      return;
    }

    if (wallet && amountNum > wallet.available) {
      setError('Insufficient funds');
      return;
    }

    setIsSubmitting(true);

    try {
      await placeBet({
        market: selectedMarket,
        selection: selectedSelection,
        amountUsd: amountNum,
        idempotencyKey: `bet-${Date.now()}-${Math.random()}`,
      });

      setSuccess(`Order placed: $${amountNum} on ${selectedSelection}`);
      setAmount('');
      
      // Notify parent to refresh
      onBetPlaced();

      // Clear success message after 3 seconds
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
    <div className="bet-form-container">
      <div className="bet-form-header">
        <h3>Place Your Order</h3>
        {isPremium && <span className="premium-badge">⭐ Premium</span>}
      </div>

      <form onSubmit={handleSubmit} className="bet-form">
        {/* Market Selection */}
        <div className="form-group">
          <label className="form-label">Select Market</label>
          <div className="market-buttons">
            <button
              type="button"
              className={`market-btn ${selectedMarket === 'OUTER' ? 'active' : ''}`}
              onClick={() => setSelectedMarket('OUTER')}
            >
              OUTER
              <span className="market-subtitle">Direction</span>
            </button>
            <button
              type="button"
              className={`market-btn ${selectedMarket === 'MIDDLE' ? 'active' : ''}`}
              onClick={() => setSelectedMarket('MIDDLE')}
            >
              MIDDLE
              <span className="market-subtitle">Color Mode</span>
            </button>
            <button
              type="button"
              className={`market-btn ${selectedMarket === 'INNER' ? 'active' : ''}`}
              onClick={() => setSelectedMarket('INNER')}
            >
              INNER
              <span className="market-subtitle">Volatility</span>
            </button>
            <button
              type="button"
              className={`market-btn ${selectedMarket === 'GLOBAL' ? 'active' : ''}`}
              onClick={() => setSelectedMarket('GLOBAL')}
            >
              GLOBAL
              <span className="market-subtitle">Indecision</span>
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

        {/* Amount Input */}
        <div className="form-group">
          <label className="form-label">
            Order Amount ($)
            <span className="balance-info">
              Available: ${wallet?.available.toFixed(2) || '0.00'}
            </span>
          </label>
          <input
            type="number"
            className="amount-input"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            placeholder={`${minBet} - ${maxBet}`}
            min={minBet}
            max={maxBet}
            step="0.01"
            disabled={!canBet}
          />
          
          {/* Quick Amount Buttons */}
          <div className="quick-amounts">
            {[1, 5, 10, 25, 50, 100].map((value) => (
              <button
                key={value}
                type="button"
                className="quick-amount-btn"
                onClick={() => handleQuickAmount(value)}
                disabled={!canBet || (wallet && value > wallet.available)}
              >
                ${value}
              </button>
            ))}
          </div>
        </div>

        {/* Payout Info */}
        {amount && !isNaN(parseFloat(amount)) && (
          <div className="payout-info">
            <div className="payout-row">
              <span>Your Order:</span>
              <span className="payout-value">${parseFloat(amount).toFixed(2)}</span>
            </div>
            <div className="payout-row">
              <span>If Win (2x):</span>
              <span className="payout-value payout-win">
                ${(parseFloat(amount) * 2).toFixed(2)}
              </span>
            </div>
            <div className="payout-row">
              <span>Profit:</span>
              <span className="payout-value payout-profit">
                +${parseFloat(amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && <div className="form-message error-message">{error}</div>}
        {success && <div className="form-message success-message">{success}</div>}

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={!canBet || !amount || parseFloat(amount) < minBet}
        >
          {isSubmitting ? (
            <>
              <span className="spinner" />
              Placing Order...
            </>
          ) : roundState === 'frozen' ? (
            '❄️ Market Frozen'
          ) : roundState === 'settled' ? (
            '⏳ Waiting for Next Round'
          ) : !roundId ? (
            '⏳ No Active Round'
          ) : (
            `Place Order - $${parseFloat(amount || '0').toFixed(2)}`
          )}
        </button>

        {/* Market Rules Info */}
        <div className="betting-rules">
          <div className="rule-item">
            <span className="rule-icon">💡</span>
            <span className="rule-text">Winners receive 2x their order amount</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">⚖️</span>
            <span className="rule-text">Minority side wins (less money = winner)</span>
          </div>
          <div className="rule-item">
            <span className="rule-icon">🎯</span>
            <span className="rule-text">If any pair ties, Indecision wins</span>
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
