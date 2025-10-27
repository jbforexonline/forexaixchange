// =============================================================================
// BETS SERVICE - Bet Placement and Management
// =============================================================================
// Path: backend/src/rounds/bets.service.ts
// =============================================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
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
    const amount = new Decimal(dto.amountUsd);

    // Validation
    if (amount.lte(0)) {
      throw new BadRequestException('Bet amount must be positive');
    }

    if (!this.isValidSelection(dto.market, dto.selection)) {
      throw new BadRequestException(`Invalid selection for market ${dto.market}`);
    }

    return this.prisma.$transaction(async (tx) => {
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
        throw new BadRequestException('Round is not accepting bets');
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
          `Betting window closed for ${isPremium ? 'premium' : 'regular'} users`,
        );
      }

      // 5. Check wallet balance
      if (user.wallet.available.lt(amount)) {
        throw new BadRequestException('Insufficient funds');
      }

      // 6. Apply bet limits (could be configurable)
      const minBet = new Decimal(1); // $1 minimum
      const maxBet = isPremium ? new Decimal(10000) : new Decimal(1000);

      if (amount.lt(minBet) || amount.gt(maxBet)) {
        throw new BadRequestException(
          `Bet must be between $${minBet.toString()} and $${maxBet.toString()}`,
        );
      }

      // 7. Create bet
      const bet = await tx.bet.create({
        data: {
          roundId: dto.roundId,
          userId,
          market: dto.market,
          selection: dto.selection,
          amountUsd: amount,
          status: 'ACCEPTED',
          isPremiumUser: isPremium,
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

      return bet;
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
    const key = `round:${roundId}:${market.toLowerCase()}:${selection}`;
    await this.redis.incrbyfloat(key, amount.toNumber());

    // Set expiration (24 hours)
    await this.redis.expire(key, 86400);
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
