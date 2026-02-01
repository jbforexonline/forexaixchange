// =============================================================================
// MARKET AGGREGATION SERVICE - Display-Only Aggregated Metrics
// =============================================================================
// Path: backend/src/rounds/market-aggregation.service.ts
// Implements: "One Market Feel" - Aggregated metrics across all durations
// CRITICAL: These metrics are for DISPLAY ONLY, NOT for settlement
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MarketInstanceStatus, DurationMinutes } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';

export interface AggregatedMarketStats {
  // Pool totals (sum across all active durations)
  totalActivityAmount: Decimal;
  outerBuy: Decimal;
  outerSell: Decimal;
  middleBlue: Decimal;
  middleRed: Decimal;
  innerHighVol: Decimal;
  innerLowVol: Decimal;
  globalIndecision: Decimal;
  
  // Heat indices (display metric based on ratio)
  heatIndex: {
    outer: number;      // 0-1, where 0.5 = balanced, 0/1 = one-sided
    middle: number;
    inner: number;
    overall: number;
  };
  
  // User engagement
  liveBettorsCount: number;
  totalBetsCount: number;
  
  // Activity by duration (for breakdown display)
  byDuration: {
    [key in DurationMinutes]: {
      totalAmount: Decimal;
      betsCount: number;
      usersCount: number;
    };
  };
}

export interface PerDurationStats {
  durationMinutes: DurationMinutes;
  instanceId: string;
  windowStart: number;
  windowEnd: number;
  status: MarketInstanceStatus;
  remainingSeconds: number;
  pools: {
    outerBuy: Decimal;
    outerSell: Decimal;
    middleBlue: Decimal;
    middleRed: Decimal;
    innerHighVol: Decimal;
    innerLowVol: Decimal;
    globalIndecision: Decimal;
  };
  betsCount: number;
  usersCount: number;
}

@Injectable()
export class MarketAggregationService {
  private readonly logger = new Logger(MarketAggregationService.name);
  
