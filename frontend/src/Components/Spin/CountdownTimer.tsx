/**
 * CountdownTimer Component
 * Displays countdown until round settlement with freeze indicator
 */

import React from 'react';

interface CountdownTimerProps {
  countdown: number; // seconds until settlement
  timeUntilFreeze: number; // seconds until freeze
  roundState: 'preopen' | 'open' | 'frozen' | 'settled';
  roundNumber?: number;
}

export default function CountdownTimer({
  countdown,
  timeUntilFreeze,
  roundState,
  roundNumber,
}: CountdownTimerProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (countdown === 0) return 100;
    // Assuming max round duration is 60 seconds (1 minute for dev)
    const maxDuration = 60;
    return ((maxDuration - countdown) / maxDuration) * 100;
  };

  const isFreezeTime = timeUntilFreeze <= 0 && roundState === 'open';

  return (
    <div className={`countdown-timer ${roundState}`}>
      {/* Round Number */}
      {roundNumber !== undefined && (
        <div className="round-number">
          <span className="round-label">Round #</span>
          <span className="round-value">{roundNumber}</span>
        </div>
      )}

      {/* Main Timer Display */}
      <div className="timer-display">
        <div className="timer-label">
          {roundState === 'preopen' && 'Waiting for Round'}
          {roundState === 'open' && (isFreezeTime ? '❄️ Freeze Time' : 'Time Until Settlement')}
          {roundState === 'frozen' && '❄️ Round Frozen'}
          {roundState === 'settled' && '✅ Round Complete'}
        </div>
        
        <div className={`timer-value ${isFreezeTime ? 'freeze-time' : ''}`}>
          {roundState === 'preopen' ? (
            <span className="timer-waiting">⏳</span>
          ) : (
            formatTime(countdown)
          )}
        </div>

        {/* Freeze Warning */}
        {roundState === 'open' && timeUntilFreeze > 0 && timeUntilFreeze <= 10 && (
          <div className="freeze-warning">
            ⚠️ Betting closes in {timeUntilFreeze}s
          </div>
        )}

        {isFreezeTime && (
          <div className="freeze-alert">
            ❄️ Betting Closed - Settlement in Progress
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {roundState !== 'preopen' && (
        <div className="timer-progress-container">
          <div
            className={`timer-progress ${isFreezeTime ? 'freeze' : ''}`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      )}

      {/* State Badges */}
      <div className="timer-badges">
        {roundState === 'open' && !isFreezeTime && (
          <span className="timer-badge open-badge">
            <span className="badge-dot pulse" />
            Betting Open
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
            <span className="info-label">Until Freeze:</span>
            <span className="info-value">{formatTime(timeUntilFreeze)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Until Settlement:</span>
            <span className="info-value">{formatTime(countdown)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

