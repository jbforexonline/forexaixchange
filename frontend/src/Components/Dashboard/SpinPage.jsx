"use client";
import React, { useState, useEffect, useMemo } from "react";
import "../Styles/SpinPage.scss";
import SpinWheel from "../Spin/SpinWheel";
import BetForm from "../Spin/BetForm";
import { useRound } from "@/hooks/useRound";
import { getCurrentRoundBets } from "@/lib/api/spin";
import { getWebSocketClient, initWebSocket } from "@/lib/websocket";

export default function SpinPage() {
  const { round, totals, state: roundState, countdown, timeUntilFreeze, loading, error } = useRound();
  const [userBets, setUserBets] = useState([]);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showBetForm, setShowBetForm] = useState(true);

  // Initialize WebSocket on mount
  useEffect(() => {
    initWebSocket();
    return () => {
      // Cleanup handled by singleton
    };
  }, []);

  // Fetch user's bets for current round
  useEffect(() => {
    if (round) {
      getCurrentRoundBets()
        .then(setUserBets)
        .catch(console.error);
    } else {
      setUserBets([]);
    }
  }, [round?.id]);

  // Listen for bet placed events
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

  // Determine winners from round data (when settled)
  const winners = useMemo(() => {
    if (roundState !== 'settled' || !round) return undefined;
    
    // Extract winners from round (if available in response)
    // This would come from the backend after settlement
    // For now, we'll need to fetch settled round data
    return undefined; // Will be populated when round is settled
  }, [roundState, round]);

  // Handle bet placed
  const handleBetPlaced = (bet) => {
    setUserBets(prev => [...prev, bet]);
    // Refresh totals
    if (round) {
      getCurrentRoundBets()
        .then(setUserBets)
        .catch(console.error);
    }
  };

  // Calculate display countdown (show time until freeze if open, or until settle if frozen)
  const displayCountdown = roundState === 'open' ? timeUntilFreeze : countdown;

  return (
    <div className="spin-page-container">
      <div className="spin-main-area">
        {/* Error Display */}
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && !round && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading spin data...</p>
          </div>
        )}

        {/* Bottom Left - Line Graph */}
        {/* <div className="chart-panel bottom-left">
          <div className="line-graph">
            <svg className="graph-svg" viewBox="0 0 200 100">
              <polyline
                points="10,80 30,60 50,40 70,20 90,30 110,25 130,15 150,10 170,5 190,8"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                className="graph-line"
              />
              <circle cx="10" cy="80" r="2" fill="#ffffff" className="data-point" />
              <circle cx="30" cy="60" r="2" fill="#ffffff" className="data-point" />
              <circle cx="50" cy="40" r="2" fill="#ffffff" className="data-point" />
              <circle cx="70" cy="20" r="2" fill="#ffffff" className="data-point" />
              <circle cx="90" cy="30" r="2" fill="#ffffff" className="data-point" />
              <circle cx="110" cy="25" r="2" fill="#ffffff" className="data-point" />
              <circle cx="130" cy="15" r="2" fill="#ffffff" className="data-point" />
              <circle cx="150" cy="10" r="2" fill="#ffffff" className="data-point" />
              <circle cx="170" cy="5" r="2" fill="#ffffff" className="data-point" />
              <circle cx="190" cy="8" r="2" fill="#ffffff" className="data-point" />
            </svg>
          </div>
        </div> */}

        {/* Top Right - Vertical Bar Chart */}
        {/* <div className="chart-panel top-right">
          <div className="vertical-bars">
            <div className="bar bar-1" style={{ height: '45%' }}></div>
            <div className="bar bar-2" style={{ height: '65%' }}></div>
            <div className="bar bar-3" style={{ height: '35%' }}></div>
            <div className="bar bar-4" style={{ height: '55%' }}></div>
            <div className="bar bar-5" style={{ height: '75%' }}></div>
          </div>
        </div> */}

        {/* User's Active Bets Overlay */}
        {userBets.length > 0 && (
          <div className="user-bets-overlay">
            <h4>Your Active Bets ({userBets.length})</h4>
            <div className="bets-list">
              {userBets.slice(0, 5).map(bet => (
                <div key={bet.id} className="bet-item">
                  <div className="bet-selection">{bet.selection} - {bet.market}</div>
                  <div className="bet-amount">${bet.amountUsd.toFixed(2)}</div>
                </div>
              ))}
              {userBets.length > 5 && (
                <div className="bet-item more">+{userBets.length - 5} more</div>
              )}
            </div>
          </div>
        )}

        {/* Central Spin Wheel - Full Available Space */}
        <div className="wheel-wrapper">
          <SpinWheel 
            state={roundState} 
            countdownSec={displayCountdown} 
            winners={winners} 
          />
        </div>

        {/* Round Info Overlay - Non-intrusive */}
        {round && (
          <div className="round-info-overlay">
            <div className="round-number">Spin #{round.roundNumber}</div>
            <div className="round-state">
              <span className={`state-badge ${roundState}`}>{roundState.toUpperCase()}</span>
            </div>
            {roundState === 'open' && timeUntilFreeze > 0 && (
              <div className="freeze-warning">
                Freeze in {timeUntilFreeze}s
              </div>
            )}
            {totals && (
              <div className="totals-preview">
                <div>BUY: ${totals.outer.BUY.toFixed(2)} | SELL: ${totals.outer.SELL.toFixed(2)}</div>
                <div>BLUE: ${totals.middle.BLUE.toFixed(2)} | RED: ${totals.middle.RED.toFixed(2)}</div>
                <div>HIGH: ${totals.inner.HIGH_VOL.toFixed(2)} | LOW: ${totals.inner.LOW_VOL.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}

        {/* Bet Form - Fixed Bottom */}
        {showBetForm && (
          <div className="bet-form-bottom">
            <BetForm onBetPlaced={handleBetPlaced} />
          </div>
        )}

        {/* Right column - Winners panel and fireworks */}
        {/* <aside className="right-column">
          <div className="indecision-banner">Indecision wins<br/><span className="sub">(Middle tie)</span></div>

          <div className="fireworks">
            <div className="firework fw-1"></div>
            <div className="firework fw-2"></div>
          </div>

        
        </aside> */}
      </div>
    </div>
  );
}