  // Cache TTL for aggregated stats (2 seconds)
  private readonly CACHE_TTL = 2;

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /**
   * Get aggregated market stats across all active market instances
   * CRITICAL: This is for DISPLAY ONLY - settlement uses per-instance pools
   */
  async getAggregatedStats(masterRoundId: string): Promise<AggregatedMarketStats> {
    // Try to get from cache first
    const cached = await this.getCachedStats(masterRoundId);
    if (cached) {
      return cached;
    }

    // Get all active market instances for this master round
    const instances = await this.prisma.marketInstance.findMany({
      where: {
        masterRoundId,
        status: { in: [MarketInstanceStatus.ACTIVE, MarketInstanceStatus.FROZEN] },
      },
      include: {
        _count: {
          select: { bets: true },
        },
      },
    });

    // Initialize aggregated totals
    const totals = {
      outerBuy: new Decimal(0),
      outerSell: new Decimal(0),
      middleBlue: new Decimal(0),
      middleRed: new Decimal(0),
      innerHighVol: new Decimal(0),
      innerLowVol: new Decimal(0),
      globalIndecision: new Decimal(0),
    };

    // Initialize by-duration breakdown
    const byDuration: AggregatedMarketStats['byDuration'] = {
      [DurationMinutes.FIVE]: { totalAmount: new Decimal(0), betsCount: 0, usersCount: 0 },
      [DurationMinutes.TEN]: { totalAmount: new Decimal(0), betsCount: 0, usersCount: 0 },
      [DurationMinutes.TWENTY]: { totalAmount: new Decimal(0), betsCount: 0, usersCount: 0 },
    };

    let totalBetsCount = 0;

    // Aggregate from all instances
    for (const instance of instances) {
      // Add to totals
      totals.outerBuy = totals.outerBuy.add(instance.outerBuy);
      totals.outerSell = totals.outerSell.add(instance.outerSell);
      totals.middleBlue = totals.middleBlue.add(instance.middleBlue);
      totals.middleRed = totals.middleRed.add(instance.middleRed);
      totals.innerHighVol = totals.innerHighVol.add(instance.innerHighVol);
      totals.innerLowVol = totals.innerLowVol.add(instance.innerLowVol);
      totals.globalIndecision = totals.globalIndecision.add(instance.globalIndecision);

      // Add to duration breakdown
      const instanceTotal = new Decimal(instance.totalVolume || 0);
      byDuration[instance.durationMinutes].totalAmount = byDuration[instance.durationMinutes].totalAmount.add(instanceTotal);
      byDuration[instance.durationMinutes].betsCount += instance._count.bets;
      
      totalBetsCount += instance._count.bets;
    }

    // Get unique users count across all instances
    const uniqueUsersResult = await this.prisma.bet.groupBy({
      by: ['userId'],
      where: {
        marketInstanceId: { in: instances.map(i => i.id) },
        status: 'ACCEPTED',
        isSystemSeed: false,
      },
    });
    const liveBettorsCount = uniqueUsersResult.length;

    // Get unique users per duration
    for (const duration of [DurationMinutes.FIVE, DurationMinutes.TEN, DurationMinutes.TWENTY]) {
      const durationInstances = instances.filter(i => i.durationMinutes === duration);
      if (durationInstances.length > 0) {
        const durationUsers = await this.prisma.bet.groupBy({
          by: ['userId'],
          where: {
            marketInstanceId: { in: durationInstances.map(i => i.id) },
            status: 'ACCEPTED',
            isSystemSeed: false,
          },
        });
        byDuration[duration].usersCount = durationUsers.length;
      }
    }

    // Calculate total activity amount
    const totalActivityAmount = totals.outerBuy
      .add(totals.outerSell)
      .add(totals.middleBlue)
      .add(totals.middleRed)
      .add(totals.innerHighVol)
      .add(totals.innerLowVol)
      .add(totals.globalIndecision);

    // Calculate heat indices
    const heatIndex = this.calculateHeatIndices(totals);

    const stats: AggregatedMarketStats = {
      totalActivityAmount,
      ...totals,
      heatIndex,
      liveBettorsCount,
      totalBetsCount,
      byDuration,
    };

    // Cache the result
    await this.cacheStats(masterRoundId, stats);

    return stats;
  }

  /**
   * Calculate heat index for each market pair
   * Heat index: 0-1, where 0.5 = balanced, 0/1 = one-sided
   * Higher deviation from 0.5 = "hotter" market
   */
  private calculateHeatIndices(totals: {
    outerBuy: Decimal;
    outerSell: Decimal;
    middleBlue: Decimal;
    middleRed: Decimal;
    innerHighVol: Decimal;
    innerLowVol: Decimal;
  }): AggregatedMarketStats['heatIndex'] {
    // Helper to calculate ratio heat
    const calcHeat = (a: Decimal, b: Decimal): number => {
      const total = a.add(b);
      if (total.eq(0)) return 0.5; // No activity = neutral
      const ratio = a.div(total).toNumber();
      return Math.abs(0.5 - ratio) * 2; // 0 = balanced, 1 = one-sided
    };

    const outerHeat = calcHeat(totals.outerBuy, totals.outerSell);
    const middleHeat = calcHeat(totals.middleBlue, totals.middleRed);
    const innerHeat = calcHeat(totals.innerHighVol, totals.innerLowVol);
    
    // Overall is average of all layers
    const overall = (outerHeat + middleHeat + innerHeat) / 3;

    return {
      outer: outerHeat,
      middle: middleHeat,
      inner: innerHeat,
      overall,
    };
  }

