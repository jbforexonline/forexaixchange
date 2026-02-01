// =============================================================================
// BETS SERVICE - Bet Placement and Management
// =============================================================================
// Path: backend/src/rounds/bets.service.ts
// v3.0: Multi-duration support with separate pools per duration
// =============================================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BetMarket, RoundState, DurationMinutes, MarketInstanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MarketInstanceService, minutesToDuration } from './market-instance.service';

// Internal interface for bet placement (includes roundId added by controller)
export interface PlaceBetDto {
  roundId: string;
  market: BetMarket;
  selection: string;
  amountUsd: number;
  idempotencyKey?: string;
  isDemo?: boolean;
  userRoundDuration?: number; // v2.1: DEPRECATED - use durationMinutes instead
  durationMinutes?: number;   // v3.0: User's selected duration (5, 10, or 20 minutes)
}

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private gateway: RealtimeGateway,
    private marketInstanceService: MarketInstanceService,
  ) {}

  /**
   * Place a bet on the current round
   * v3.0: Routes bets to the correct market instance based on duration
   */
  async placeBet(userId: string, dto: PlaceBetDto) {
    this.logger.debug(`📝 placeBet called: userId=${userId}, dto=${JSON.stringify(dto)}`);
    
    const amount = new Decimal(dto.amountUsd);

    // Validation
    if (amount.lte(0)) {
      throw new BadRequestException('Bet amount must be positive');
    }

    if (!this.isValidSelection(dto.market, dto.selection)) {
      throw new BadRequestException(`Invalid selection for market ${dto.market}`);
    }

    // v3.0: Parse and validate duration (only 5, 10, 20 allowed - no 15)
    const durationMins = dto.durationMinutes || dto.userRoundDuration || 20;
    if (![5, 10, 20].includes(durationMins)) {
      throw new BadRequestException('Invalid duration. Only 5, 10, or 20 minutes are supported.');
    }
    const durationEnum = minutesToDuration(durationMins);

    try {
      return await this.prisma.$transaction(async (tx) => {
      // 1. Check idempotency
      if (dto.idempotencyKey) {
        const existing = await tx.bet.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
          this.logger.warn(`Duplicate bet attempt: ${dto.idempotencyKey}`);
          return existing;
        }
      }

      // 2. Get round and validate state
      const round = await tx.round.findUnique({
        where: { id: dto.roundId },
      });

      if (!round) {
        throw new NotFoundException('Round not found');
      }

      if (round.state !== RoundState.OPEN) {
        throw new BadRequestException('Market is not open for orders');
      }

      // 3. Get user and check premium status
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user || !user.wallet) {
        throw new NotFoundException('User or wallet not found');
      }

      const isPremium = user.premium && user.premiumExpiresAt && user.premiumExpiresAt > new Date();
      
      // All users can place bets (both demo and live)
      // Premium status only affects timing cutoffs and bet limits

      // 4. v3.0: Find the correct market instance for this duration
      const marketInstance = await this.marketInstanceService.getInstanceForBet(
        dto.roundId,
        durationEnum,
        round.settleAt,
      );

      if (!marketInstance) {
        throw new BadRequestException(
          `No active market available for ${durationMins}-minute duration`,
        );
      }

      // 5. Validate market instance is still active (not frozen)
      if (marketInstance.status !== MarketInstanceStatus.ACTIVE) {
        throw new BadRequestException(
          `Market for ${durationMins}-minute duration is closed for orders`,
        );
      }

      // 6. Check timing constraints for the specific market instance
      // Cutoffs are measured from the market instance's settlement time
      const now = new Date();
      const instanceSettleAt = new Date(marketInstance.settleAt);
      const premiumCutoffTime = new Date(instanceSettleAt.getTime() - round.premiumCutoff * 1000);
      const regularCutoffTime = new Date(instanceSettleAt.getTime() - round.regularCutoff * 1000);
      const cutoffTime = isPremium ? premiumCutoffTime : regularCutoffTime;

      if (now >= cutoffTime) {
        throw new BadRequestException(
          `Market closed - orders no longer accepted for ${durationMins}-minute duration`,
        );
      }

      // 7. Check wallet balance
      const availableBalance = dto.isDemo ? (user.wallet as any).demoAvailable : user.wallet.available;
      if (availableBalance.lt(amount)) {
        throw new BadRequestException(`Insufficient ${dto.isDemo ? 'demo ' : ''}funds`);
      }

      // 8. Apply bet limits (could be configurable)
      const minBet = new Decimal(1); // $1 minimum
      const maxBet = isPremium ? new Decimal(200) : new Decimal(1000); // Premium: $200 per order, Regular: $1000 per order

      if (amount.lt(minBet) || amount.gt(maxBet)) {
        throw new BadRequestException(
          `Order amount must be between $${minBet.toString()} and $${maxBet.toString()}`,
        );
      }

      // 9. v3.0: Create bet with market instance link
      const bet = await tx.bet.create({
        data: {
          round: { connect: { id: dto.roundId } },
          user: { connect: { id: userId } },
          marketInstance: { connect: { id: marketInstance.id } },
          market: dto.market,
          selection: dto.selection,
          amountUsd: amount,
          status: 'ACCEPTED',
          isPremiumUser: isPremium ?? false,
          idempotencyKey: dto.idempotencyKey,
          isDemo: dto.isDemo || false,
          userRoundDuration: durationMins, // Legacy field
          durationMinutes: durationEnum,   // v3.0: New field
        } as any,
      });

      // 10. Hold funds in wallet
      if (dto.isDemo) {
        await tx.wallet.update({
          where: { userId },
          data: {
            demoAvailable: { decrement: amount },
            demoHeld: { increment: amount },
          } as any,
        });
      } else {
        await tx.wallet.update({
          where: { userId },
          data: {
            available: { decrement: amount },
            held: { increment: amount },
          },
        });
      }

      // 11. v3.0: Update market instance totals (for settlement)
      await this.marketInstanceService.updateInstanceTotals(
        marketInstance.id,
        dto.market,
        dto.selection,
        amount,
      );

      // 12. Update Redis totals for real-time UI (aggregated across durations)
      await this.updateRedisTotals(dto.roundId, dto.market, dto.selection, amount);
      // Also update per-instance Redis totals
      await this.updateRedisInstanceTotals(marketInstance.id, dto.market, dto.selection, amount);

      // 13. Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'SPIN_LOSS', // Temporary, will be updated on settlement
          amount,
          status: 'PENDING',
          isDemo: dto.isDemo || false,
          description: `Bet placed - Round ${round.roundNumber} ${dto.market} ${dto.selection} (${durationMins}min)`,
        } as any,
      });

      this.logger.log(
        `💰 Bet placed: ${user.username} - ${dto.market} ${dto.selection} $${amount.toString()} ` +
        `(Round ${round.roundNumber}, ${durationMins}min)`,
      );

      // 14. Emit WebSocket event for live updates
      this.gateway.server.emit('betPlaced', {
        roundId: dto.roundId,
        roundNumber: round.roundNumber,
        marketInstanceId: marketInstance.id,
        durationMinutes: durationMins,
        market: dto.market,
        selection: dto.selection,
        amount: amount.toNumber(),
        username: user.username,
      });

      // Emit updated totals (aggregated)
      const totals = await this.getRedisTotals(dto.roundId);
      this.gateway.server.emit('totalsUpdated', {
        roundId: dto.roundId,
        totals,
      });

      // Emit real-time wallet balance update (bet deducted instantly)
      const updatedWallet = await tx.wallet.findUnique({
        where: { userId },
      });
      this.gateway.server.to(`user:${userId}`).emit('walletUpdated', {
        userId,
        available: updatedWallet.available.toNumber(),
        held: updatedWallet.held.toNumber(),
        total: updatedWallet.available.add(updatedWallet.held).toNumber(),
        reason: 'bet_placed',
        betAmount: amount.toNumber(),
        durationMinutes: durationMins,
        isDemo: dto.isDemo,
      });

      return bet;
    });
    } catch (error) {
      this.logger.error(`❌ placeBet failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel a bet (Premium only, before freeze)
   */
  async cancelBet(userId: string, betId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Get bet and round
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        include: {
          round: true,
          user: true,
        },
      });

      if (!bet) {
        throw new NotFoundException('Bet not found');
      }

      if (bet.userId !== userId) {
        throw new BadRequestException('Not authorized to cancel this order');
      }

      // Check premium status
      const isPremium =
        bet.user.premium &&
        (!bet.user.premiumExpiresAt ||
          new Date(bet.user.premiumExpiresAt) >= new Date());

      if (!isPremium) {
        throw new ForbiddenException(
          'Canceling orders is available to premium users only',
        );
      }

      // Check bet status
      if (bet.status !== 'ACCEPTED') {
        throw new BadRequestException(
          `Cannot cancel order with status: ${bet.status}`,
        );
      }

      // Check if round is still open (before freeze)
      const now = new Date();
      if (bet.round.state !== RoundState.OPEN || now >= bet.round.freezeAt) {
        throw new BadRequestException(
          'Cannot cancel order: market is frozen or settled',
        );
      }

      // Check cutoff time - measured from settlement time
      const cutoffTime = isPremium
        ? new Date(bet.round.settleAt.getTime() - bet.round.premiumCutoff * 1000)
        : new Date(bet.round.settleAt.getTime() - bet.round.regularCutoff * 1000);

      if (now >= cutoffTime) {
        throw new BadRequestException(
          'Cannot cancel order: cutoff time has passed',
        );
      }

      // Refund held funds
      if ((bet as any).isDemo) {
        await tx.wallet.update({
          where: { userId },
          data: {
            demoAvailable: { increment: bet.amountUsd },
            demoHeld: { decrement: bet.amountUsd },
          } as any,
        });
      } else {
        await tx.wallet.update({
          where: { userId },
          data: {
            available: { increment: bet.amountUsd },
            held: { decrement: bet.amountUsd },
          },
        });
      }

      // Update bet status
      const cancelledBet = await tx.bet.update({
        where: { id: betId },
        data: {
          status: 'CANCELLED',
        },
      });

      // Remove from Redis totals
      await this.updateRedisTotals(
        bet.roundId,
        bet.market,
        bet.selection,
        bet.amountUsd.neg(),
      );

      // Create refund transaction
      await tx.transaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount: bet.amountUsd,
          status: 'COMPLETED',
          description: `Bet cancelled - Round ${bet.round.roundNumber} ${bet.market} ${bet.selection}`,
        },
      });

      this.logger.log(
        `❌ Bet cancelled: ${bet.user.username} - Round ${bet.round.roundNumber} ${bet.market} ${bet.selection} $${bet.amountUsd.toString()}`,
      );

      // Emit WebSocket event
      this.gateway.server.emit('betCancelled', {
        betId,
        roundId: bet.roundId,
        roundNumber: bet.round.roundNumber,
        market: bet.market,
        selection: bet.selection,
        amount: bet.amountUsd.toNumber(),
      });

      const totals = await this.getRedisTotals(bet.roundId);
      this.gateway.server.emit('totalsUpdated', {
        roundId: bet.roundId,
        totals,
      });

      return cancelledBet;
    });
  }

  /**
   * Get user's bets for a round (excludes cancelled bets)
   */
  async getUserBets(userId: string, roundId: string) {
    return this.prisma.bet.findMany({
      where: {
        userId,
        roundId,
        isSystemSeed: false, // v2.1: Exclude system seed bets
        // v3.0: Only show bets that are still accepted (not yet settled)
        status: 'ACCEPTED',
      },
      select: {
        id: true,
        roundId: true,
        userId: true,
        market: true,
        selection: true,
        amountUsd: true,
        status: true,
        isWinner: true,
        payoutAmount: true,
        profitAmount: true,
        payoutRatio: true,
        isPremiumUser: true,
        isDemo: true,
        idempotencyKey: true,
        holdLedgerId: true,
        payoutLedgerId: true,
        isSystemSeed: true,
        seedType: true,
        userRoundDuration: true, // v2.1: Include user's duration preference
        createdAt: true,
        settledAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's bet history with pagination
   */
  async getUserBetHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // v2.1: Exclude system seed bets from user history
    const whereClause = { 
      userId,
      isSystemSeed: false, // Exclude system seeds
    };

    const [bets, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          roundId: true,
          market: true,
          selection: true,
          amountUsd: true,
          status: true,
          isWinner: true,
          payoutAmount: true,
          profitAmount: true,
          isDemo: true,
          userRoundDuration: true, // v2.1: Include user's duration preference
          createdAt: true,
          settledAt: true,
          round: {
            select: {
              roundNumber: true,
              state: true,
              settledAt: true,
            },
          },
        },
      }),
      this.prisma.bet.count({ where: whereClause }),
    ]);

    return {
      data: bets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's bet statistics
   */
  async getUserBetStats(userId: string) {
    const [totalBets, wonBets, lostBets, totalWagered, totalWon] = await Promise.all([
      this.prisma.bet.count({ where: { userId } }),
      this.prisma.bet.count({ where: { userId, status: 'WON' } }),
      this.prisma.bet.count({ where: { userId, status: 'LOST' } }),
      this.prisma.bet.aggregate({
        where: { userId },
        _sum: { amountUsd: true },
      }),
      this.prisma.bet.aggregate({
        where: { userId, status: 'WON' },
        _sum: { profitAmount: true },
      }),
    ]);

    const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;
    const totalProfitLoss = (totalWon._sum.profitAmount || new Decimal(0))
      .sub(totalWagered._sum.amountUsd || new Decimal(0));

    return {
      totalBets,
      wonBets,
      lostBets,
      winRate: Math.round(winRate * 100) / 100,
      totalWagered: totalWagered._sum.amountUsd || 0,
      totalWon: totalWon._sum.profitAmount || 0,
      profitLoss: totalProfitLoss.toNumber(),
    };
  }

  /**
   * Get market distribution statistics (for statistics page)
   * Returns percentage distribution of bets across all selections
   */
  async getMarketDistribution(timeFilter?: 'hourly' | 'daily' | 'monthly' | 'quarterly' | 'yearly') {
    // Determine the date filter based on timeFilter
    let dateFrom: Date | undefined;
    const now = new Date();
    
    switch (timeFilter) {
      case 'hourly':
        dateFrom = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        // No filter - get all time
        dateFrom = undefined;
    }

    // IMPORTANT: Exclude system seeds - only count real user bets
    const whereClause = {
      ...(dateFrom ? { createdAt: { gte: dateFrom } } : {}),
      isSystemSeed: false,  // Exclude seeding orders
    };

    // Get count of bets grouped by selection (user bets only)
    const distribution = await this.prisma.bet.groupBy({
      by: ['selection'],
      where: whereClause,
      _count: {
        selection: true,
      },
    });

    // Calculate total number of bets
    const totalBets = distribution.reduce((sum, item) => sum + item._count.selection, 0);

    // Define all possible selections with their market grouping
    const allSelections = [
      { selection: 'BUY', market: 'OUTER', label: 'Buy' },
      { selection: 'SELL', market: 'OUTER', label: 'Sell' },
      { selection: 'RED', market: 'MIDDLE', label: 'Red' },
      { selection: 'BLUE', market: 'MIDDLE', label: 'Blue' },
      { selection: 'HIGH_VOL', market: 'INNER', label: 'High Volatile' },
      { selection: 'LOW_VOL', market: 'INNER', label: 'Low Volatile' },
      { selection: 'INDECISION', market: 'GLOBAL', label: 'Indecision' },
    ];

    // Map to result with percentages
    const result = allSelections.map(item => {
      const found = distribution.find(d => d.selection === item.selection);
      const count = found?._count.selection || 0;
      const percentage = totalBets > 0 ? Math.round((count / totalBets) * 10000) / 100 : 0;
      
      return {
        selection: item.selection,
        market: item.market,
        label: item.label,
        count,
        percentage,
      };
    });

    // Also get participant count (unique users, excluding SYSTEM_SEED)
    const uniqueUsers = await this.prisma.bet.groupBy({
      by: ['userId'],
      where: {
        ...whereClause,
        userId: { not: 'SYSTEM_SEED' },  // Exclude system user
      },
      _count: true,
    });

    return {
      distribution: result,
      totalBets,
      totalParticipants: uniqueUsers.length,
      timeFilter: timeFilter || 'all',
      fromDate: dateFrom?.toISOString() || null,
      toDate: now.toISOString(),
    };
  }

  /**
   * Get live market distribution for current round (real-time from Redis)
   */
  async getLiveMarketDistribution() {
    // Get current active round
    const currentRound = await this.prisma.round.findFirst({
      where: {
        state: { in: [RoundState.OPEN, RoundState.FROZEN] },
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!currentRound) {
      return {
        roundId: null,
        roundNumber: null,
        distribution: [],
        totalBets: 0,
        totalParticipants: 0,
        message: 'No active round',
      };
    }

    // Get totals from Redis (note: Redis may include seeds, so we query DB for accurate counts)
    const totals = await this.getRedisTotals(currentRound.id);
    
    // Get bet counts for current round - EXCLUDE SYSTEM SEEDS
    // This shows only real user bets across all durations (5m, 10m, 20m)
    const betCounts = await this.prisma.bet.groupBy({
      by: ['selection'],
      where: { 
        roundId: currentRound.id,
        isSystemSeed: false,  // Exclude seeding orders
      },
      _count: {
        selection: true,
      },
    });

    const totalBets = betCounts.reduce((sum, item) => sum + item._count.selection, 0);

    // Get unique participants (exclude SYSTEM_SEED user)
    const participants = await this.prisma.bet.groupBy({
      by: ['userId'],
      where: { 
        roundId: currentRound.id,
        isSystemSeed: false,
        userId: { not: 'SYSTEM_SEED' },
      },
      _count: true,
    });

    const allSelections = [
      { selection: 'BUY', market: 'outer', label: 'Buy' },
      { selection: 'SELL', market: 'outer', label: 'Sell' },
      { selection: 'RED', market: 'middle', label: 'Red' },
      { selection: 'BLUE', market: 'middle', label: 'Blue' },
      { selection: 'HIGH_VOL', market: 'inner', label: 'High Volatile' },
      { selection: 'LOW_VOL', market: 'inner', label: 'Low Volatile' },
      { selection: 'INDECISION', market: 'global', label: 'Indecision' },
    ];

    const distribution = allSelections.map(item => {
      const found = betCounts.find(d => d.selection === item.selection);
      const count = found?._count.selection || 0;
      const percentage = totalBets > 0 ? Math.round((count / totalBets) * 10000) / 100 : 0;
      const amount = totals[item.market]?.[item.selection] || 0;
      
      return {
        selection: item.selection,
        market: item.market.toUpperCase(),
        label: item.label,
        count,
        percentage,
        amount,
      };
    });

    return {
      roundId: currentRound.id,
      roundNumber: currentRound.roundNumber,
      distribution,
      totalBets,
      totalParticipants: participants.length,
      totalVolume: Object.values(totals).reduce((sum: number, market: any) => {
        const marketTotal = Object.values(market || {}).reduce<number>((s, v) => s + (Number(v) || 0), 0);
        return sum + marketTotal;
      }, 0),
    };
  }

  /**
   * Get current round totals from Redis (real-time)
   */
  async getRedisTotals(roundId: string) {
    try {
      if (this.redis.status !== 'ready') return {};
      const keys = [
        'outer:BUY',
        'outer:SELL',
        'middle:BLUE',
        'middle:RED',
        'inner:HIGH_VOL',
        'inner:LOW_VOL',
        'global:INDECISION',
      ];

      const totals: any = {};

      for (const key of keys) {
        const value = await this.redis.get(`round:${roundId}:${key}`);
        const [market, selection] = key.split(':');
        if (!totals[market]) totals[market] = {};
        totals[market][selection] = parseFloat(value || '0');
      }

      return totals;
    } catch (e) {
      this.logger.warn(`Redis down, skipping totals fetch: ${e.message}`);
      return {};
    }
  }

  /**
   * Update Redis totals when bet is placed (aggregated across durations)
   */
  private async updateRedisTotals(
    roundId: string,
    market: BetMarket,
    selection: string,
    amount: Decimal,
  ) {
    try {
      if (this.redis.status !== 'ready') return;
      const key = `round:${roundId}:${market.toLowerCase()}:${selection}`;
      await this.redis.incrbyfloat(key, amount.toNumber());

      // Set expiration (24 hours)
      await this.redis.expire(key, 86400);
    } catch (e) {
      this.logger.warn(`Redis down, skipping totals update: ${e.message}`);
    }
  }

  /**
   * v3.0: Update per-instance Redis totals when bet is placed
   * These are used for display purposes only - settlement uses DB snapshot
   */
  private async updateRedisInstanceTotals(
    marketInstanceId: string,
    market: BetMarket,
    selection: string,
    amount: Decimal,
  ) {
    try {
      if (this.redis.status !== 'ready') return;
      const key = `instance:${marketInstanceId}:${market.toLowerCase()}:${selection}`;
      await this.redis.incrbyfloat(key, amount.toNumber());

      // Set expiration (2 hours - instances are shorter-lived)
      await this.redis.expire(key, 7200);
    } catch (e) {
      this.logger.warn(`Redis down, skipping instance totals update: ${e.message}`);
    }
  }

  /**
   * v3.0: Get Redis totals for a specific market instance
   */
  async getRedisInstanceTotals(marketInstanceId: string) {
    try {
      if (this.redis.status !== 'ready') return {};
      const keys = [
        'outer:BUY',
        'outer:SELL',
        'middle:BLUE',
        'middle:RED',
        'inner:HIGH_VOL',
        'inner:LOW_VOL',
        'global:INDECISION',
      ];

      const totals: any = {};

      for (const key of keys) {
        const value = await this.redis.get(`instance:${marketInstanceId}:${key}`);
        const [market, selection] = key.split(':');
        if (!totals[market]) totals[market] = {};
        totals[market][selection] = parseFloat(value || '0');
      }

      return totals;
    } catch (e) {
      this.logger.warn(`Redis down, skipping instance totals fetch: ${e.message}`);
      return {};
    }
  }

  /**
   * Validate selection for market
   */
  private isValidSelection(market: BetMarket, selection: string): boolean {
    const validSelections: Record<BetMarket, string[]> = {
      OUTER: ['BUY', 'SELL'],
      MIDDLE: ['BLUE', 'RED'],
      INNER: ['HIGH_VOL', 'LOW_VOL'],
      GLOBAL: ['INDECISION'],
    };

    return validSelections[market]?.includes(selection) || false;
  }

  /**
   * Admin: Get all bets for a round
   */
  async getAdminRoundBets(roundId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: { roundId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.bet.count({ where: { roundId } }),
    ]);

    return {
      data: bets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
