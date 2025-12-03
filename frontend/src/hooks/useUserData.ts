/**
 * Custom hook for managing user data with caching
 * Fetches only when cache expires or explicitly refreshed
 * Uses WebSocket for real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheManager, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { getWalletBalance } from '@/lib/api/wallet';
import { getCurrentUser, User, Wallet } from '@/lib/api/spin';
import { getUserSubscription } from '@/lib/api/premium';
import { getWebSocketClient } from '@/lib/websocket';

export interface Subscription {
  id?: string;
  plan?: {
    name: string;
    price: number;
  };
  expiresAt?: string;
  status?: string;
}

export interface UserData {
  user: User | null;
  wallet: Wallet | null;
  subscription: Subscription | null;
  lastUpdated: {
    user: number;
    wallet: number;
    subscription: number;
  };
}

interface UserDataState {
  data: UserData | null;
  loading: boolean;
  error: string | null;
}

export function useUserData() {
  const [state, setState] = useState<UserDataState>({
    data: null,
    loading: true,
    error: null,
  });

  const wsClientRef = useRef(getWebSocketClient());
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const fetchUserData = useCallback(async (forceRefresh = false) => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current && !forceRefresh) {
      return;
    }
    
    isFetchingRef.current = true;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const userData: UserData = {
        user: null,
        wallet: null,
        subscription: null,
        lastUpdated: {
          user: 0,
          wallet: 0,
          subscription: 0,
        },
      };

      // Get user from localStorage (synchronous, no API call)
      const cachedUser = cacheManager.get<User>(CACHE_KEYS.USER_DATA);
      if (cachedUser && !forceRefresh) {
        userData.user = cachedUser;
        userData.lastUpdated.user = Date.now();
      } else {
        try {
          const user = getCurrentUser();
          if (user) {
            userData.user = user;
            cacheManager.set(CACHE_KEYS.USER_DATA, user, CACHE_TTL.LONG);
            userData.lastUpdated.user = Date.now();
          }
        } catch (error) {
          console.error('Failed to get user:', error);
        }
      }

      // Only fetch wallet from API if not in cache or forced refresh
      const cachedWallet = cacheManager.get<Wallet>(CACHE_KEYS.WALLET_BALANCE);
      if (cachedWallet && !forceRefresh) {
        userData.wallet = cachedWallet;
        userData.lastUpdated.wallet = Date.now();
      } else {
        try {
          const wallet = await getWalletBalance();
          userData.wallet = wallet;
          cacheManager.set(CACHE_KEYS.WALLET_BALANCE, wallet, CACHE_TTL.SHORT);
          userData.lastUpdated.wallet = Date.now();
        } catch (error) {
          console.error('Failed to fetch wallet:', error);
          // Keep existing wallet data if fetch fails
          if (cachedWallet) {
            userData.wallet = cachedWallet;
          }
        }
      }

      // Only fetch subscription from API if not in cache or forced refresh
      const cachedSubscription = cacheManager.get<Subscription>(CACHE_KEYS.USER_SUBSCRIPTION);
      if (cachedSubscription && !forceRefresh) {
        userData.subscription = cachedSubscription;
        userData.lastUpdated.subscription = Date.now();
      } else {
        try {
          const subscription = await getUserSubscription();
          userData.subscription = subscription;
          cacheManager.set(CACHE_KEYS.USER_SUBSCRIPTION, subscription, CACHE_TTL.MEDIUM);
          userData.lastUpdated.subscription = Date.now();
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
          // Keep existing subscription data if fetch fails
          if (cachedSubscription) {
            userData.subscription = cachedSubscription;
          }
        }
      }

      if (isMountedRef.current) {
        setState({
          data: userData,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user data';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: message,
          loading: false,
        }));
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []); // Empty dependency array - function doesn't depend on external state

  // Setup WebSocket listeners for real-time updates
  useEffect(() => {
    const client = wsClientRef.current;
    
    if (client.getState() === 'CLOSED') {
      client.connect();
    }

    const unsubscribeWalletUpdated = client.on('walletUpdated', (data) => {
      cacheManager.clear(CACHE_KEYS.WALLET_BALANCE);
      setState(prev => {
        if (!prev.data || !prev.data.wallet) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            wallet: {
              ...prev.data.wallet,
              ...(data as Partial<Wallet>),
            },
            lastUpdated: {
              ...prev.data.lastUpdated,
              wallet: Date.now(),
            },
          },
        };
      });
    });

    return () => {
      unsubscribeWalletUpdated();
    };
  }, []);

  // Initial fetch only once on mount
  useEffect(() => {
    // Only fetch if we don't have data yet
    if (!state.data) {
      fetchUserData(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  // Manual refresh with cache bypass
  const refresh = useCallback(() => {
    fetchUserData(true);
  }, [fetchUserData]);

  return {
    ...state,
    refresh,
    user: state.data?.user,
    wallet: state.data?.wallet,
    subscription: state.data?.subscription,
    lastUpdated: state.data?.lastUpdated,
  };
}
