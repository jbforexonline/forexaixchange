// =============================================================================
// BETS SERVICE - Bet Placement and Management
// =============================================================================
// Path: backend/src/rounds/bets.service.ts
// =============================================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BetMarket, RoundState } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface PlaceBetDto {
  roundId: string;
  market: BetMarket;
  selection: string;
  amountUsd: number;
  idempotencyKey?: string;
}

@Injectable()
export class BetsService {
  private readonly logger = new Logger(BetsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private gateway: RealtimeGateway,
  ) {}

  /**
   * Place a bet on the current round
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

      // 4. Check timing constraints (premium vs regular)
      const now = new Date();
      const cutoffTime = isPremium
        ? new Date(round.freezeAt.getTime() - round.premiumCutoff * 1000)
        : new Date(round.freezeAt.getTime() - round.regularCutoff * 1000);

      if (now >= cutoffTime) {
        throw new BadRequestException(
          `Market closed - orders no longer accepted`,
        );
      }

      // 5. Check wallet balance
      if (user.wallet.available.lt(amount)) {
        throw new BadRequestException('Insufficient funds');
      }

      // 6. Apply bet limits (could be configurable)
      const minBet = new Decimal(1); // $1 minimum
      const maxBet = isPremium ? new Decimal(200) : new Decimal(1000); // Premium: $200 per order, Regular: $1000 per order

      if (amount.lt(minBet) || amount.gt(maxBet)) {
        throw new BadRequestException(
          `Order amount must be between $${minBet.toString()} and $${maxBet.toString()}`,
        );
      }

      // 7. Create bet using Prisma relation connect syntax
      const bet = await tx.bet.create({
        data: {
          round: { connect: { id: dto.roundId } },
          user: { connect: { id: userId } },
          market: dto.market,
          selection: dto.selection,
          amountUsd: amount,
          status: 'ACCEPTED',
          isPremiumUser: isPremium ?? false,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      // 8. Hold funds in wallet
      await tx.wallet.update({
        where: { userId },
        data: {
          available: { decrement: amount },
          held: { increment: amount },
        },
      });

      // 9. Update Redis totals for real-time UI
      await this.updateRedisTotals(dto.roundId, dto.market, dto.selection, amount);

      // 10. Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: 'SPIN_LOSS', // Temporary, will be updated on settlement
          amount,
          status: 'PENDING',
          description: `Bet placed - Round ${round.roundNumber} ${dto.market} ${dto.selection}`,
        },
      });

      this.logger.log(
        `💰 Bet placed: ${user.username} - ${dto.market} ${dto.selection} $${amount.toString()} (Round ${round.roundNumber})`,
      );

      // 11. Emit WebSocket event for live updates
      this.gateway.server.emit('betPlaced', {
        roundId: dto.roundId,
        roundNumber: round.roundNumber,
        market: dto.market,
        selection: dto.selection,
        amount: amount.toNumber(),
        username: user.username,
      });

      // Emit updated totals
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

      // Check cutoff time
      const cutoffTime = isPremium
        ? new Date(bet.round.freezeAt.getTime() - bet.round.premiumCutoff * 1000)
        : new Date(bet.round.freezeAt.getTime() - bet.round.regularCutoff * 1000);

      if (now >= cutoffTime) {
        throw new BadRequestException(
          'Cannot cancel order: cutoff time has passed',
        );
      }

      // Refund held funds
      await tx.wallet.update({
        where: { userId },
        data: {
          available: { increment: bet.amountUsd },
          held: { decrement: bet.amountUsd },
        },
      });

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
   * Get user's bets for a round
   */
  async getUserBets(userId: string, roundId: string) {
    return this.prisma.bet.findMany({
      where: {
        userId,
        roundId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's bet history with pagination
   */
  async getUserBetHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [bets, total] = await Promise.all([
      this.prisma.bet.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          round: {
            select: {
              roundNumber: true,
              state: true,
              settledAt: true,
            },
          },
        },
      }),
      this.prisma.bet.count({ where: { userId } }),
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
   * Get current round totals from Redis (real-time)
   */
  async getRedisTotals(roundId: string) {
    try {
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
    } catch (error) {
      this.logger.warn(`Redis getRedisTotals failed: ${error.message}`);
      // Return empty totals if Redis fails
      return {
        outer: { BUY: 0, SELL: 0 },
        middle: { BLUE: 0, RED: 0 },
        inner: { HIGH_VOL: 0, LOW_VOL: 0 },
        global: { INDECISION: 0 },
      };
    }
  }

  /**
   * Update Redis totals when bet is placed
   */
  private async updateRedisTotals(
    roundId: string,
    market: BetMarket,
    selection: string,
    amount: Decimal,
  ) {
    try {
      const key = `round:${roundId}:${market.toLowerCase()}:${selection}`;
      await this.redis.incrbyfloat(key, amount.toNumber());

      // Set expiration (24 hours)
      await this.redis.expire(key, 86400);
    } catch (error) {
      this.logger.warn(`Redis updateRedisTotals failed: ${error.message}`);
      // Continue without Redis - not fatal
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
