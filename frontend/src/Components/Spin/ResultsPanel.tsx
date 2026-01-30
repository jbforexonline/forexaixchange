/**
 * ResultsPanel Component
 * Displays round settlement results
 */

import React from 'react';
import type { Bet } from '@/lib/api/spin';

interface ResultsPanelProps {
  bets: Bet[];
  roundNumber?: number;
  winners?: {
    outer?: string | null;
    middle?: string | null;
    inner?: string | null;
    indecisionTriggered?: boolean;
  } | null;
}

export default function ResultsPanel({ bets, roundNumber, winners }: ResultsPanelProps) {
  // Calculate user's results
  const wonBets = bets.filter((b) => b.status === 'WON');
  const lostBets = bets.filter((b) => b.status === 'LOST');
  
  const totalWagered = bets.reduce((sum, bet) => sum + bet.amountUsd, 0);
  const totalWon = wonBets.reduce((sum, bet) => sum + (bet.payoutAmount || 0), 0);
  const totalProfit = totalWon - totalWagered;

  const hasResults = bets.length > 0;
  const isWinner = totalProfit > 0;
  const isLoser = totalProfit < 0;

  if (!hasResults) {
    return (
      <div className="results-panel empty">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <div className="empty-text">No results to display</div>
          <div className="empty-subtext">Place bets to see results after settlement</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`results-panel ${isWinner ? 'winner' : isLoser ? 'loser' : ''}`}>
      <div className="results-header">
        <h3 className="results-title">
          {roundNumber !== undefined ? `Round #${roundNumber} Results` : 'Round Results'}
        </h3>
        {winners?.indecisionTriggered && (
          <div className="indecision-badge">
            🎯 INDECISION TRIGGERED
          </div>
        )}
      </div>

      {/* Overall Result */}
      <div className={`overall-result ${isWinner ? 'win' : isLoser ? 'lose' : 'neutral'}`}>
        <div className="result-icon">
          {isWinner ? '🎉' : isLoser ? '😔' : '➖'}
        </div>
        <div className="result-text">
          {isWinner ? (
            <>
              <div className="result-message">Congratulations!</div>
              <div className="result-amount win">
                +${totalProfit.toFixed(2)}
              </div>
            </>
          ) : isLoser ? (
            <>
              <div className="result-message">Better Luck Next Time</div>
              <div className="result-amount lose">
                ${totalProfit.toFixed(2)}
              </div>
            </>
          ) : (
            <>
              <div className="result-message">Break Even</div>
              <div className="result-amount neutral">$0.00</div>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="results-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Wagered</span>
          <span className="stat-value">${totalWagered.toFixed(2)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Total Won</span>
          <span className="stat-value">${totalWon.toFixed(2)}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Net Profit/Loss</span>
          <span className={`stat-value ${isWinner ? 'win' : isLoser ? 'lose' : 'neutral'}`}>
            {isWinner && '+'}${totalProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bet Breakdown */}
      <div className="results-breakdown">
        <div className="breakdown-header">
          <h4>Your Bets</h4>
          <div className="breakdown-counts">
            <span className="count-item won">{wonBets.length} Won</span>
            <span className="count-item lost">{lostBets.length} Lost</span>
          </div>
        </div>

        <div className="breakdown-list">
          {bets.map((bet) => (
            <div key={bet.id} className={`breakdown-item ${bet.status.toLowerCase()}`}>
              <div className="item-header">
                <span className="item-selection">
                  {getSelectionIcon(bet.selection)} {bet.selection.replace('_', ' ')}
                </span>
                <span className={`item-status ${bet.status.toLowerCase()}`}>
                  {bet.status === 'WON' ? '✅ Won' : bet.status === 'LOST' ? '❌ Lost' : bet.status}
                </span>
              </div>
              <div className="item-details">
                <span className="detail-item">
                  Bet: ${bet.amountUsd.toFixed(2)}
                </span>
                {bet.status === 'WON' && bet.payoutAmount && (
                  <>
                    <span className="detail-separator">→</span>
                    <span className="detail-item win">
                      Payout: ${bet.payoutAmount.toFixed(2)}
                    </span>
                    <span className="detail-separator">→</span>
                    <span className="detail-item profit">
                      Profit: +${(bet.payoutAmount - bet.amountUsd).toFixed(2)}
                    </span>
                  </>
                )}
                {bet.status === 'LOST' && (
                  <>
                    <span className="detail-separator">→</span>
                    <span className="detail-item loss">
                      Lost: -${bet.amountUsd.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Winners Display */}
      {winners && (
        <div className="winners-display">
          <h4 className="winners-title">Winning Selections</h4>
          {winners.indecisionTriggered ? (
            <div className="winner-item indecision">
              <span className="winner-icon">🎯</span>
              <span className="winner-label">INDECISION</span>
              <span className="winner-badge">WINNER</span>
            </div>
          ) : (
            <>
              {winners.outer && (
                <div className="winner-item">
                  <span className="winner-icon">{getSelectionIcon(winners.outer)}</span>
                  <span className="winner-label">{winners.outer}</span>
                  <span className="winner-market">Direction</span>
                </div>
              )}
              {winners.middle && (
                <div className="winner-item">
                  <span className="winner-icon">{getSelectionIcon(winners.middle)}</span>
                  <span className="winner-label">{winners.middle}</span>
                  <span className="winner-market">Color</span>
                </div>
              )}
              {winners.inner && (
                <div className="winner-item">
                  <span className="winner-icon">{getSelectionIcon(winners.inner)}</span>
                  <span className="winner-label">{winners.inner}</span>
                  <span className="winner-market">Volatility</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function
function getSelectionIcon(selection: string): string {
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
}

