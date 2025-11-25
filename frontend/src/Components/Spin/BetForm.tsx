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
  const [isExpanded, setIsExpanded] = useState(false);

  const isPremium = isPremiumUser();
  const minBet = 1;
  const maxBet = isPremium ? 200 : 100;
  const canPlaceBet = roundState === 'open' && timeUntilFreeze > (isPremium ? 5 : 60);

  useEffect(() => {
    switch (market) {
      case 'OUTER': setSelection('BUY'); break;
      case 'MIDDLE': setSelection('BLUE'); break;
      case 'INNER': setSelection('HIGH_VOL'); break;
      case 'GLOBAL': setSelection('INDECISION'); break;
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
        throw new Error('Betting is currently closed');
      }

      const dto: PlaceBetDto = {
        market,
        selection,
        amountUsd: betAmount,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
      };

      const bet = await placeBet(dto);
      setAmount('10');
      onBetPlaced?.(bet);
      setIsExpanded(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place bet';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <div className={`bet-bar ${isExpanded ? 'expanded' : ''}`}>
      <button className="bet-bar-toggle" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? '▼ COLLAPSE BET PANEL' : '▲ PLACE BET'}
      </button>

      <div className="bet-bar-content">
        <div className="bet-bar-header">
          <div className="balance-display">
            <span className="label">Balance:</span>
            <span className="amount">${(wallet?.available || 0).toFixed(2)}</span>
          </div>
          {!canPlaceBet && (
            <div className="status-warning">
              {roundState === 'frozen' || roundState === 'settled' ? 'Betting Closed' : 'Freeze Active'}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bet-bar-form">
          <div className="form-row">
            <div className="form-section">
              <label>Market</label>
              <div className="btn-group">
                <button type="button" className={market === 'OUTER' ? 'active' : ''} onClick={() => setMarket('OUTER')}>Direction</button>
                <button type="button" className={market === 'MIDDLE' ? 'active' : ''} onClick={() => setMarket('MIDDLE')}>Color</button>
                <button type="button" className={market === 'INNER' ? 'active' : ''} onClick={() => setMarket('INNER')}>Volatility</button>
              </div>
            </div>

            <div className="form-section">
              <label>Selection</label>
              <div className="btn-group">
                {market === 'OUTER' && (
                  <>
                    <button type="button" className={selection === 'BUY' ? 'active buy' : ''} onClick={() => setSelection('BUY')}>BUY</button>
                    <button type="button" className={selection === 'SELL' ? 'active sell' : ''} onClick={() => setSelection('SELL')}>SELL</button>
                  </>
                )}
                {market === 'MIDDLE' && (
                  <>
                    <button type="button" className={selection === 'BLUE' ? 'active blue' : ''} onClick={() => setSelection('BLUE')}>BLUE</button>
                    <button type="button" className={selection === 'RED' ? 'active red' : ''} onClick={() => setSelection('RED')}>RED</button>
                  </>
                )}
                {market === 'INNER' && (
                  <>
                    <button type="button" className={selection === 'HIGH_VOL' ? 'active' : ''} onClick={() => setSelection('HIGH_VOL')}>HIGH</button>
                    <button type="button" className={selection === 'LOW_VOL' ? 'active' : ''} onClick={() => setSelection('LOW_VOL')}>LOW</button>
                  </>
                )}
              </div>
            </div>

            <div className="form-section">
              <label>Amount</label>
              <div className="amount-controls">
                <input type="number" min={minBet} max={maxBet} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" disabled={loading || !canPlaceBet} />
                <div className="quick-amounts">
                  {quickAmounts.filter(a => a <= maxBet).map(amt => (
                    <button key={amt} type="button" onClick={() => setAmount(amt.toString())} disabled={loading || !canPlaceBet}>${amt}</button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading || !canPlaceBet || walletLoading || !wallet || (wallet && (wallet.available || 0) < parseFloat(amount || '0'))}>
              {loading ? 'PLACING...' : 'PLACE BET'}
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  );
}