  /**
   * Get stats for each duration separately (for UI breakdown)
   */
  async getPerDurationStats(masterRoundId: string): Promise<PerDurationStats[]> {
    const masterRound = await this.prisma.round.findUnique({
      where: { id: masterRoundId },
      select: { settleAt: true },
    });

    if (!masterRound) {
      return [];
    }

    const now = Date.now();
    const masterSettleAt = new Date(masterRound.settleAt).getTime();

    const instances = await this.prisma.marketInstance.findMany({
      where: {
        masterRoundId,
        status: { in: [MarketInstanceStatus.ACTIVE, MarketInstanceStatus.FROZEN] },
      },
      include: {
        _count: { select: { bets: true } },
      },
      orderBy: [
        { durationMinutes: 'asc' },
        { windowEndMinutes: 'desc' },
      ],
    });

    const stats: PerDurationStats[] = [];

    for (const instance of instances) {
      // Calculate remaining seconds for this instance
      const instanceSettleAt = new Date(instance.settleAt).getTime();
      const remainingSeconds = Math.max(0, Math.floor((instanceSettleAt - now) / 1000));

      // Get unique users for this instance
      const uniqueUsers = await this.prisma.bet.groupBy({
        by: ['userId'],
        where: {
          marketInstanceId: instance.id,
          status: 'ACCEPTED',
          isSystemSeed: false,
        },
      });

      stats.push({
        durationMinutes: instance.durationMinutes,
        instanceId: instance.id,
        windowStart: instance.windowStartMinutes,
        windowEnd: instance.windowEndMinutes,
        status: instance.status,
        remainingSeconds,
        pools: {
          outerBuy: instance.outerBuy,
          outerSell: instance.outerSell,
          middleBlue: instance.middleBlue,
          middleRed: instance.middleRed,
          innerHighVol: instance.innerHighVol,
          innerLowVol: instance.innerLowVol,
          globalIndecision: instance.globalIndecision,
        },
        betsCount: instance._count.bets,
        usersCount: uniqueUsers.length,
      });
    }

    return stats;
  }

  /**
   * Get sentiment/ratio display data for a market pair
   */
  async getMarketSentiment(masterRoundId: string): Promise<{
    outer: { buy: number; sell: number; ratio: number };
    middle: { blue: number; red: number; ratio: number };
    inner: { highVol: number; lowVol: number; ratio: number };
    indecision: { amount: number; percentage: number };
  }> {
    const stats = await this.getAggregatedStats(masterRoundId);
    
    const outerTotal = stats.outerBuy.add(stats.outerSell);
    const middleTotal = stats.middleBlue.add(stats.middleRed);
    const innerTotal = stats.innerHighVol.add(stats.innerLowVol);
    const grandTotal = stats.totalActivityAmount;

    return {
      outer: {
        buy: stats.outerBuy.toNumber(),
        sell: stats.outerSell.toNumber(),
        ratio: outerTotal.gt(0) ? stats.outerBuy.div(outerTotal).toNumber() : 0.5,
      },
      middle: {
        blue: stats.middleBlue.toNumber(),
        red: stats.middleRed.toNumber(),
        ratio: middleTotal.gt(0) ? stats.middleBlue.div(middleTotal).toNumber() : 0.5,
      },
      inner: {
        highVol: stats.innerHighVol.toNumber(),
        lowVol: stats.innerLowVol.toNumber(),
        ratio: innerTotal.gt(0) ? stats.innerHighVol.div(innerTotal).toNumber() : 0.5,
      },
      indecision: {
        amount: stats.globalIndecision.toNumber(),
        percentage: grandTotal.gt(0) ? stats.globalIndecision.div(grandTotal).mul(100).toNumber() : 0,
      },
    };
  }

