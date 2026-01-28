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
    // Regular users: 5 seconds before freeze (same as premium for betting window)
    const premiumCutoff = 5;
    const regularCutoff = 5;
    
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
   * v2.1: Includes system seeds in total pool for settlement, but tracks separately
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
    // INCLUDE system seeds in totals for settlement (prevents 0-0)
    // EXCLUDE demo bets - they don't affect who wins
    const bets = await tx.bet.findMany({
      where: {
        roundId,
        status: 'ACCEPTED',
        isDemo: false, // Only count live bets for winner determination
        // NOTE: isSystemSeed bets ARE included in totals for settlement
      },
      select: {
        market: true,
        selection: true,
        amountUsd: true,
        isSystemSeed: true,
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
   * Compute USER-ONLY totals (excludes seeds) for UI display
   * v2.1: Power bars should reflect User Pool only
   */
  async computeUserOnlyTotals(roundId: string) {
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

    // EXCLUDE both seeds and demo bets for UI display
    const bets = await this.prisma.bet.findMany({
      where: {
        roundId,
        status: 'ACCEPTED',
        isDemo: false,
        isSystemSeed: false, // Exclude seeds from UI totals
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

  /**
   * Capture market state checkpoint for sub-round settlements
   */
  async captureCheckpoint(roundId: string, checkpointMinutes: number) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        artifact: {
          select: {
            secret: true,
          },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Round not found');
    }

    // Determine market winners at this checkpoint based on totals
    const outerWinner = this.determineWinner(round.outerBuy, round.outerSell, ['BUY', 'SELL']);
    const middleWinner = this.determineWinner(round.middleBlue, round.middleRed, ['BLUE', 'RED']);
    const innerWinner = this.determineWinner(round.innerHighVol, round.innerLowVol, ['HIGH_VOL', 'LOW_VOL']);

    // Check if indecision is triggered (global INDECISION bets exist)
    const indecisionTriggered = round.globalIndecision.gt(0);

    const checkpoint = {
      timestamp: new Date().toISOString(),
      roundMinuteMark: checkpointMinutes,
      outerWinner: outerWinner.winner,
      outerTied: outerWinner.tied,
      middleWinner: middleWinner.winner,
      middleTied: middleWinner.tied,
      innerWinner: innerWinner.winner,
      innerTied: innerWinner.tied,
      indecisionTriggered,
      totals: {
        outerBuy: round.outerBuy.toString(),
        outerSell: round.outerSell.toString(),
        middleBlue: round.middleBlue.toString(),
        middleRed: round.middleRed.toString(),
        innerHighVol: round.innerHighVol.toString(),
        innerLowVol: round.innerLowVol.toString(),
        globalIndecision: round.globalIndecision.toString(),
      },
    };

    // Store checkpoint in the appropriate field
    const updateData: any = {};
    if (checkpointMinutes === 15) {
      updateData.checkpoint15min = checkpoint;
    } else if (checkpointMinutes === 10) {
      updateData.checkpoint10min = checkpoint;
    } else if (checkpointMinutes === 5) {
      updateData.checkpoint5min = checkpoint;
    }

    await this.prisma.round.update({
      where: { id: roundId },
      data: updateData,
    });

    this.logger.log(
      `📸 Checkpoint captured for Round ${round.roundNumber} at ${checkpointMinutes} min mark`,
    );

    return checkpoint;
  }

  /**
   * Helper to determine winner between two sides
   */
  private determineWinner(
    sideA: Decimal,
    sideB: Decimal,
    labels: [string, string],
  ): { winner: string | null; tied: boolean } {
    if (sideA.eq(sideB)) {
      return { winner: null, tied: true };
    }
    return {
      winner: sideA.gt(sideB) ? labels[0] : labels[1],
      tied: false,
    };
  }
}
