/**
 * GameBoard Component
 * Displays the 3 pairs (OUTER/MIDDLE/INNER) + GLOBAL (Indecision)
 * Visual representation of the game
 */

import React from 'react';
import type { RoundTotals } from '@/lib/api/spin';

interface GameBoardProps {
  totals: RoundTotals | null;
  roundState: 'preopen' | 'open' | 'frozen' | 'settled';
  winners?: {
    outer?: string | null;
    middle?: string | null;
    inner?: string | null;
    indecisionTriggered?: boolean;
  } | null;
}

export default function GameBoard({ totals, roundState, winners }: GameBoardProps) {
  const getPercentage = (a: number, b: number) => {
    const total = a + b;
    if (total === 0) return { aPercent: 50, bPercent: 50 };
    return {
      aPercent: (a / total) * 100,
      bPercent: (b / total) * 100,
    };
  };

  const isWinner = (layer: 'outer' | 'middle' | 'inner', selection: string) => {
    if (!winners) return false;
    return winners[layer] === selection;
  };

  const outerBuy = totals?.outer?.BUY || 0;
  const outerSell = totals?.outer?.SELL || 0;
  const { aPercent: buyPercent, bPercent: sellPercent } = getPercentage(outerBuy, outerSell);

  const middleBlue = totals?.middle?.BLUE || 0;
  const middleRed = totals?.middle?.RED || 0;
  const { aPercent: bluePercent, bPercent: redPercent } = getPercentage(middleBlue, middleRed);

  const innerHigh = totals?.inner?.HIGH_VOL || 0;
  const innerLow = totals?.inner?.LOW_VOL || 0;
  const { aPercent: highPercent, bPercent: lowPercent } = getPercentage(innerHigh, innerLow);

  const indecisionAmount = totals?.global?.INDECISION || 0;

  return (
    <div className="game-board">
      {/* Indecision Special Indicator */}
      {winners?.indecisionTriggered && (
        <div className="indecision-alert">
          <div className="indecision-banner">
            🎯 INDECISION TRIGGERED! 🎯
            <div className="indecision-message">Market Indecision Occurred - All Layer Bets Lose</div>
          </div>
        </div>
      )}

      {/* OUTER Layer - Buy vs Sell */}
      <div className="game-layer outer-layer">
        <h3 className="layer-title">Direction</h3>
        <div className="pair-container">
          <div 
            className={`pair-option buy-option ${isWinner('outer', 'BUY') ? 'winner' : ''} ${roundState === 'settled' && !isWinner('outer', 'BUY') ? 'loser' : ''}`}
          >
            <div className="option-label">
              <span className="option-icon">📈</span>
              <span className="option-name">BUY</span>
            </div>
            <div className="option-amount">${outerBuy.toFixed(2)}</div>
            <div className="option-bar-container">
              <div 
                className="option-bar buy-bar" 
                style={{ width: `${buyPercent}%` }}
              />
            </div>
            <div className="option-percentage">{buyPercent.toFixed(1)}%</div>
          </div>

          <div className="vs-divider">VS</div>

          <div 
            className={`pair-option sell-option ${isWinner('outer', 'SELL') ? 'winner' : ''} ${roundState === 'settled' && !isWinner('outer', 'SELL') ? 'loser' : ''}`}
          >
            <div className="option-label">
              <span className="option-icon">📉</span>
              <span className="option-name">SELL</span>
            </div>
            <div className="option-amount">${outerSell.toFixed(2)}</div>
            <div className="option-bar-container">
              <div 
                className="option-bar sell-bar" 
                style={{ width: `${sellPercent}%` }}
              />
            </div>
            <div className="option-percentage">{sellPercent.toFixed(1)}%</div>
          </div>
        </div>
        {roundState === 'settled' && winners && (
          <div className="layer-result">
            {winners.outer ? (
              <span className="result-text">Winner: <strong>{winners.outer}</strong></span>
            ) : (
              <span className="result-text">Tied</span>
            )}
          </div>
        )}
      </div>

      {/* MIDDLE Layer - Blue vs Red */}
      <div className="game-layer middle-layer">
        <h3 className="layer-title">Color</h3>
        <div className="pair-container">
          <div 
            className={`pair-option blue-option ${isWinner('middle', 'BLUE') ? 'winner' : ''} ${roundState === 'settled' && !isWinner('middle', 'BLUE') ? 'loser' : ''}`}
          >
            <div className="option-label">
              <span className="option-icon">🔵</span>
              <span className="option-name">BLUE</span>
            </div>
            <div className="option-amount">${middleBlue.toFixed(2)}</div>
            <div className="option-bar-container">
              <div 
                className="option-bar blue-bar" 
                style={{ width: `${bluePercent}%` }}
              />
            </div>
            <div className="option-percentage">{bluePercent.toFixed(1)}%</div>
          </div>

          <div className="vs-divider">VS</div>

          <div 
            className={`pair-option red-option ${isWinner('middle', 'RED') ? 'winner' : ''} ${roundState === 'settled' && !isWinner('middle', 'RED') ? 'loser' : ''}`}
          >
            <div className="option-label">
              <span className="option-icon">🔴</span>
              <span className="option-name">RED</span>
            </div>
            <div className="option-amount">${middleRed.toFixed(2)}</div>
            <div className="option-bar-container">
              <div 
                className="option-bar red-bar" 
                style={{ width: `${redPercent}%` }}
              />
            </div>
            <div className="option-percentage">{redPercent.toFixed(1)}%</div>
          </div>
        </div>
        {roundState === 'settled' && winners && (
          <div className="layer-result">
            {winners.middle ? (
              <span className="result-text">Winner: <strong>{winners.middle}</strong></span>
            ) : (
              <span className="result-text">Tied</span>
            )}
          </div>
        )}
      </div>

      {/* INNER Layer - High Volatile vs Low Volatile */}
      <div className="game-layer inner-layer">
        <h3 className="layer-title">Volatility</h3>
        <div className="pair-container">
          <div 
            className={`pair-option high-option ${isWinner('inner', 'HIGH_VOL') ? 'winner' : ''} ${roundState === 'settled' && !isWinner('inner', 'HIGH_VOL') ? 'loser' : ''}`}
          >
            <div className="option-label">
              <span className="option-icon">⚡</span>
              <span className="option-name">HIGH VOL</span>
            </div>
            <div className="option-amount">${innerHigh.toFixed(2)}</div>
            <div className="option-bar-container">
              <div 
                className="option-bar high-bar" 
                style={{ width: `${highPercent}%` }}
              />
            </div>
            <div className="option-percentage">{highPercent.toFixed(1)}%</div>
          </div>

          <div className="vs-divider">VS</div>

          <div 
            className={`pair-option low-option ${isWinner('inner', 'LOW_VOL') ? 'winner' : ''} ${roundState === 'settled' && !isWinner('inner', 'LOW_VOL') ? 'loser' : ''}`}
          >
            <div className="option-label">
              <span className="option-icon">📊</span>
              <span className="option-name">LOW VOL</span>
            </div>
            <div className="option-amount">${innerLow.toFixed(2)}</div>
            <div className="option-bar-container">
              <div 
                className="option-bar low-bar" 
                style={{ width: `${lowPercent}%` }}
              />
            </div>
            <div className="option-percentage">{lowPercent.toFixed(1)}%</div>
          </div>
        </div>
        {roundState === 'settled' && winners && (
          <div className="layer-result">
            {winners.inner ? (
              <span className="result-text">Winner: <strong>{winners.inner}</strong></span>
            ) : (
              <span className="result-text">Tied</span>
            )}
          </div>
        )}
      </div>

      {/* GLOBAL - Indecision */}
      <div className="game-layer global-layer">
        <h3 className="layer-title">Indecision</h3>
        <div 
          className={`indecision-container ${winners?.indecisionTriggered ? 'winner' : ''} ${roundState === 'settled' && !winners?.indecisionTriggered ? 'loser' : ''}`}
        >
          <div className="indecision-info">
            <span className="indecision-icon">🎯</span>
            <span className="indecision-label">INDECISION</span>
            <span className="indecision-description">(Triggers when any pair ties)</span>
          </div>
          <div className="indecision-amount">${indecisionAmount.toFixed(2)}</div>
        </div>
        {roundState === 'settled' && winners && (
          <div className="layer-result">
            {winners.indecisionTriggered ? (
              <span className="result-text winner-text">✅ INDECISION WON! (2x Payout)</span>
            ) : (
              <span className="result-text loser-text">No Indecision</span>
            )}
          </div>
        )}
      </div>

      {/* Round State Indicator */}
      <div className={`round-state-indicator ${roundState}`}>
        <div className="state-badge">
          {roundState === 'preopen' && '⏳ Waiting for Spin...'}
          {roundState === 'open' && '🟢 OPEN - Place Your Bets!'}
          {roundState === 'frozen' && '❄️ FROZEN - No Bets Allowed'}
          {roundState === 'settled' && '✅ SETTLED - Results Available'}
        </div>
      </div>
    </div>
  );
}

