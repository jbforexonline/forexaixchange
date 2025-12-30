"use client";

/**
 * SpinPage - Main Game Interface
 * Integrates all game components for ForexAiXchange Spin feature
 */

import React, { useState, useEffect } from 'react';
import { useRound } from '@/hooks/useRound';
import { useWallet } from '@/hooks/useWallet';
import { getCurrentRoundBets } from '@/lib/api/spin';
import GameBoard from '@/Components/Spin/GameBoard';
import BetForm from '@/Components/Spin/BetForm';
import CountdownTimer from '@/Components/Spin/CountdownTimer';
import ActiveBetsPanel from '@/Components/Spin/ActiveBetsPanel';
import ResultsPanel from '@/Components/Spin/ResultsPanel';
import '@/styles/spin-game.css';

export default function SpinPage() {
  const {
    round,
    totals,
    loading: roundLoading,
    error: roundError,
    countdown,
    timeUntilFreeze,
    state: roundState,
    refresh: refreshRound,
  } = useRound();

  const {
    wallet,
    loading: walletLoading,
    error: walletError,
    refresh: refreshWallet,
  } = useWallet();

  const [userBets, setUserBets] = useState([]);
  const [betsLoading, setBetsLoading] = useState(false);
  const [betsError, setBetsError] = useState(null);
  const [showBetForm, setShowBetForm] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [lastRoundNumber, setLastRoundNumber] = useState(null);

  // Fetch user's bets for current round
  const fetchUserBets = async () => {
    if (!round) return;

    setBetsLoading(true);
    setBetsError(null);

    try {
      const bets = await getCurrentRoundBets();
      setUserBets(bets);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bets';
      setBetsError(message);
      console.error('Failed to fetch user bets:', err);
    } finally {
      setBetsLoading(false);
    }
  };

  // Fetch bets when round changes
  useEffect(() => {
    fetchUserBets();
  }, [round?.id]);

  // Detect round settlement and show results
  useEffect(() => {
    if (round && round.roundNumber !== lastRoundNumber) {
      if (lastRoundNumber !== null && roundState === 'settled') {
        // Round just settled
        setShowResults(true);
        fetchUserBets(); // Refresh to get final bet statuses
      }
      setLastRoundNumber(round.roundNumber);
    }

    // Hide results when new round opens
    if (roundState === 'open' && showResults) {
      setTimeout(() => setShowResults(false), 5000); // Show results for 5 seconds
    }
  }, [round?.roundNumber, roundState]);

  const handleBetPlaced = () => {
    fetchUserBets();
    refreshWallet();
    refreshRound();
  };

  const handleBetCancelled = () => {
    fetchUserBets();
    refreshWallet();
    refreshRound();
  };

  const isLoading = roundLoading || walletLoading;

  if (isLoading && !round) {
    return (
      <div className="spin-page loading">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">Loading Game...</div>
        </div>
      </div>
    );
  }

  if (roundError && !round) {
    return (
      <div className="spin-page error">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Unable to Load Game</div>
          <div className="error-message">{roundError}</div>
          <button className="retry-btn" onClick={refreshRound}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spin-page">
      {/* Header */}
      <div className="spin-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">🎰</span>
            ForexAiXchange Spin
          </h1>
          <p className="page-subtitle">
            Bet on market direction, color mode, or volatility. Minority wins!
          </p>
        </div>

        {/* Wallet Display */}
        <div className="wallet-display">
          <div className="wallet-item">
            <span className="wallet-label">Available:</span>
            <span className="wallet-value">
              ${wallet?.available.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="wallet-item">
            <span className="wallet-label">In Play:</span>
            <span className="wallet-value held">
              ${wallet?.held.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="wallet-item total">
            <span className="wallet-label">Total:</span>
            <span className="wallet-value">
              ${((wallet?.available || 0) + (wallet?.held || 0)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="spin-content">
        {/* Countdown Timer */}
        <div className="countdown-section">
          <CountdownTimer
            countdown={countdown}
            timeUntilFreeze={timeUntilFreeze}
            roundState={roundState}
            roundNumber={round?.roundNumber}
          />
        </div>

        {/* Game Board */}
        <div className="gameboard-section">
          <GameBoard
            totals={totals}
            roundState={roundState}
            winners={
              roundState === 'settled' && round
                ? {
                    outer: round.outerWinner,
                    middle: round.middleWinner,
                    inner: round.innerWinner,
                    indecisionTriggered: round.indecisionTriggered,
                  }
                : null
            }
          />
        </div>

        {/* Two Column Layout */}
        <div className="game-panels">
          {/* Left Panel - Betting & Active Bets */}
          <div className="left-panel">
            {/* Bet Form */}
            {round && (
              <div className="bet-form-section">
                <div className="section-header">
                  <h3>Place Your Bet</h3>
                  <button
                    className="toggle-btn"
                    onClick={() => setShowBetForm(!showBetForm)}
                  >
                    {showBetForm ? '▼ Hide' : '▶ Show'}
                  </button>
                </div>
                {showBetForm && (
                  <BetForm
                    roundId={round.id}
                    roundState={roundState}
                    wallet={wallet}
                    onBetPlaced={handleBetPlaced}
                  />
                )}
              </div>
            )}

            {/* Active Bets */}
            <div className="active-bets-section">
              <div className="section-header">
                <h3>Your Active Bets</h3>
                {betsLoading && <span className="loading-spinner-small" />}
              </div>
              {betsError ? (
                <div className="section-error">
                  <span className="error-icon">⚠️</span>
                  {betsError}
                </div>
              ) : (
                <ActiveBetsPanel
                  bets={userBets}
                  roundState={roundState}
                  onBetCancelled={handleBetCancelled}
                />
              )}
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="right-panel">
            {roundState === 'settled' && round && userBets.length > 0 && (
              <div className="results-section">
                <ResultsPanel
                  bets={userBets}
                  roundNumber={round.roundNumber}
                  winners={{
                    outer: round.outerWinner,
                    middle: round.middleWinner,
                    inner: round.innerWinner,
                    indecisionTriggered: round.indecisionTriggered,
                  }}
                />
              </div>
            )}

            {/* Game Rules */}
            <div className="rules-section">
              <div className="section-header">
                <h3>How to Play</h3>
              </div>
              <div className="rules-content">
                <div className="rule-item">
                  <span className="rule-number">1</span>
                  <div className="rule-text">
                    <strong>Choose a Market:</strong> Outer (Buy/Sell), Middle (Blue/Red), Inner (High/Low Volatility), or Global (Indecision)
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">2</span>
                  <div className="rule-text">
                    <strong>Place Your Bet:</strong> Select your side and enter amount ($1 minimum)
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">3</span>
                  <div className="rule-text">
                    <strong>Minority Wins:</strong> The side with LESS total money wins (gets 2x payout)
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">4</span>
                  <div className="rule-text">
                    <strong>Indecision Override:</strong> If ANY pair ties (equal amounts or 0-0), Indecision wins and all other bets lose
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">5</span>
                  <div className="rule-text">
                    <strong>Freeze Time:</strong> Betting closes in the final seconds before settlement
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {wallet && (
              <div className="stats-section">
                <div className="section-header">
                  <h3>Your Statistics</h3>
                </div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Deposited</div>
                    <div className="stat-value">
                      ${wallet.totalDeposited?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Won</div>
                    <div className="stat-value win">
                      ${wallet.totalWon?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Lost</div>
                    <div className="stat-value lose">
                      ${wallet.totalLost?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Net Profit/Loss</div>
                    <div
                      className={`stat-value ${
                        (wallet.totalWon || 0) - (wallet.totalLost || 0) > 0
                          ? 'win'
                          : 'lose'
                      }`}
                    >
                      ${(
                        (wallet.totalWon || 0) - (wallet.totalLost || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {roundError && (
        <div className="connection-alert">
          <span className="alert-icon">⚠️</span>
          Connection issues detected. Retrying...
        </div>
      )}
    </div>
  );
}
