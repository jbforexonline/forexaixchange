/**
 * Custom hook for managing round state and data
 * Updated v2.1: Supports sub-round durations (5, 10, 20 minutes)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentRound, getRoundTotals, type Round, type RoundTotals } from '@/lib/api/spin';
import { getWebSocketClient } from '@/lib/websocket';

// Valid user round duration options (removed 15-minute)
export type UserRoundDuration = 5 | 10 | 20;

export interface RoundState {
  round: Round | null;
  totals: RoundTotals | null;
  loading: boolean;
  error: string | null;
  countdown: number; // seconds until settle (main round)
  timeUntilFreeze: number; // seconds until freeze (main round)
  state: 'preopen' | 'open' | 'frozen' | 'settled';
  // Sub-round timing (v2.1)
  userDuration: UserRoundDuration; // User's selected duration
  subRoundCountdown: number; // Countdown for user's selected duration
  subRoundTimeUntilFreeze: number; // Time until user's sub-round freeze
  currentQuarter: number; // For 5-min: 1-4, For 10-min: 1-2, For 20-min: 1
}

/**
 * Calculate sub-round checkpoint times based on main round
 */
function getSubRoundTiming(
  round: Round,
  userDuration: UserRoundDuration
): { nextCheckpoint: number; timeUntilCheckpoint: number; timeUntilFreeze: number; quarter: number } {
  const now = Date.now();
  const openedAt = new Date(round.openedAt).getTime();
  const settleAt = new Date(round.settleAt).getTime();
  const roundDurationMs = round.roundDuration * 1000; // Convert to ms
  
  const elapsed = now - openedAt;
  const timeRemaining = settleAt - now;
  const timeRemainingMinutes = timeRemaining / (60 * 1000);
  
  const freezeOffset = 60 * 1000; // 60 seconds freeze before each checkpoint
  
  if (userDuration === 5) {
    // 5-minute quarters: Q1 ends at 15:00, Q2 at 10:00, Q3 at 5:00, Q4 at 0:00
    let quarter: number;
    let nextCheckpoint: number;
    
    if (timeRemainingMinutes > 15) {
      quarter = 1;
      nextCheckpoint = openedAt + (roundDurationMs - 15 * 60 * 1000); // 15:00 mark
    } else if (timeRemainingMinutes > 10) {
      quarter = 2;
      nextCheckpoint = openedAt + (roundDurationMs - 10 * 60 * 1000); // 10:00 mark
    } else if (timeRemainingMinutes > 5) {
      quarter = 3;
      nextCheckpoint = openedAt + (roundDurationMs - 5 * 60 * 1000); // 5:00 mark
    } else {
      quarter = 4;
      nextCheckpoint = settleAt; // 0:00 mark
    }
    
    const timeUntilCheckpoint = Math.max(0, nextCheckpoint - now);
    const timeUntilFreeze = Math.max(0, nextCheckpoint - freezeOffset - now);
    
    return { nextCheckpoint, timeUntilCheckpoint: timeUntilCheckpoint / 1000, timeUntilFreeze: timeUntilFreeze / 1000, quarter };
  } else if (userDuration === 10) {
    // 10-minute semi-circles: Semi1 ends at 10:00, Semi2 at 0:00
    let quarter: number;
    let nextCheckpoint: number;
    
    if (timeRemainingMinutes > 10) {
      quarter = 1;
      nextCheckpoint = openedAt + (roundDurationMs - 10 * 60 * 1000); // 10:00 mark
    } else {
      quarter = 2;
      nextCheckpoint = settleAt; // 0:00 mark
    }
    
    const timeUntilCheckpoint = Math.max(0, nextCheckpoint - now);
    const timeUntilFreeze = Math.max(0, nextCheckpoint - freezeOffset - now);
    
    return { nextCheckpoint, timeUntilCheckpoint: timeUntilCheckpoint / 1000, timeUntilFreeze: timeUntilFreeze / 1000, quarter };
  } else {
    // 20-minute full round
    const freezeAt = new Date(round.freezeAt).getTime();
    const timeUntilCheckpoint = Math.max(0, settleAt - now) / 1000;
    const timeUntilFreeze = Math.max(0, freezeAt - now) / 1000;
    
    return { nextCheckpoint: settleAt, timeUntilCheckpoint, timeUntilFreeze, quarter: 1 };
  }
}