  /**
   * Get quick stats for real-time display (optimized for frequent calls)
   */
  async getQuickStats(masterRoundId: string): Promise<{
    totalVolume: number;
    liveBettors: number;
    heatOverall: number;
    byDuration: { five: number; ten: number; twenty: number };
  }> {
    // Try Redis cache first
    try {
      if (this.redis.status === 'ready') {
        const cached = await this.redis.get(`quick:stats:${masterRoundId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    const stats = await this.getAggregatedStats(masterRoundId);
    
    const result = {
      totalVolume: stats.totalActivityAmount.toNumber(),
      liveBettors: stats.liveBettorsCount,
      heatOverall: stats.heatIndex.overall,
      byDuration: {
        five: stats.byDuration[DurationMinutes.FIVE].totalAmount.toNumber(),
        ten: stats.byDuration[DurationMinutes.TEN].totalAmount.toNumber(),
        twenty: stats.byDuration[DurationMinutes.TWENTY].totalAmount.toNumber(),
      },
    };

    // Cache for 1 second
    try {
      if (this.redis.status === 'ready') {
        await this.redis.set(
          `quick:stats:${masterRoundId}`,
          JSON.stringify(result),
          'EX',
          1,
        );
      }
    } catch (e) {
      // Ignore cache errors
    }

    return result;
  }

  /**
   * Cache aggregated stats in Redis
   */
  private async cacheStats(masterRoundId: string, stats: AggregatedMarketStats): Promise<void> {
    try {
      if (this.redis.status !== 'ready') return;

      // Convert Decimals to numbers for JSON serialization
      const serializable = {
        ...stats,
        totalActivityAmount: stats.totalActivityAmount.toNumber(),
        outerBuy: stats.outerBuy.toNumber(),
        outerSell: stats.outerSell.toNumber(),
        middleBlue: stats.middleBlue.toNumber(),
        middleRed: stats.middleRed.toNumber(),
        innerHighVol: stats.innerHighVol.toNumber(),
        innerLowVol: stats.innerLowVol.toNumber(),
        globalIndecision: stats.globalIndecision.toNumber(),
        byDuration: {
          [DurationMinutes.FIVE]: {
            ...stats.byDuration[DurationMinutes.FIVE],
            totalAmount: stats.byDuration[DurationMinutes.FIVE].totalAmount.toNumber(),
          },
          [DurationMinutes.TEN]: {
            ...stats.byDuration[DurationMinutes.TEN],
            totalAmount: stats.byDuration[DurationMinutes.TEN].totalAmount.toNumber(),
          },
          [DurationMinutes.TWENTY]: {
            ...stats.byDuration[DurationMinutes.TWENTY],
            totalAmount: stats.byDuration[DurationMinutes.TWENTY].totalAmount.toNumber(),
          },
        },
      };

      await this.redis.set(
        `agg:stats:${masterRoundId}`,
        JSON.stringify(serializable),
        'EX',
        this.CACHE_TTL,
      );
    } catch (e) {
      this.logger.debug(`Failed to cache aggregated stats: ${e.message}`);
    }
  }

  /**
   * Get cached aggregated stats from Redis
   */
  private async getCachedStats(masterRoundId: string): Promise<AggregatedMarketStats | null> {
    try {
      if (this.redis.status !== 'ready') return null;

      const cached = await this.redis.get(`agg:stats:${masterRoundId}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);

      // Convert numbers back to Decimals
      return {
        ...parsed,
        totalActivityAmount: new Decimal(parsed.totalActivityAmount),
        outerBuy: new Decimal(parsed.outerBuy),
        outerSell: new Decimal(parsed.outerSell),
        middleBlue: new Decimal(parsed.middleBlue),
        middleRed: new Decimal(parsed.middleRed),
        innerHighVol: new Decimal(parsed.innerHighVol),
        innerLowVol: new Decimal(parsed.innerLowVol),
        globalIndecision: new Decimal(parsed.globalIndecision),
        byDuration: {
          [DurationMinutes.FIVE]: {
            ...parsed.byDuration[DurationMinutes.FIVE],
            totalAmount: new Decimal(parsed.byDuration[DurationMinutes.FIVE].totalAmount),
          },
          [DurationMinutes.TEN]: {
            ...parsed.byDuration[DurationMinutes.TEN],
            totalAmount: new Decimal(parsed.byDuration[DurationMinutes.TEN].totalAmount),
          },
          [DurationMinutes.TWENTY]: {
            ...parsed.byDuration[DurationMinutes.TWENTY],
            totalAmount: new Decimal(parsed.byDuration[DurationMinutes.TWENTY].totalAmount),
          },
        },
      };
    } catch (e) {
      return null;
    }
  }
}
