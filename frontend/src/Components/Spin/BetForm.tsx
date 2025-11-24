"use client";
import React, { useState, useEffect } from 'react';
import { placeBet, type PlaceBetDto, type BetMarket, type BetSelection, isPremiumUser } from '@/lib/api/spin';
import { useWallet } from '@/hooks/useWallet';
import { useRound } from '@/hooks/useRound';
import './BetForm.scss';

interface BetFormProps {
  onBetPlaced?: (bet: any) => void;
  onError?: (error: string) => void;
}

export default function BetForm({ onBetPlaced, onError }: BetFormProps) {
  const { wallet, loading: walletLoading } = useWallet();
  const { round, state: roundState, timeUntilFreeze } = useRound();
  const [market, setMarket] = useState<BetMarket>('OUTER');
  const [selection, setSelection] = useState<BetSelection>('BUY');
  const [amount, setAmount] = useState<string>('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = isPremiumUser();
  const minBet = 1;
  const maxBet = isPremium ? 200 : 100; // Premium: $200, Regular: $100
  const canPlaceBet = roundState === 'open' && timeUntilFreeze > (isPremium ? 5 : 60);

  // Update selection when market changes
  useEffect(() => {
    switch (market) {
      case 'OUTER':
        setSelection('BUY');
        break;
      case 'MIDDLE':
        setSelection('BLUE');
        break;
      case 'INNER':
        setSelection('HIGH_VOL');
        break;
      case 'GLOBAL':
        setSelection('INDECISION');
        break;
    }
  }, [market]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const betAmount = parseFloat(amount);
      
      if (isNaN(betAmount) || betAmount < minBet || betAmount > maxBet) {
        throw new Error(`Bet amount must be between $${minBet} and $${maxBet}`);
      }

      if (!wallet || (wallet.available || 0) < betAmount) {
        throw new Error('Insufficient funds');
      }

      if (!canPlaceBet) {
        throw new Error('Betting is currently closed. Please wait for the next round.');
      }

      const dto: PlaceBetDto = {
        market,
        selection,
        amountUsd: betAmount,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
      };

      const bet = await placeBet(dto);
      setAmount('10'); // Reset amount
      onBetPlaced?.(bet);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place bet';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  // Create quick amounts array, ensuring no duplicates
  const quickAmounts = Array.from(new Set([10, 25, 50, 100, maxBet].filter(a => a <= maxBet))).sort((a, b) => a - b);

  return (
    <div className="bet-form">
      <div className="bet-form-header">
        <h3>Place Your Bet</h3>
        {wallet ? (
          <div className="wallet-balance">
            <span className="label">Available:</span>
            <span className="amount">${(wallet.available || 0).toFixed(2)}</span>
            {(wallet.held || 0) > 0 && (
              <span className="held">Held: ${(wallet.held || 0).toFixed(2)}</span>
            )}
          </div>
        ) : walletLoading ? (
          <div className="wallet-balance">
            <span className="label">Loading balance...</span>
          </div>
        ) : null}
      </div>

      {!canPlaceBet && (
        <div className="bet-form-warning">
          {roundState === 'frozen' || roundState === 'settled' 
            ? 'Betting is closed. Waiting for next round...'
            : timeUntilFreeze <= (isPremium ? 5 : 60)
            ? 'Betting window closed. Freeze time active.'
            : 'No active round available.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bet-form-content">
        {/* Market Selection */}
        <div className="form-group">
          <label>Market</label>
          <div className="market-buttons">
            <button
              type="button"
              className={market === 'OUTER' ? 'active' : ''}
              onClick={() => setMarket('OUTER')}
            >
              Direction
            </button>
            <button
              type="button"
              className={market === 'MIDDLE' ? 'active' : ''}
              onClick={() => setMarket('MIDDLE')}
            >
              Color
            </button>
            <button
              type="button"
              className={market === 'INNER' ? 'active' : ''}
              onClick={() => setMarket('INNER')}
            >
              Volatility
            </button>
            <button
              type="button"
              className={market === 'GLOBAL' ? 'active' : ''}
              onClick={() => setMarket('GLOBAL')}
            >
              Indecision
            </button>
          </div>
        </div>

        {/* Selection */}
        <div className="form-group">
          <label>Selection</label>
          <div className="selection-buttons">
            {market === 'OUTER' && (
              <>
                <button
                  type="button"
                  className={selection === 'BUY' ? 'active buy' : ''}
                  onClick={() => setSelection('BUY')}
                >
                  BUY
                </button>
                <button
                  type="button"
                  className={selection === 'SELL' ? 'active sell' : ''}
                  onClick={() => setSelection('SELL')}
                >
                  SELL
                </button>
              </>
            )}
            {market === 'MIDDLE' && (
              <>
                <button
                  type="button"
                  className={selection === 'BLUE' ? 'active blue' : ''}
                  onClick={() => setSelection('BLUE')}
                >
                  BLUE
                </button>
                <button
                  type="button"
                  className={selection === 'RED' ? 'active red' : ''}
                  onClick={() => setSelection('RED')}
                >
                  RED
                </button>
              </>
            )}
            {market === 'INNER' && (
              <>
                <button
                  type="button"
                  className={selection === 'HIGH_VOL' ? 'active' : ''}
                  onClick={() => setSelection('HIGH_VOL')}
                >
                  HIGH VOL
                </button>
                <button
                  type="button"
                  className={selection === 'LOW_VOL' ? 'active' : ''}
                  onClick={() => setSelection('LOW_VOL')}
                >
                  LOW VOL
                </button>
              </>
            )}
            {market === 'GLOBAL' && (
              <button
                type="button"
                className={selection === 'INDECISION' ? 'active' : ''}
                onClick={() => setSelection('INDECISION')}
                disabled
              >
                INDECISION
              </button>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="form-group">
          <label>Bet Amount</label>
          <div className="amount-input-wrapper">
            <span className="currency">$</span>
            <input
              type="number"
              min={minBet}
              max={maxBet}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={loading || !canPlaceBet}
            />
          </div>
          <div className="quick-amounts">
            {quickAmounts.map((amt, index) => (
              <button
                key={`quick-amt-${amt}-${index}`}
                type="button"
                className="quick-amount-btn"
                onClick={() => setAmount(amt.toString())}
                disabled={loading || !canPlaceBet}
              >
                ${amt}
              </button>
            ))}
          </div>
          <div className="amount-info">
            Min: ${minBet} | Max: ${maxBet} {isPremium && <span className="premium-badge">Premium</span>}
          </div>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <button
          type="submit"
          className="submit-bet-btn"
          disabled={loading || !canPlaceBet || walletLoading || !wallet || (wallet && (wallet.available || 0) < parseFloat(amount || '0'))}
        >
          {loading ? 'Placing Bet...' : `Place Bet (${selection})`}
        </button>
      </form>
    </div>
  );
}

