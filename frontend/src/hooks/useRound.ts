/**
 * Custom hook for managing round state and data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentRound, getRoundTotals, type Round, type RoundTotals } from '@/lib/api/spin';
import { getWebSocketClient } from '@/lib/websocket';

export interface RoundState {
  round: Round | null;
  totals: RoundTotals | null;
  loading: boolean;
  error: string | null;
  countdown: number; // seconds until settle
  timeUntilFreeze: number; // seconds until freeze
  state: 'preopen' | 'open' | 'frozen' | 'settled';
}

export function useRound() {
  const [roundState, setRoundState] = useState<RoundState>({
    round: null,
    totals: null,
    loading: true,
    error: null,
    countdown: 0,
    timeUntilFreeze: 0,
    state: 'preopen',
  });

  const roundRef = useRef<Round | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate countdown and state from a round
  const calculateState = useCallback((round: Round | null): Pick<RoundState, 'countdown' | 'timeUntilFreeze' | 'state'> => {
    if (!round) {
      return { countdown: 0, timeUntilFreeze: 0, state: 'preopen' };
    }

    const now = Date.now();
    const freezeAt = new Date(round.freezeAt).getTime();
    const settleAt = new Date(round.settleAt).getTime();

    const timeUntilFreeze = Math.max(0, Math.floor((freezeAt - now) / 1000));
    const countdown = Math.max(0, Math.floor((settleAt - now) / 1000));

    let state: 'preopen' | 'open' | 'frozen' | 'settled';
    if (round.state === 'SETTLED') {
      state = 'settled';
    } else if (round.state === 'FROZEN' || round.state === 'SETTLING') {
      state = 'frozen';
    } else if (timeUntilFreeze <= 0) {
      state = 'frozen';
    } else {
      state = 'open';
    }

    return { countdown, timeUntilFreeze, state };
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
        const calculated = calculateState(data.round);
        console.log('useRound: Calculated state:', calculated);

        setRoundState(prev => ({
          ...prev,
          round: data.round!,
          loading: false,
          error: null,
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
  }, [calculateState]);

  // Initial fetch on mount
  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Update countdown every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (roundRef.current) {
        const calculated = calculateState(roundRef.current);
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
  }, [calculateState]);

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
      unsubscribeTotalsUpdated();
      unsubscribeBetPlaced();
    };
  }, [fetchRound]);

  // Consolidate periodic sync (every 10s) to ensure state stays valid if WebSocket misses an event
  useEffect(() => {
    const pollInterval = setInterval(fetchRound, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchRound]);

  // Removed periodic polling — now relies on Socket.IO events:
  // - roundSettled: triggers fetchRound() to get new round
  // - totalsUpdated / betPlaced: updates totals in real-time
  // This reduces server load and bandwidth consumption.

  return {
    ...roundState,
    refresh: fetchRound,
  };
}