export function useRound(initialDuration: UserRoundDuration = 20) {
  const [userDuration, setUserDuration] = useState<UserRoundDuration>(initialDuration);
  const [roundState, setRoundState] = useState<RoundState>({
    round: null,
    totals: null,
    loading: true,
    error: null,
    countdown: 0,
    timeUntilFreeze: 0,
    state: 'preopen',
    userDuration: initialDuration,
    subRoundCountdown: 0,
    subRoundTimeUntilFreeze: 0,
    currentQuarter: 1,
  });

  const roundRef = useRef<Round | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync userDuration when initialDuration prop changes
  useEffect(() => {
    setUserDuration(initialDuration);
  }, [initialDuration]);

  // Calculate countdown and state from a round (including sub-round timing)
  const calculateState = useCallback((round: Round | null, duration: UserRoundDuration): Pick<RoundState, 'countdown' | 'timeUntilFreeze' | 'state' | 'subRoundCountdown' | 'subRoundTimeUntilFreeze' | 'currentQuarter'> => {
    if (!round) {
      return { countdown: 0, timeUntilFreeze: 0, state: 'preopen', subRoundCountdown: 0, subRoundTimeUntilFreeze: 0, currentQuarter: 1 };
    }

    const now = Date.now();
    const freezeAt = new Date(round.freezeAt).getTime();
    const settleAt = new Date(round.settleAt).getTime();

    const timeUntilFreeze = Math.max(0, Math.floor((freezeAt - now) / 1000));
    const countdown = Math.max(0, Math.floor((settleAt - now) / 1000));

    // Calculate sub-round timing
    const subRoundTiming = getSubRoundTiming(round, duration);

    let state: 'preopen' | 'open' | 'frozen' | 'settled';
    if (round.state === 'SETTLED') {
      state = 'settled';
    } else if (round.state === 'FROZEN' || round.state === 'SETTLING') {
      state = 'frozen';
    } else if (subRoundTiming.timeUntilFreeze <= 0) {
      // User's sub-round is frozen
      state = 'frozen';
    } else {
      state = 'open';
    }

    return { 
      countdown, 
      timeUntilFreeze, 
      state,
      subRoundCountdown: Math.floor(subRoundTiming.timeUntilCheckpoint),
      subRoundTimeUntilFreeze: Math.floor(subRoundTiming.timeUntilFreeze),
      currentQuarter: subRoundTiming.quarter,
    };
  }, []);

  // Fetch current round
  const fetchRound = useCallback(async () => {
    try {
      console.log('useRound: Fetching current round...');
      const data = await getCurrentRound();
      console.log('useRound: Got response:', data);

      if (data.round) {
        console.log('useRound: Round found:', data.round.roundNumber, data.round.state);
        roundRef.current = data.round;
        const calculated = calculateState(data.round, userDuration);
        console.log('useRound: Calculated state:', calculated);

        setRoundState(prev => ({
          ...prev,
          round: data.round!,
          loading: false,
          error: null,
          userDuration,
          ...calculated,
        }));

        // Fetch totals in background
        if (data.round.id) {
          getRoundTotals(data.round.id)
            .then(totalsData => {
              setRoundState(prev => ({
                ...prev,
                totals: totalsData.totals,
              }));
            })
            .catch(err => console.error('Failed to fetch totals:', err));
        }
      } else {
        console.log('useRound: No round found');
        roundRef.current = null;
        setRoundState(prev => ({
          ...prev,
          round: null,
          loading: false,
          countdown: 0,
          timeUntilFreeze: 0,
          state: 'preopen',
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch round';
      console.error('useRound: Failed to fetch round:', error);
      setRoundState(prev => ({
        ...prev,
        error: message,
        loading: false,
      }));
    }
  }, [calculateState, userDuration]);

  // Initial fetch on mount
  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Update countdown every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (roundRef.current) {
        const calculated = calculateState(roundRef.current, userDuration);
        setRoundState(prev => ({
          ...prev,
          ...calculated,
        }));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [calculateState, userDuration]);

  // Poll for round updates every 3 seconds (fast polling for dev)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchRound();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [fetchRound]);

  // Setup WebSocket listeners
  useEffect(() => {
    const client = getWebSocketClient();

    // Connect if not already connected
    if (client.getState() === 'CLOSED') {
      client.connect();
    }

    // Listen for round updates
    const unsubscribeRoundSettled = client.on('roundSettled', () => {
      console.log('WS: Round settled');
      fetchRound();
    });

    const unsubscribeRoundStateChanged = client.on('roundStateChanged', () => {
      console.log('WS: Round state changed');
      fetchRound();
    });

    const unsubscribeRoundOpened = client.on('roundOpened', () => {
      console.log('WS: New round opened');
      fetchRound();
    });

    // v3.0: Listen for market instance settlements (sub-rounds)
    const unsubscribeMarketInstanceSettled = client.on('marketInstanceSettled', (data) => {
      console.log('WS: Market instance settled:', data);
      // Immediately recalculate state for the new sub-round
      if (roundRef.current) {
        const calculated = calculateState(roundRef.current, userDuration);
        setRoundState(prev => ({
          ...prev,
          ...calculated,
        }));
      }
      // Also fetch the latest round data
      fetchRound();
    });

    const unsubscribeTotalsUpdated = client.on('totalsUpdated', (data) => {
      if (data.roundId === roundRef.current?.id) {
        setRoundState(prev => ({
          ...prev,
          totals: data.totals,
        }));
      }
    });

    const unsubscribeBetPlaced = client.on('betPlaced', (data) => {
      if (data.roundId === roundRef.current?.id && roundRef.current) {
        getRoundTotals(roundRef.current.id)
          .then(totalsData => {
            setRoundState(prev => ({
              ...prev,
              totals: totalsData.totals,
            }));
          })
          .catch(console.error);
      }
    });

    return () => {
      unsubscribeRoundSettled();
      unsubscribeRoundStateChanged();
      unsubscribeRoundOpened();
      unsubscribeMarketInstanceSettled();
      unsubscribeTotalsUpdated();
      unsubscribeBetPlaced();
    };
  }, [fetchRound, calculateState, userDuration]);

  // Consolidate periodic sync (every 10s) to ensure state stays valid if WebSocket misses an event
  useEffect(() => {
    const pollInterval = setInterval(fetchRound, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchRound]);

  // Removed periodic polling — now relies on Socket.IO events:
  // - roundSettled: triggers fetchRound() to get new round
  // - totalsUpdated / betPlaced: updates totals in real-time
  // This reduces server load and bandwidth consumption.

  // Function to change user's selected duration
  const changeUserDuration = useCallback((duration: UserRoundDuration) => {
    setUserDuration(duration);
    // Recalculate state immediately with new duration
    if (roundRef.current) {
      const calculated = calculateState(roundRef.current, duration);
      setRoundState(prev => ({
        ...prev,
        userDuration: duration,
        ...calculated,
      }));
    }
  }, [calculateState]);

  return {
    ...roundState,
    refresh: fetchRound,
    setUserDuration: changeUserDuration,
  };
}

