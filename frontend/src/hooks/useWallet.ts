/**
 * Custom hook for managing wallet state and balance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWallet, type Wallet } from '@/lib/api/spin';
import { getWebSocketClient } from '@/lib/websocket';

export interface WalletState {
  wallet: Wallet | null;
  loading: boolean;
  error: string | null;
}

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    wallet: null,
    loading: true,
    error: null,
  });

  const wsClientRef = useRef(getWebSocketClient());

  // Fetch wallet balance
  const fetchWallet = useCallback(async () => {
    try {
      setWalletState(prev => ({ ...prev, loading: true, error: null }));
      const wallet = await getWallet();
      setWalletState({
        wallet,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch wallet';
      setWalletState(prev => ({
        ...prev,
        error: message,
        loading: false,
      }));
      console.error('Failed to fetch wallet:', error);
    }
  }, []);

  // Setup WebSocket listener for wallet updates
  useEffect(() => {
    const client = wsClientRef.current;
    
    // Connect if not already connected
    if (client.getState() === 'CLOSED') {
      client.connect();
    }

    const unsubscribeWalletUpdated = client.on('walletUpdated', (data) => {
      setWalletState(prev => ({
        ...prev,
        wallet: {
          available: data.available || prev.wallet?.available || 0,
          held: data.held || prev.wallet?.held || 0,
          totalDeposited: prev.wallet?.totalDeposited || 0,
          totalWithdrawn: prev.wallet?.totalWithdrawn || 0,
          totalWon: prev.wallet?.totalWon || 0,
          totalLost: prev.wallet?.totalLost || 0,
        },
      }));
    });

    return () => {
      unsubscribeWalletUpdated();
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Refresh wallet periodically (every 10 seconds)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!walletState.loading) {
        fetchWallet();
      }
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [fetchWallet, walletState.loading]);

  return {
    ...walletState,
    refresh: fetchWallet,
  };
}

