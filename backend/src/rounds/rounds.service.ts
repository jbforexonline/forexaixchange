// =============================================================================
// ROUNDS SERVICE - Round Lifecycle Management
// =============================================================================
// Path: backend/src/rounds/rounds.service.ts
// =============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RoundState, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as crypto from 'crypto';

@Injectable()
export class RoundsService {
  private readonly logger = new Logger(RoundsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Open a new round with cryptographic commitment
   *
   * Unified behaviour (dev + prod):
   * - Round duration: 20 minutes (1200 seconds) by default
   *   - Override via env ROUND_DURATION_MINUTES (allowed: 5, 10, 15, 20)
   *   - Or via explicit roundDuration param (in seconds)
   * - Freeze window: last 60 seconds of the round (no new orders)
   * - Premium cutoff: 5 seconds before freeze
   * - Regular cutoff: 60 seconds before freeze
   */
  async openNewRound(
    roundDuration?: number, // User's preferred duration or default
    freezeOffset?: number,  // Freeze period before settlement
  ) {
    // Determine default round duration (can be overridden by env)
    if (!roundDuration) {
      const envMinutes = Number(process.env.ROUND_DURATION_MINUTES || '20');
      const allowedMinutes = [5, 10, 15, 20];
      const useMinutes = allowedMinutes.includes(envMinutes) ? envMinutes : 20;
      roundDuration = useMinutes * 60;
      this.logger.log(`⏰ Round Duration: ${useMinutes} minutes (env/ default)`);
    }

    // Freeze window: last 60 seconds of the round
    if (!freezeOffset) {
      freezeOffset = 60;
    }

    // Order cutoffs: time before freeze when orders must be placed
    // Premium users: 5 seconds before freeze
    // Regular users: 60 seconds before freeze
    const premiumCutoff = 5;
    const regularCutoff = 60;
    
    const openedAt = new Date();
    const freezeAt = new Date(openedAt.getTime() + (roundDuration - freezeOffset) * 1000);
    const settleAt = new Date(openedAt.getTime() + roundDuration * 1000);

    // Generate secret for fairness
    const secret = crypto.randomBytes(32).toString('hex');
    const commitHash = crypto
      .createHash('sha256')
      .update(`${openedAt.getTime()}||${secret}`)
      .digest('hex');

    return this.prisma.$transaction(async (tx) => {
      // Get next round number
      const lastRound = await tx.round.findFirst({
        orderBy: { roundNumber: 'desc' },
      });
      const roundNumber = (lastRound?.roundNumber || 0) + 1;

      // Create round
      const round = await tx.round.create({
        data: {
          roundNumber,
          state: RoundState.OPEN,
          openedAt,
          freezeAt,
          settleAt,
          roundDuration,
          freezeOffset,
          premiumCutoff,
          regularCutoff,
          artifact: {
            create: {
              commitHash,
              secret, // Store encrypted in production
              artifactData: {
                timestamp: openedAt.getTime(),
                secret: secret,
                algorithm: 'sha256',
                version: '1.0'
              }
            },
          },
        },
        include: {
          artifact: true,
        },
      });

      this.logger.log(
        `🎰 Round ${roundNumber} OPENED - Freeze: ${freezeAt.toISOString()}, Settle: ${settleAt.toISOString()}`,
      );
      this.logger.log(`🔐 Commit Hash: ${commitHash}`);

      return round;
    });
  }

  /**
   * Get the current round for display (includes all active states)
   */
  async getCurrentRound() {
    return this.prisma.round.findFirst({
      where: {
        state: {
          // Include SETTLING to avoid gaps when settlement is processing
          in: [RoundState.OPEN, RoundState.FROZEN, RoundState.SETTLING, RoundState.SETTLED],
        },
      },
      orderBy: { roundNumber: 'desc' },
      include: {
        artifact: {
          select: {
            commitHash: true,
            // Don't include secret until SETTLED
          },
        },
        _count: {
          select: {
            bets: true,
          },
        },
      },
    });
  }

  /**
   * Get only truly active rounds (OPEN or FROZEN) - used by scheduler
   */
  async getActiveRound() {
    return this.prisma.round.findFirst({
      where: {
        state: {
          in: [RoundState.OPEN, RoundState.FROZEN],
        },
      },
      orderBy: { roundNumber: 'desc' },
    });
  }

  /**
   * Get round by ID or number
   */
  async getRound(identifier: string | number) {
    const where: Prisma.RoundWhereUniqueInput =
      typeof identifier === 'number'
        ? { roundNumber: identifier }
        : { id: identifier };

    const round = await this.prisma.round.findUnique({
      where,
      include: {
        artifact: true,
        _count: {
          select: {
            bets: true,
          },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    return round;
  }

  /**
   * Get rounds that are about to freeze (OPEN and freezeAt <= now)
   * v2.1: Used to apply seeding before actual freeze
   */
  async getRoundsAboutToFreeze() {
    const now = new Date();
    return this.prisma.round.findMany({
      where: {
        state: RoundState.OPEN,
        freezeAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        roundNumber: true,
        state: true,
        freezeAt: true,
      },
    });
  }

  /**
   * Freeze rounds that have reached their freeze time
   */
  async freezeExpiredRounds() {
    const now = new Date();

    const toFreeze = await this.prisma.round.findMany({
      where: {
        state: RoundState.OPEN,
        freezeAt: {
          lte: now,
        },
      },
    });

    if (toFreeze.length === 0) return [];

    const results = [];
    for (const round of toFreeze) {
      try {
        const frozen = await this.freezeRound(round.id);
        results.push(frozen);
      } catch (error) {
        this.logger.error(`Failed to freeze round ${round.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Freeze a specific round and compute final totals
   */
  async freezeRound(roundId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the round
      const round = await tx.round.findUnique({
        where: { id: roundId },
      });

      if (!round) {
        throw new NotFoundException('Round not found');
      }

      if (round.state !== RoundState.OPEN) {
        throw new Error(`Round ${round.roundNumber} is not OPEN`);
      }

      // Compute final totals from ALL bets
      const totals = await this.computeRoundTotals(roundId, tx);

      // Update round with totals and freeze state
      const frozen = await tx.round.update({
        where: { id: roundId },
        data: {
          state: RoundState.FROZEN,
          ...totals,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `❄️  Round ${frozen.roundNumber} FROZEN - Totals computed, awaiting settlement`,
      );

      return frozen;
    });
  }

  /**
   * Compute final totals from database (authoritative source)
   * v3.1: CRITICAL FIX - Only count 20m bets for the master round!
   * This ensures pool separation between 5m/10m/20m durations.
   */
  private async computeRoundTotals(
    roundId: string,
    tx: Prisma.TransactionClient,
  ) {
    const totals = {
      outerBuy: new Decimal(0),
      outerSell: new Decimal(0),
      middleBlue: new Decimal(0),
      middleRed: new Decimal(0),
      innerHighVol: new Decimal(0),
      innerLowVol: new Decimal(0),
      globalIndecision: new Decimal(0),
      totalVolume: new Decimal(0),
    };

    // Aggregate by market and selection
    // EXCLUDE demo bets from totals - they don't affect who wins
    // v3.1 FIX: ONLY count 20-minute duration bets for master round!
    // 5m and 10m bets have their own separate market instances.
    const bets = await tx.bet.findMany({
      where: {
        roundId,
        status: 'ACCEPTED',
        isDemo: false, // Only count live bets for winner determination
        durationMinutes: 'TWENTY', // v3.1: CRITICAL - Only 20m bets for master round
      },
      select: {
        market: true,
        selection: true,
        amountUsd: true,
      },
    });

    for (const bet of bets) {
      const amount = bet.amountUsd;
      totals.totalVolume = totals.totalVolume.add(amount);

      switch (bet.market) {
        case 'OUTER':
          if (bet.selection === 'BUY') totals.outerBuy = totals.outerBuy.add(amount);
          else if (bet.selection === 'SELL') totals.outerSell = totals.outerSell.add(amount);
          break;
        case 'MIDDLE':
          if (bet.selection === 'BLUE') totals.middleBlue = totals.middleBlue.add(amount);
          else if (bet.selection === 'RED') totals.middleRed = totals.middleRed.add(amount);
          break;
        case 'INNER':
          if (bet.selection === 'HIGH_VOL') totals.innerHighVol = totals.innerHighVol.add(amount);
          else if (bet.selection === 'LOW_VOL') totals.innerLowVol = totals.innerLowVol.add(amount);
          break;
        case 'GLOBAL':
          if (bet.selection === 'INDECISION') {
            totals.globalIndecision = totals.globalIndecision.add(amount);
          }
          break;
      }
    }

    return totals;
  }

  /**
   * Get rounds ready for settlement
   */
  async getRoundsToSettle() {
    const now = new Date();

    return this.prisma.round.findMany({
      where: {
        state: RoundState.FROZEN,
        settleAt: {
          lte: now,
        },
      },
      orderBy: { settleAt: 'asc' },
    });
  }

  /**
   * Get round history with pagination
   */
  async getRoundHistory(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [rounds, total] = await Promise.all([
      this.prisma.round.findMany({
        where: {
          state: RoundState.SETTLED,
        },
        skip,
        take: limit,
        orderBy: { roundNumber: 'desc' },
        include: {
          artifact: {
            select: {
              commitHash: true,
              secret: true,
              revealedAt: true,
            },
          },
          _count: {
            select: {
              bets: true,
            },
          },
        },
      }),
      this.prisma.round.count({
        where: {
          state: RoundState.SETTLED,
        },
      }),
    ]);

    return {
      data: rounds,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * v3.0: Get market instance history by duration with time period filtering
   */
  async getMarketInstanceHistory(
    duration?: number,
    page = 1,
    limit = 20,
    period?: string,
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: 'SETTLED',
    };

    // Filter by duration if specified
    if (duration) {
      const durationMap: Record<number, string> = {
        5: 'FIVE',
        10: 'TEN',
        20: 'TWENTY',
      };
      if (durationMap[duration]) {
        whereClause.durationMinutes = durationMap[duration];
      }
    }

    // Filter by time period
    if (period) {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'hourly':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'daily':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarterly':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'annually':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      whereClause.settledAt = {
        gte: startDate,
      };
    }

    const [instances, total] = await Promise.all([
      this.prisma.marketInstance.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { settledAt: 'desc' },
        include: {
          masterRound: {
            select: {
              roundNumber: true,
              settledAt: true,
            },
          },
        },
      }),
      this.prisma.marketInstance.count({ where: whereClause }),
    ]);

    // Transform the data to include formatted results
    const formattedInstances = instances.map((instance: any) => {
      // Determine winners - use correct field names from settlement
      const outerWinner = instance.outerWinner;
      const middleWinner = instance.middleWinner;
      const innerWinner = instance.innerWinner;
      const indecisionTriggered = instance.indecisionTriggered || false;

      // Format result text
      let resultText = '';
      
      if (indecisionTriggered) {
        resultText = 'INDECISION';
      } else {
        const winners = [];
        if (outerWinner) winners.push(outerWinner);
        if (middleWinner) winners.push(middleWinner);
        if (innerWinner) winners.push(innerWinner);
        resultText = winners.join(', ') || 'N/A';
      }

      return {
        id: instance.id,
        masterRoundId: instance.masterRoundId,
        roundNumber: instance.masterRound?.roundNumber,
        durationMinutes: instance.durationMinutes,
        windowStart: instance.windowStartMinutes,
        windowEnd: instance.windowEndMinutes,
        status: instance.status,
        settledAt: instance.settledAt,
        openedAt: instance.openedAt,
        // Results
        outerWinner,
        middleWinner,
        innerWinner,
        indecisionTriggered,
        resultText,
        // Pools
        totalVolume: instance.totalVolume,
      };
    });

    return {
      data: formattedInstances,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        duration: duration || 'all',
        period: period || 'all',
      },
    };
  }

  /**
   * Get round statistics
   */
  async getRoundStats() {
    const [totalRounds, activeRound, avgVolume, totalBets] = await Promise.all([
      this.prisma.round.count(),
      this.getCurrentRound(),
      this.prisma.round.aggregate({
        where: { state: RoundState.SETTLED },
        _avg: { totalVolume: true },
      }),
      this.prisma.bet.count(),
    ]);

    return {
      totalRounds,
      activeRound: activeRound
        ? {
            roundNumber: activeRound.roundNumber,
            state: activeRound.state,
            freezeAt: activeRound.freezeAt,
            settleAt: activeRound.settleAt,
            betsCount: activeRound._count.bets,
          }
        : null,
      averageVolume: avgVolume._avg.totalVolume || 0,
      totalBets,
    };
  }

  /**
   * Admin: Force freeze a round (emergency)
   */
  async adminForceFreeze(roundId: string) {
    const round = await this.getRound(roundId);
    
    if (round.state !== RoundState.OPEN) {
      throw new Error('Can only force freeze OPEN rounds');
    }

    return this.freezeRound(roundId);
  }

  /**
   * Admin: Cancel a round (emergency, before settlement)
   */
  async adminCancelRound(roundId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const round = await tx.round.findUnique({
        where: { id: roundId },
      });

      if (!round || round.state === RoundState.SETTLED) {
        throw new Error('Cannot cancel settled round');
      }

      // Refund all bets
      const bets = await tx.bet.findMany({
        where: {
          roundId,
          status: 'ACCEPTED',
        },
      });

      for (const bet of bets) {
        // Return held funds to available
        await tx.wallet.update({
          where: { userId: bet.userId },
          data: {
            available: { increment: bet.amountUsd },
            held: { decrement: bet.amountUsd },
          },
        });

        // Update bet status
        await tx.bet.update({
          where: { id: bet.id },
          data: {
            status: 'CANCELLED',
          },
        });

        // Create refund transaction
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: 'REFUND',
            amount: bet.amountUsd,
            status: 'COMPLETED',
            description: `Round ${round.roundNumber} cancelled: ${reason}`,
          },
        });
      }

      // Mark round as settled (cancelled)
      const cancelled = await tx.round.update({
        where: { id: roundId },
        data: {
          state: RoundState.SETTLED,
          settledAt: new Date(),
        },
      });

      this.logger.warn(
        `⚠️  Round ${round.roundNumber} CANCELLED by admin: ${reason}`,
      );

      return cancelled;
    });
  }
}
