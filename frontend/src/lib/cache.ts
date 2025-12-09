/**
 * Simple cache management system to avoid infinite fetching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    return Date.now() - entry.timestamp > entry.ttl;
  }

  getTimeToLive(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) return 0;

    const elapsed = Date.now() - entry.timestamp;
    return Math.max(0, entry.ttl - elapsed);
  }
}

export const cacheManager = new CacheManager();

export const CACHE_KEYS = {
  WALLET_BALANCE: 'wallet:balance',
  USER_DATA: 'user:data',
  USER_SUBSCRIPTION: 'user:subscription',
  AFFILIATE_DATA: 'affiliate:data',
  PREMIUM_PLANS: 'premium:plans',
  CHAT_ROOMS: 'chat:rooms',
  COMMUNITY_STATS: 'community:stats',
  BET_STATS: 'bet:stats',
  CURRENT_ROUND: 'round:current',
};

export const CACHE_TTL = {
  VERY_SHORT: 30,
  SHORT: 60,
  MEDIUM: 300,
  LONG: 600,
  VERY_LONG: 1800,
};
