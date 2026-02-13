/**
 * CountdownTimer Component
 * Displays countdown until spin settlement with freeze indicator
 * Updated v2.1: Supports sub-round durations (5, 10, 20 minutes)
 */

import React from 'react';
import type { UserRoundDuration } from '@/hooks/useRound';

interface CountdownTimerProps {
  countdown: number; // seconds until main spin settlement
  timeUntilFreeze: number; // seconds until main spin freeze
  roundState: 'preopen' | 'open' | 'frozen' | 'settled';
  roundNumber?: number;
  // Sub-round timing (v2.1)
  userDuration?: UserRoundDuration;
  subRoundCountdown?: number; // User's sub-round countdown
  subRoundTimeUntilFreeze?: number; // User's sub-round freeze time
  currentQuarter?: number; // Current quarter/semi for display
  onDurationChange?: (duration: UserRoundDuration) => void;
}

export default function CountdownTimer({
  countdown,
  timeUntilFreeze,
  roundState,
  roundNumber,
  userDuration = 20,
  subRoundCountdown,
  subRoundTimeUntilFreeze,
  currentQuarter = 1,
  onDurationChange,
}: CountdownTimerProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Use sub-round timing if available, otherwise fall back to main spin
  const displayCountdown = subRoundCountdown !== undefined ? subRoundCountdown : countdown;
  const displayFreezeTime = subRoundTimeUntilFreeze !== undefined ? subRoundTimeUntilFreeze : timeUntilFreeze;

  const getProgressPercentage = (): number => {
    if (displayCountdown === 0) return 100;
    // Calculate based on user's selected duration
    const maxDuration = userDuration * 60; // Convert minutes to seconds
    return ((maxDuration - displayCountdown) / maxDuration) * 100;
  };

  const isFreezeTime = displayFreezeTime <= 0 && roundState === 'open';

  // Get duration label
  const getDurationLabel = (): string => {
    if (userDuration === 5) {
      return `Quarter ${currentQuarter}`;
    } else if (userDuration === 10) {
      return `Half ${currentQuarter}`;
    }
    return 'Full Spin';
  };

  return (
    <div className={`countdown-timer ${roundState}`}>
      {/* Spin Number and Duration Selector */}
      <div className="round-header">
        {roundNumber !== undefined && (
          <div className="round-number">
            <span className="round-label">Spin #</span>
            <span className="round-value">{roundNumber}</span>
          </div>
        )}
        
        {/* Duration Selector */}
        {onDurationChange && roundState === 'open' && (
          <div className="duration-selector">
            <button
              className={`duration-btn ${userDuration === 5 ? 'active' : ''}`}
              onClick={() => onDurationChange(5)}
              title="5-minute quarters"
            >
              5m
            </button>
            <button
              className={`duration-btn ${userDuration === 10 ? 'active' : ''}`}
              onClick={() => onDurationChange(10)}
              title="10-minute halves"
            >
              10m
            </button>
            <button
              className={`duration-btn ${userDuration === 20 ? 'active' : ''}`}
              onClick={() => onDurationChange(20)}
              title="Full 20-minute spin"
            >
              20m
            </button>
          </div>
        )}
      </div>

      {/* Sub-round indicator */}
      {userDuration !== 20 && (
        <div className="sub-round-indicator">
          <span className="sub-round-label">{getDurationLabel()}</span>
        </div>
      )}

      {/* Main Timer Display */}
      <div className="timer-display">
        <div className="timer-label">
          {roundState === 'preopen' && 'Waiting for Spin'}
          {roundState === 'open' && (isFreezeTime ? '❄️ Freeze Time' : `Time Until ${userDuration === 20 ? 'Settlement' : 'Your Settlement'}`)}
          {roundState === 'frozen' && '❄️ Market Frozen'}
          {roundState === 'settled' && '✅ Spin Complete'}
        </div>
        
        <div className={`timer-value ${isFreezeTime ? 'freeze-time' : ''}`}>
          {roundState === 'preopen' ? (
            <span className="timer-waiting">⏳</span>
          ) : (
            formatTime(displayCountdown)
          )}
        </div>

        {/* Freeze Warning - show earlier for sub-rounds */}
        {roundState === 'open' && displayFreezeTime > 0 && displayFreezeTime <= 15 && (
          <div className="freeze-warning">
            ⚠️ Market closes in {displayFreezeTime}s
          </div>
        )}

        {isFreezeTime && (
          <div className="freeze-alert">
            ❄️ Market Closed - Settlement in Progress
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {roundState !== 'preopen' && (
        <div className="timer-progress-container">
          <div
            className={`timer-progress ${isFreezeTime ? 'freeze' : ''}`}
            style={{ width: `${Math.min(100, getProgressPercentage())}%` }}
          />
        </div>
      )}

      {/* State Badges */}
      <div className="timer-badges">
        {roundState === 'open' && !isFreezeTime && (
          <span className="timer-badge open-badge">
            <span className="badge-dot pulse" />
            Market Open
          </span>
        )}
        {isFreezeTime && (
          <span className="timer-badge freeze-badge">
            <span className="badge-dot" />
            Freeze Time
          </span>
        )}
        {roundState === 'frozen' && (
          <span className="timer-badge frozen-badge">
            <span className="badge-dot" />
            Settling...
          </span>
        )}
        {roundState === 'settled' && (
          <span className="timer-badge settled-badge">
            <span className="badge-dot" />
            Settled
          </span>
        )}
      </div>

      {/* Additional Info */}
      {roundState === 'open' && (
        <div className="timer-info">
          <div className="info-item">
            <span className="info-label">Until Your Freeze:</span>
            <span className="info-value">{formatTime(displayFreezeTime)}</span>
          </div>
          {userDuration !== 20 && (
            <div className="info-item">
              <span className="info-label">Main Spin:</span>
              <span className="info-value">{formatTime(countdown)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

