/**
 * Custom hook for managing round state and data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentRound, getRoundTotals, type Round, type RoundTotals } from '@/lib/api/spin';
import { getWebSocketClient, type WebSocketEvent } from '@/lib/websocket';

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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsClientRef = useRef(getWebSocketClient());

  // Calculate countdown and state
  const updateCountdown = useCallback((round: Round | null) => {
    if (!round) {
      setRoundState(prev => ({
        ...prev,
        countdown: 0,
        timeUntilFreeze: 0,
        state: 'preopen',
      }));
      return;
    }

    const now = new Date().getTime();
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

    setRoundState(prev => ({
      ...prev,
      countdown,
      timeUntilFreeze,
      state,
    }));
  }, []);

  // Fetch current round
  const fetchRound = useCallback(async () => {
    try {
      setRoundState(prev => ({ ...prev, loading: true, error: null }));
      const data = await getCurrentRound();
      
      if (data.round) {
        setRoundState(prev => ({
          ...prev,
          round: data.round!,
          loading: false,
        }));
        updateCountdown(data.round);
        
        // Fetch totals
        try {
          const totalsData = await getRoundTotals(data.round.id);
          setRoundState(prev => ({
            ...prev,
            totals: totalsData.totals,
          }));
        } catch (error) {
          console.error('Failed to fetch totals:', error);
        }
      } else {
        setRoundState(prev => ({
          ...prev,
          round: null,
          loading: false,
        }));
        updateCountdown(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch round';
      setRoundState(prev => ({
        ...prev,
        error: message,
        loading: false,
      }));
      console.error('Failed to fetch round:', error);
    }
  }, [updateCountdown]);

  // Setup WebSocket listeners
  useEffect(() => {
    const client = wsClientRef.current;
    
    // Connect if not already connected
    if (client.getState() === 'CLOSED') {
      client.connect();
    }

    // Listen for round updates
    const unsubscribeRoundSettled = client.on('roundSettled', (data) => {
      console.log('Round settled:', data);
      fetchRound(); // Refresh round data to get next round
    });

    const unsubscribeRoundStateChanged = client.on('roundStateChanged', (data) => {
      console.log('Round state changed:', data);
      fetchRound(); // Refresh when state changes (e.g., OPEN → FROZEN)
    });

    const unsubscribeTotalsUpdated = client.on('totalsUpdated', (data) => {
      if (data.roundId === roundState.round?.id) {
        setRoundState(prev => ({
          ...prev,
          totals: data.totals,
        }));
      }
    });

    const unsubscribeBetPlaced = client.on('betPlaced', (data) => {
      if (data.roundId === roundState.round?.id) {
        // Refresh totals when bet is placed
        if (roundState.round) {
          getRoundTotals(roundState.round.id).then(data => {
            setRoundState(prev => ({
              ...prev,
              totals: data.totals,
            }));
          }).catch(console.error);
        }
      }
    });

    return () => {
      unsubscribeRoundSettled();
      unsubscribeRoundStateChanged();
      unsubscribeTotalsUpdated();
      unsubscribeBetPlaced();
    };
  }, [roundState.round?.id, fetchRound]);

  // Initial fetch
  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Polling fallback (every 5s) to ensure sync if socket misses
  useEffect(() => {
    const pollInterval = setInterval(fetchRound, 5000);
    return () => clearInterval(pollInterval);
  }, [fetchRound]);

  // Update countdown every second
  useEffect(() => {
    if (roundState.round) {
      intervalRef.current = setInterval(() => {
        updateCountdown(roundState.round);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [roundState.round, updateCountdown]);

  // Removed periodic polling — now relies on Socket.IO events:
  // - roundSettled: triggers fetchRound() to get new round
  // - totalsUpdated / betPlaced: updates totals in real-time
  // This reduces server load and bandwidth consumption.

  return {
    ...roundState,
    refresh: fetchRound,
  };
}

