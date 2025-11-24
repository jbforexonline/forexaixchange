"use client";
import React, { useState, useEffect, useMemo } from "react";
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
  const handleBetPlaced = (bet: Bet) => {
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
    <div className="neural-interface">
      <div className="interface-container">
        {/* Header */}
        <header className="spin-header">
          <h2>
            {round ? `Round #${round.roundNumber}` : 'Waiting for Round...'}
          </h2>
          <div className="header-controls">
            <button
              className="overlay-toggle"
              onClick={() => setShowOverlays((s) => !s)}
              title="Toggle decorative overlays"
            >
              {showOverlays ? 'Hide Overlays' : 'Show Overlays'}
            </button>
            <button
              className="bet-form-toggle"
              onClick={() => setShowBetForm((s) => !s)}
              title="Toggle bet form"
            >
              {showBetForm ? 'Hide Bet Form' : 'Show Bet Form'}
            </button>
          </div>
        </header>

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
            <p>Loading round data...</p>
          </div>
        )}
        {/* Top Left - Vertical Bar Chart */}
        <div className="chart-panel top-left">
          {/* <div className="vertical-bars">
            <div className="bar bar-1" style={{ height: '60%' }}></div>
            <div className="bar bar-2" style={{ height: '40%' }}></div>
            <div className="bar bar-3" style={{ height: '80%' }}></div>
            <div className="bar bar-4" style={{ height: '30%' }}></div>
            <div className="bar bar-5" style={{ height: '70%' }}></div>
          </div> */}
          {/* <div className="scale-labels">
            <span>-100</span>
            <span>-200</span>
            <span>-300</span>
            <span>-400</span>
            <span>-500</span>
          </div> */}
          {/* <div className="horizontal-bars">
            <div className="h-bar h-bar-1"></div>
            <div className="h-bar h-bar-2"></div>
            <div className="h-bar h-bar-3"></div>
            <div className="h-bar h-bar-4"></div>
          </div> */}
        </div>

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

        {/* Bottom Right - Dual Line Graph */}
        <div className="chart-panel bottom-right">
          <div className="dual-line-graph">
            <svg className="graph-svg" viewBox="0 0 200 100">
              {/* First Line - Solid Blue */}
              <polyline
                points="10,70 30,50 50,60 70,40 90,30 110,45 130,35 150,25 170,20 190,15"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                className="graph-line-1"
              />
              {/* Second Line - Dashed White */}
              <polyline
                points="10,50 30,40 50,30 70,50 90,60 110,40 130,50 150,60 170,55 190,50"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray="5,5"
                className="graph-line-2"
              />
              {/* Data Points */}
              <circle cx="10" cy="70" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="30" cy="50" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="50" cy="60" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="70" cy="40" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="90" cy="30" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="110" cy="45" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="130" cy="35" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="150" cy="25" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="170" cy="20" r="1.5" fill="#3b82f6" className="data-point" />
              <circle cx="190" cy="15" r="1.5" fill="#3b82f6" className="data-point" />
              
              <circle cx="10" cy="50" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="30" cy="40" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="50" cy="30" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="70" cy="50" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="90" cy="60" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="110" cy="40" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="130" cy="50" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="150" cy="60" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="170" cy="55" r="1.5" fill="#ffffff" className="data-point" />
              <circle cx="190" cy="50" r="1.5" fill="#ffffff" className="data-point" />
            </svg>
          </div>
          <div className="waveform">
            <div className="wave-bar wave-1"></div>
            <div className="wave-bar wave-2"></div>
            <div className="wave-bar wave-3"></div>
            <div className="wave-bar wave-4"></div>
            <div className="wave-bar wave-5"></div>
            <div className="wave-bar wave-6"></div>
            <div className="wave-bar wave-7"></div>
            <div className="wave-bar wave-8"></div>
          </div>
        </div>

        {/* Central Brain Interface - replaced with SpinWheel SVG while keeping surrounding layout */}
        <div className="central-brain left-column">
          <div className="brain-container">
            {/* Inserted Spin Wheel SVG (keeps the original design feel) */}
            <div className={`spinwheel-wrapper ${roundState === 'open' ? 'spinning' : ''} ${showOverlays ? '' : 'hide-overlays'}`}>
              {/* background image (place your uploaded image at /public/image/ai-brain.png) */}
              {showOverlays && (
                <img
                  src="/image/ai-brain.png"
                  alt="neural graphic"
                  className="spin-bg"
                  aria-hidden="true"
                  style={{ pointerEvents: 'none' }}
                  onError={(e) => {
                    // Hide image if it fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <SpinWheel 
                state={roundState} 
                countdownSec={displayCountdown} 
                winners={winners} 
              />
            </div>

            {/* Round Info */}
            {round && (
              <div className="round-info">
                <div className="round-state">
                  State: <span className={`state-badge ${roundState}`}>{roundState.toUpperCase()}</span>
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
          </div>
        </div>

        {/* Bet Form Sidebar */}
        {showBetForm && (
          <div className="bet-form-sidebar">
            <BetForm onBetPlaced={handleBetPlaced} />
            
            {/* User's Current Bets */}
            {userBets.length > 0 && (
              <div className="user-bets">
                <h4>Your Bets</h4>
                <div className="bets-list">
                  {userBets.map(bet => (
                    <div key={bet.id} className="bet-item">
                      <div className="bet-market">{bet.market} - {bet.selection}</div>
                      <div className="bet-amount">${bet.amountUsd.toFixed(2)}</div>
                      {bet.isWinner !== null && (
                        <div className={`bet-result ${bet.isWinner ? 'win' : 'loss'}`}>
                          {bet.isWinner ? `+$${bet.profitAmount?.toFixed(2)}` : 'Lost'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
