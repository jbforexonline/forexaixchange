/**
 * ActiveBetsPanel Component
 * Displays user's bets for the current round
 */

import React, { useState } from 'react';
import type { Bet } from '@/lib/api/spin';
import { cancelBet, isPremiumUser } from '@/lib/api/spin';

interface ActiveBetsPanelProps {
  bets: Bet[];
  roundState: 'preopen' | 'open' | 'frozen' | 'settled';
  onBetCancelled: () => void;
}

export default function ActiveBetsPanel({ bets, roundState, onBetCancelled }: ActiveBetsPanelProps) {
  const [cancellingBetId, setCancellingBetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPremium = isPremiumUser();
  const canCancelBets = isPremium && roundState === 'open';

  const handleCancelBet = async (betId: string) => {
    if (!confirm('Are you sure you want to cancel this bet?')) {
      return;
    }

    setCancellingBetId(betId);
    setError(null);

    try {
      await cancelBet(betId);
      onBetCancelled();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel bet';
      setError(message);
    } finally {
      setCancellingBetId(null);
    }
  };

  const getMarketLabel = (market: string): string => {
    const labels: Record<string, string> = {
      OUTER: 'Direction',
      MIDDLE: 'Color Mode',
      INNER: 'Volatility',
      GLOBAL: 'Indecision',
    };
    return labels[market] || market;
  };

  const getSelectionIcon = (selection: string): string => {
    const icons: Record<string, string> = {
      BUY: '📈',
      SELL: '📉',
      BLUE: '🔵',
      RED: '🔴',
      HIGH_VOL: '⚡',
      LOW_VOL: '📊',
      INDECISION: '🎯',
    };
    return icons[selection] || '';
  };

  const getStatusBadge = (bet: Bet) => {
    if (bet.status === 'WON') {
      return <span className="status-badge won">✅ WON</span>;
    }
    if (bet.status === 'LOST') {
      return <span className="status-badge lost">❌ LOST</span>;
    }
    if (bet.status === 'CANCELLED') {
      return <span className="status-badge cancelled">🚫 CANCELLED</span>;
    }
    return <span className="status-badge pending">⏳ PENDING</span>;
  };

  const totalWagered = bets
    .filter((b) => b.status === 'ACCEPTED' || b.status === 'WON' || b.status === 'LOST')
    .reduce((sum, bet) => sum + bet.amountUsd, 0);

  const potentialWin = bets
    .filter((b) => b.status === 'ACCEPTED')
    .reduce((sum, bet) => sum + bet.amountUsd * 2, 0);

  if (bets.length === 0) {
    return (
      <div className="active-bets-panel empty">
        <div className="empty-state">
          <div className="empty-icon">🎲</div>
          <div className="empty-text">No active bets</div>
          <div className="empty-subtext">Place a bet to get started!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="active-bets-panel">
      <div className="panel-header">
        <h3 className="panel-title">Your Bets</h3>
        <div className="bets-summary">
          <div className="summary-item">
            <span className="summary-label">Total Wagered:</span>
            <span className="summary-value">${totalWagered.toFixed(2)}</span>
          </div>
          {potentialWin > 0 && (
            <div className="summary-item">
              <span className="summary-label">Potential Win:</span>
              <span className="summary-value win">${potentialWin.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="panel-error">
          {error}
          <button
            className="error-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="bets-list">
        {bets.map((bet) => (
          <div key={bet.id} className={`bet-card ${bet.status.toLowerCase()}`}>
            <div className="bet-card-header">
              <div className="bet-market">
                <span className="market-name">{getMarketLabel(bet.market)}</span>
              </div>
              {getStatusBadge(bet)}
            </div>

            <div className="bet-card-body">
              <div className="bet-selection">
                <span className="selection-icon">{getSelectionIcon(bet.selection)}</span>
                <span className="selection-name">{bet.selection.replace('_', ' ')}</span>
              </div>

              <div className="bet-amounts">
                <div className="bet-amount-row">
                  <span className="amount-label">Bet:</span>
                  <span className="amount-value">${bet.amountUsd.toFixed(2)}</span>
                </div>

                {bet.status === 'WON' && bet.payoutAmount && (
                  <>
                    <div className="bet-amount-row win">
                      <span className="amount-label">Payout:</span>
                      <span className="amount-value">${bet.payoutAmount.toFixed(2)}</span>
                    </div>
                    <div className="bet-amount-row profit">
                      <span className="amount-label">Profit:</span>
                      <span className="amount-value">
                        +${(bet.payoutAmount - bet.amountUsd).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {bet.status === 'LOST' && (
                  <div className="bet-amount-row loss">
                    <span className="amount-label">Lost:</span>
                    <span className="amount-value">-${bet.amountUsd.toFixed(2)}</span>
                  </div>
                )}

                {bet.status === 'ACCEPTED' && (
                  <div className="bet-amount-row potential">
                    <span className="amount-label">Potential Win:</span>
                    <span className="amount-value">
                      ${(bet.amountUsd * 2).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {bet.status === 'ACCEPTED' && canCancelBets && (
              <div className="bet-card-footer">
                <button
                  className="cancel-bet-btn"
                  onClick={() => handleCancelBet(bet.id)}
                  disabled={cancellingBetId === bet.id}
                >
                  {cancellingBetId === bet.id ? (
                    <>
                      <span className="spinner-small" />
                      Cancelling...
                    </>
                  ) : (
                    '🚫 Cancel Bet'
                  )}
                </button>
              </div>
            )}

            {bet.status === 'ACCEPTED' && !canCancelBets && !isPremium && (
              <div className="bet-card-footer">
                <div className="premium-notice-small">
                  ⭐ Premium users can cancel bets before freeze
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

