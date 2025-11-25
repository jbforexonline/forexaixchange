"use client";
import React, { useState, useEffect } from "react";
import "../Styles/SpinPage.scss";
import SpinWheel from "../Spin/SpinWheel";
import BetForm from "../Spin/BetForm";
import { useRound } from "@/hooks/useRound";
import { getCurrentRoundBets } from "@/lib/api/spin";
import type { Bet } from "@/lib/api/spin";
import { getWebSocketClient, initWebSocket } from "@/lib/websocket";

export default function SpinPage() {
  const { round, totals, state: roundState, countdown, timeUntilFreeze, loading, error } = useRound();
  const [userBets, setUserBets] = useState<Bet[]>([]);

  useEffect(() => {
    initWebSocket();
  }, []);

  useEffect(() => {
    if (round) {
      getCurrentRoundBets()
        .then(setUserBets)
        .catch(console.error);
    } else {
      setUserBets([]);
    }
  }, [round?.id]);

  useEffect(() => {
    const wsClient = getWebSocketClient();
    const unsubscribe = wsClient.on('betPlaced', () => {
      if (round) {
        getCurrentRoundBets()
          .then(setUserBets)
          .catch(console.error);
      }
    });

    return unsubscribe;
  }, [round?.id]);

  const handleBetPlaced = (bet: Bet) => {
    setUserBets(prev => [...prev, bet]);
  };

  const displayCountdown = roundState === 'open' ? timeUntilFreeze : countdown;

  return (
    <div className="spin-page-container">
      <div className="spin-main-area">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {loading && !round && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading round data...</p>
          </div>
        )}

        <div className="wheel-wrapper">
          <SpinWheel 
            state={roundState} 
            countdownSec={displayCountdown} 
            winners={undefined} 
          />
        </div>

        {round && (
          <div className="round-info-overlay">
            <div className="round-number">Round #{round.roundNumber}</div>
            <div className="round-state">
              <span className={`state-badge ${roundState}`}>{roundState.toUpperCase()}</span>
            </div>
            {roundState === 'open' && timeUntilFreeze > 0 && (
              <div className="freeze-warning">
                Freeze in {timeUntilFreeze}s
              </div>
            )}
          </div>
        )}

        {userBets.length > 0 && (
          <div className="user-bets-overlay">
            <h4>Your Active Bets ({userBets.length})</h4>
            <div className="bets-list">
              {userBets.slice(0, 3).map(bet => (
                <div key={bet.id} className="bet-item">
                  <span className="bet-selection">{bet.selection}</span>
                  <span className="bet-amount">${bet.amountUsd.toFixed(2)}</span>
                </div>
              ))}
              {userBets.length > 3 && (
                <div className="bet-item more">+{userBets.length - 3} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      <BetForm onBetPlaced={handleBetPlaced} />
    </div>
  );
}