// =============================================================================
// ROUNDS SETTLEMENT SERVICE - Core Settlement Algorithm
// =============================================================================
// Path: backend/src/rounds/rounds-settlement.service.ts
// Implements: Minority rule + Indecision override from Spin V1 spec
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RoundState, BetMarket, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface LayerTotals {
  a: Decimal;
  b: Decimal;
  labelA: string;
  labelB: string;
}

interface SettlementResult {
  indecisionTriggered: boolean;
  layerResults: {
    outer: { winner: string | null; tied: boolean };
    middle: { winner: string | null; tied: boolean };
    inner: { winner: string | null; tied: boolean };
  };
  payouts: Map<string, { isWinner: boolean; payoutAmount: Decimal; profitAmount: Decimal }>;
  houseFee: Decimal;
}

@Injectable()
export class RoundsSettlementService {
  private readonly logger = new Logger(RoundsSettlementService.name);
  private readonly FEE_BPS = 200; // 2% house fee

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private gateway: RealtimeGateway,
  ) {}

  /**
   * Main settlement entry point
   */
  async settleRound(roundId: string) {
    // Acquire Redis lock to prevent concurrent settlement
    const lockKey = `lock:settle:round:${roundId}`;
    const lockValue = Date.now().toString();
    let lockAcquired = false;
    try {
      if (this.redis.status === 'ready') {
        const result = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');
        lockAcquired = result === 'OK';
      } else {
        this.logger.warn(`Redis not ready, skipping lock for round ${roundId}`);
        lockAcquired = true; // Fallback: allow settlement if Redis is down
      }
    } catch (e) {
      this.logger.warn(`Failed to acquire lock: ${e.message}. Proceeding anyway.`);
      lockAcquired = true;
    }

    if (!lockAcquired) {
      this.logger.warn(`Settlement already in progress for round ${roundId}`);
      return null;
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Lock the round
          const round = await tx.round.findUnique({
            where: { id: roundId },
            include: {
              bets: {
                where: { status: 'ACCEPTED' },
              },
              artifact: true,
            },
          });

          if (!round) {
            throw new Error('Round not found');
          }

          if (round.state !== RoundState.FROZEN) {
            throw new Error(`Round must be FROZEN, currently: ${round.state}`);
          }

          this.logger.log(`⚙️  Settling Round ${round.roundNumber}... (${round.bets.length} unsettled bets)`);

          // Count already-settled bets
          const alreadySettled = await tx.bet.count({
            where: { 
              roundId, 
              status: { in: ['WON', 'LOST'] } 
            }
          });
          
          if (alreadySettled > 0) {
            this.logger.log(`📊 ${alreadySettled} bets already settled at checkpoints (excluded from final settlement)`);
          }

          // 2. Transition to SETTLING
          await tx.round.update({
            where: { id: roundId },
            data: { state: RoundState.SETTLING },
          });

          // 3. Run settlement algorithm
          const settlement = await this.computeSettlement(round, round.bets);

          // 4. Apply payouts to all bets
          await this.applyPayouts(tx, round, settlement);

          // 5. Update round with results
          const settledRound = await tx.round.update({
            where: { id: roundId },
            data: {
              state: RoundState.SETTLED,
              settledAt: new Date(),
              indecisionTriggered: settlement.indecisionTriggered,
              outerWinner: settlement.layerResults.outer.winner,
              middleWinner: settlement.layerResults.middle.winner,
              innerWinner: settlement.layerResults.inner.winner,
              outerTied: settlement.layerResults.outer.tied,
              middleTied: settlement.layerResults.middle.tied,
              innerTied: settlement.layerResults.inner.tied,
              totalHouseFee: settlement.houseFee,
            },
          });

          // 6. Update fairness artifact
          if (round.artifact) {
            const artifactData = {
              roundNumber: round.roundNumber,
              totals: {
                outerBuy: round.outerBuy.toString(),
                outerSell: round.outerSell.toString(),
                middleBlue: round.middleBlue.toString(),
                middleRed: round.middleRed.toString(),
                innerHighVol: round.innerHighVol.toString(),
                innerLowVol: round.innerLowVol.toString(),
                globalIndecision: round.globalIndecision.toString(),
              },
              settlement: {
                indecisionTriggered: settlement.indecisionTriggered,
                winners: settlement.layerResults,
                houseFee: settlement.houseFee.toString(),
                totalPaid: Array.from(settlement.payouts.values())
                  .reduce((sum, p) => sum.add(p.payoutAmount), new Decimal(0))
                  .toString(),
              },
              timestamp: new Date().toISOString(),
              betCount: round.bets.length,
            };

            await tx.fairnessArtifact.update({
              where: { id: round.artifact.id },
              data: {
                artifactData,
                revealedAt: new Date(),
              },
            });
          }

          this.logger.log(
            `✅ Round ${round.roundNumber} SETTLED - ` +
              `Indecision: ${settlement.indecisionTriggered}, ` +
              `House Fee: $${settlement.houseFee.toFixed(2)}, ` +
              `Winners: ${settlement.payouts.size}`,
          );

          // 7. Broadcast settlement via WebSocket
          this.gateway.server.emit('roundSettled', {
            roundId,
            roundNumber: round.roundNumber,
            indecisionTriggered: settlement.indecisionTriggered,
            winners: settlement.layerResults,
          });

          return settledRound;
        },
        {
          timeout: 60000, // 60 second timeout for large rounds
          maxWait: 10000,
        },
      );
    } finally {
      // Release lock
      try {
        if (this.redis.status === 'ready') {
          const currentValue = await this.redis.get(lockKey);
          if (currentValue === lockValue) {
            await this.redis.del(lockKey);
          }
        }
      } catch (e) {
        // Ignore redis errors on unlock
      }
    }
  }

  /**
   * Core settlement algorithm from Spin V1 spec
   */
  private async computeSettlement(round: any, bets: any[]): Promise<SettlementResult> {
    const result: SettlementResult = {
      indecisionTriggered: false,
      layerResults: {
        outer: { winner: null, tied: false },
        middle: { winner: null, tied: false },
        inner: { winner: null, tied: false },
      },
      payouts: new Map(),
      houseFee: new Decimal(0),
    };

    // Check for ties (both sides > 0 and equal to the cent)
    const outerTied = this.isTied(round.outerBuy, round.outerSell);
    const middleTied = this.isTied(round.middleBlue, round.middleRed);
    const innerTied = this.isTied(round.innerHighVol, round.innerLowVol);

    result.layerResults.outer.tied = outerTied;
    result.layerResults.middle.tied = middleTied;
    result.layerResults.inner.tied = innerTied;

    // INDECISION OVERRIDE: If ANY layer is tied
    if (outerTied || middleTied || innerTied) {
      result.indecisionTriggered = true;
      this.logger.log(`🎯 INDECISION TRIGGERED!`);

      // All layer bets lose, only INDECISION bets win
      const losersPool = round.outerBuy
        .add(round.outerSell)
        .add(round.middleBlue)
        .add(round.middleRed)
        .add(round.innerHighVol)
        .add(round.innerLowVol);

      // Calculate house fee from losers pool (2%)
      const houseFee = losersPool.mul(this.FEE_BPS).div(10000);
      result.houseFee = houseFee;

      // Calculate payouts with fixed 2x multiplier
      for (const bet of bets) {
        if (bet.market === BetMarket.GLOBAL && bet.selection === 'INDECISION') {
          // INDECISION bets win: Fixed 2x payout
          const payoutAmount = bet.amountUsd.mul(2); // Fixed 2x multiplier
          const profitAmount = bet.amountUsd; // Profit = stake (2x - 1x = 1x)
          result.payouts.set(bet.id, {
            isWinner: true,
            payoutAmount: payoutAmount,
            profitAmount: profitAmount,
          });
        } else {
          // All layer bets lose: Lose 100% of bet
          result.payouts.set(bet.id, {
            isWinner: false,
            payoutAmount: new Decimal(0),
            profitAmount: new Decimal(0),
          });
        }
      }
    } else {
      // NO TIES: Each layer settles independently by MINORITY RULE
      this.logger.log(`📊 Standard Settlement - Minority Rule`);

      // Determine winners
      result.layerResults.outer.winner = this.determineWinner(
        round.outerBuy,
        round.outerSell,
        'BUY',
        'SELL',
      );
      result.layerResults.middle.winner = this.determineWinner(
        round.middleBlue,
        round.middleRed,
        'BLUE',
        'RED',
      );
      result.layerResults.inner.winner = this.determineWinner(
        round.innerHighVol,
        round.innerLowVol,
        'HIGH_VOL',
        'LOW_VOL',
      );

      // Settle each layer independently
      const outerPayouts = this.settleLayer(
        { a: round.outerBuy, b: round.outerSell, labelA: 'BUY', labelB: 'SELL' },
        result.layerResults.outer.winner!,
        bets.filter((b) => b.market === BetMarket.OUTER),
      );

      const middlePayouts = this.settleLayer(
        { a: round.middleBlue, b: round.middleRed, labelA: 'BLUE', labelB: 'RED' },
        result.layerResults.middle.winner!,
        bets.filter((b) => b.market === BetMarket.MIDDLE),
      );

      const innerPayouts = this.settleLayer(
        { a: round.innerHighVol, b: round.innerLowVol, labelA: 'HIGH_VOL', labelB: 'LOW_VOL' },
        result.layerResults.inner.winner!,
        bets.filter((b) => b.market === BetMarket.INNER),
      );

      // Merge payouts
      outerPayouts.payouts.forEach((v, k) => result.payouts.set(k, v));
      middlePayouts.payouts.forEach((v, k) => result.payouts.set(k, v));
      innerPayouts.payouts.forEach((v, k) => result.payouts.set(k, v));

      result.houseFee = outerPayouts.houseFee
        .add(middlePayouts.houseFee)
        .add(innerPayouts.houseFee);

      // INDECISION bets lose when no tie
      for (const bet of bets.filter((b) => b.market === BetMarket.GLOBAL)) {
        result.payouts.set(bet.id, {
          isWinner: false,
          payoutAmount: new Decimal(0),
          profitAmount: new Decimal(0),
        });
      }
    }

    return result;
  }

  /**
   * Check if two amounts constitute a tie
   * Updated v2.1: Tie if both sides are equal AND both have user bets
   * With seeding enabled, 0-0 won't occur (seed prevents it)
   * Tie only triggers Indecision when USERS created the tie
   */
  private isTied(a: Decimal, b: Decimal): boolean {
    // Tie if both sides are equal (to the cent)
    // Note: With seeding, 0-0 should not occur at freeze
    // Seeds are excluded from tie detection since they self-destruct when users bet
    return a.eq(b);
  }

  /**
   * Determine winner by minority rule
   */
  private determineWinner(
    a: Decimal,
    b: Decimal,
    labelA: string,
    labelB: string,
  ): string {
    if (a.eq(0) && b.eq(0)) return labelA; // Default if no bets
    return a.lt(b) ? labelA : labelB; // Minority wins
  }

  /**
   * Settle a single layer using minority rule
   * Payout Rule: Winner receives exactly 2x their bet amount (fixed multiplier)
   */
  private settleLayer(
    totals: LayerTotals,
    winner: string,
    bets: any[],
  ): { payouts: Map<string, any>; houseFee: Decimal } {
    const payouts = new Map();

    const winnersPool =
      winner === totals.labelA ? totals.a : totals.b;
    const losersPool =
      winner === totals.labelA ? totals.b : totals.a;

    // Calculate house fee from losers pool (2%)
    const houseFee = losersPool.mul(this.FEE_BPS).div(10000);

    // Fixed 2x payout: Winner receives exactly 2x their bet amount
    for (const bet of bets) {
      if (bet.selection === winner) {
        // Winner: Fixed 2x payout
        const payoutAmount = bet.amountUsd.mul(2); // Fixed 2x multiplier
        const profitAmount = bet.amountUsd; // Profit = stake (2x - 1x = 1x)
        payouts.set(bet.id, {
          isWinner: true,
          payoutAmount: payoutAmount,
          profitAmount: profitAmount,
        });
      } else {
        // Loser: Loses 100% of bet
        payouts.set(bet.id, {
          isWinner: false,
          payoutAmount: new Decimal(0),
          profitAmount: new Decimal(0),
        });
      }
    }

    return { payouts, houseFee };
  }

  /**
   * Apply payouts atomically to all bets
   * Updated v2.1: Handles system seeds separately
   */
  private async applyPayouts(
    tx: Prisma.TransactionClient,
    round: any,
    settlement: SettlementResult,
  ) {
    // 1. First, ensure PlatformAccount exists
    let platformAccount = await (tx as any).platformAccount.findUnique({
      where: { id: 'HOUSE' },
    });

    if (!platformAccount) {
      // Create house account with initial reserve
      platformAccount = await (tx as any).platformAccount.create({
        data: {
          id: 'HOUSE',
          balance: new Decimal(0),
          reserveBalance: new Decimal(10000), // $10,000 initial reserve
        },
      });
      this.logger.log('🏦 House account created with $10,000 reserve');
    }

    // 2. Calculate totals for this round
    let totalCollectedFromLosers = new Decimal(0);
    let totalPaidToWinners = new Decimal(0);
    let seedWins = new Decimal(0);
    let seedLosses = new Decimal(0);

    // 3. Process all bets (separate user bets from seeds)
    for (const bet of round.bets) {
      // Skip system seed bets - they don't affect user wallets
      if ((bet as any).isSystemSeed) {
        const payout = settlement.payouts.get(bet.id);
        if (payout) {
          // Track seed outcomes for reporting
          if (payout.isWinner) {
            seedWins = seedWins.add(payout.profitAmount);
          } else {
            seedLosses = seedLosses.add(bet.amountUsd);
          }
          // Update seed bet status
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: payout.isWinner ? 'WON' : 'LOST',
              isWinner: payout.isWinner,
              payoutAmount: payout.payoutAmount,
              profitAmount: payout.profitAmount,
              settledAt: new Date(),
            },
          });
        }
        continue; // Don't process wallet updates for seeds
      }
      const payout = settlement.payouts.get(bet.id);
      if (!payout) continue;

      // Update bet status
      await tx.bet.update({
        where: { id: bet.id },
        data: {
          status: payout.isWinner ? 'WON' : 'LOST',
          isWinner: payout.isWinner,
          payoutAmount: payout.payoutAmount,
          profitAmount: payout.profitAmount,
          settledAt: new Date(),
        },
      });

      // Update wallet
      if (payout.isWinner) {
        if ((bet as any).isDemo) {
          // Demo Winner: return stake + profit to demoAvailable, remove from demoHeld
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              demoAvailable: { increment: payout.payoutAmount },
              demoHeld: { decrement: bet.amountUsd },
              demoTotalWon: { increment: payout.profitAmount },
            } as any,
          });
        } else {
          // Winner: return stake + profit to available, remove from held
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              available: { increment: payout.payoutAmount }, // Stake + profit added back
              held: { decrement: bet.amountUsd }, // Remove held stake
              totalWon: { increment: payout.profitAmount }, // Track profit only
            },
          });
        }

        totalPaidToWinners = totalPaidToWinners.add(payout.profitAmount);

        // Create WIN transaction
        await tx.transaction.create({
          data: {
            user: { connect: { id: bet.userId } },
            type: 'SPIN_WIN',
            amount: payout.profitAmount,
            status: 'COMPLETED',
            isDemo: (bet as any).isDemo || false,
            description: `Round ${round.roundNumber} win - ${bet.market} ${bet.selection} - Profit: $${payout.profitAmount.toFixed(2)}`,
            processedAt: new Date(),
          } as any,
        });

        // Emit real-time wallet update for winner
        const winnerWallet = await tx.wallet.findUnique({
          where: { userId: bet.userId },
        });
        if (winnerWallet) {
          this.gateway.server.to(`user:${bet.userId}`).emit('walletUpdated', {
            userId: bet.userId,
            available: winnerWallet.available.toNumber(),
            held: winnerWallet.held.toNumber(),
            demoAvailable: winnerWallet.demoAvailable.toNumber(),
            demoHeld: winnerWallet.demoHeld.toNumber(),
            total: winnerWallet.available.add(winnerWallet.held).toNumber(),
            reason: 'bet_won',
            profitAmount: payout.profitAmount.toNumber(),
            payoutAmount: payout.payoutAmount.toNumber(),
            isDemo: (bet as any).isDemo,
          });
        }
      } else {
        if ((bet as any).isDemo) {
          // Demo Loser: remove demoHeld funds, increase demoTotalLost
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              demoHeld: { decrement: bet.amountUsd },
              demoTotalLost: { increment: bet.amountUsd },
            } as any,
          });
        } else {
          // Loser: remove held funds, increase totalLost (funds go to house)
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              held: { decrement: bet.amountUsd }, // Remove held stake (funds lost)
              totalLost: { increment: bet.amountUsd }, // Track loss
            },
          });
        }

        totalCollectedFromLosers = totalCollectedFromLosers.add(bet.amountUsd);

        // Create LOSS transaction
        await tx.transaction.create({
          data: {
            user: { connect: { id: bet.userId } },
            type: 'SPIN_LOSS',
            amount: bet.amountUsd,
            status: 'COMPLETED',
            isDemo: (bet as any).isDemo || false,
            description: `Round ${round.roundNumber} loss - ${bet.market} ${bet.selection} - Lost: $${bet.amountUsd.toFixed(2)}`,
            processedAt: new Date(),
          } as any,
        });

        // Emit real-time wallet update for loser
        const loserWallet = await tx.wallet.findUnique({
          where: { userId: bet.userId },
        });
        if (loserWallet) {
          this.gateway.server.to(`user:${bet.userId}`).emit('walletUpdated', {
            userId: bet.userId,
            available: loserWallet.available.toNumber(),
            held: loserWallet.held.toNumber(),
            demoAvailable: loserWallet.demoAvailable.toNumber(),
            demoHeld: loserWallet.demoHeld.toNumber(),
            total: loserWallet.available.add(loserWallet.held).toNumber(),
            reason: 'bet_lost',
            lostAmount: bet.amountUsd.toNumber(),
            isDemo: (bet as any).isDemo,
          });
        }
      }
    }

    // 4. Update Platform Account with economics
    const netProfit = totalCollectedFromLosers.sub(totalPaidToWinners).sub(settlement.houseFee);
    const newBalance = platformAccount.balance.add(netProfit).add(settlement.houseFee);

    await (tx as any).platformAccount.update({
      where: { id: 'HOUSE' },
      data: {
        balance: newBalance,
        totalFees: { increment: settlement.houseFee },
        totalPaidOut: { increment: totalPaidToWinners },
        totalCollected: { increment: totalCollectedFromLosers },
        // If we paid more than we collected, track as subsidy
        totalSubsidy: totalPaidToWinners.gt(totalCollectedFromLosers)
          ? { increment: totalPaidToWinners.sub(totalCollectedFromLosers) }
          : undefined,
      },
    });

    // 5. Create ledger entries for audit trail
    if (totalCollectedFromLosers.gt(0)) {
      await (tx as any).platformLedger.create({
        data: {
          roundId: round.id,
          type: 'LOSER_COLLECTION',
          amount: totalCollectedFromLosers,
          description: `Round ${round.roundNumber} - Collected from losers`,
          balanceAfter: newBalance,
        },
      });
    }

    if (totalPaidToWinners.gt(0)) {
      await (tx as any).platformLedger.create({
        data: {
          roundId: round.id,
          type: 'WINNER_PAYOUT',
          amount: totalPaidToWinners.neg(), // Negative for outflow
          description: `Round ${round.roundNumber} - Paid to winners`,
          balanceAfter: newBalance,
        },
      });
    }

    if (settlement.houseFee.gt(0)) {
      await (tx as any).platformLedger.create({
        data: {
          roundId: round.id,
          type: 'FEE',
          amount: settlement.houseFee,
          description: `Round ${round.roundNumber} - House fee (2%)`,
          balanceAfter: newBalance,
        },
      });
    }

    this.logger.log(
      `🏦 House: Collected $${totalCollectedFromLosers.toFixed(2)}, ` +
      `Paid $${totalPaidToWinners.toFixed(2)}, ` +
      `Fee $${settlement.houseFee.toFixed(2)}, ` +
      `Net $${netProfit.add(settlement.houseFee).toFixed(2)}`
    );

    // 6. Track seed outcomes separately (v2.1)
    if (seedWins.gt(0) || seedLosses.gt(0)) {
      this.logger.log(
        `🌱 Seeds: Won $${seedWins.toFixed(2)}, Lost $${seedLosses.toFixed(2)}`
      );
      
      // Create seed ledger entries
      try {
        if (seedWins.gt(0)) {
          await (tx as any).seedLedger.create({
            data: {
              roundId: round.id,
              type: 'SEED_WON',
              amount: seedWins,
              description: `Round ${round.roundNumber} - Seed wins`,
            },
          });
        }
        if (seedLosses.gt(0)) {
          await (tx as any).seedLedger.create({
            data: {
              roundId: round.id,
              type: 'SEED_LOST',
              amount: seedLosses.neg(),
              description: `Round ${round.roundNumber} - Seed losses`,
            },
          });
        }
      } catch (e) {
        // Seed ledger tracking is secondary, don't fail settlement
        this.logger.warn(`Failed to create seed ledger: ${e.message}`);
      }
    }
  }

  /**
   * Settle bets at checkpoint (for sub-round durations)
   */
  async settleCheckpoint(roundId: string, checkpointMinutes: number) {
    this.logger.log(`🎯 Settling checkpoint ${checkpointMinutes} min for round ${roundId}`);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Get round and checkpoint data
        const round = await tx.round.findUnique({
          where: { id: roundId },
        });

        if (!round) {
          throw new Error('Round not found');
        }

        // Get the checkpoint data
        let checkpoint: any = null;
        if (checkpointMinutes === 15 && round.checkpoint15min) {
          checkpoint = round.checkpoint15min;
        } else if (checkpointMinutes === 10 && round.checkpoint10min) {
          checkpoint = round.checkpoint10min;
        } else if (checkpointMinutes === 5 && round.checkpoint5min) {
          checkpoint = round.checkpoint5min;
        }

        if (!checkpoint) {
          this.logger.warn(`No checkpoint data found for ${checkpointMinutes} min`);
          return;
        }

        // Determine which users to settle based on their userRoundDuration
        let usersToSettle: number[] = [];
        if (checkpointMinutes === 15) {
          usersToSettle = [5]; // Only 5-minute users (Quarter 1 ends)
        } else if (checkpointMinutes === 10) {
          usersToSettle = [5, 10]; // 5-minute (Quarter 2) and 10-minute (Semi 1) users
        } else if (checkpointMinutes === 5) {
          usersToSettle = [5]; // Only 5-minute users (Quarter 3 ends)
        }

        // Get unsettled bets for these durations
        const betsToSettle = await tx.bet.findMany({
          where: {
            roundId,
            status: 'ACCEPTED',
            userRoundDuration: { in: usersToSettle },
          },
          include: {
            user: {
              include: {
                wallet: true,
              },
            },
          },
        });

        // Debug logging
        const allBets = await tx.bet.findMany({
          where: { roundId },
          select: { id: true, status: true, userRoundDuration: true, market: true, selection: true, amountUsd: true }
        });
        this.logger.log(`📊 Round ${roundId} checkpoint ${checkpointMinutes} min:`);
        this.logger.log(`   Total bets in round: ${allBets.length}`);
        this.logger.log(`   Bets with ACCEPTED status: ${allBets.filter(b => b.status === 'ACCEPTED').length}`);
        this.logger.log(`   Bets matching durations [${usersToSettle.join(', ')}]: ${allBets.filter(b => usersToSettle.includes(b.userRoundDuration)).length}`);
        this.logger.log(`   Bets to settle: ${betsToSettle.length}`);

        if (betsToSettle.length === 0) {
          this.logger.warn(`⚠️ No bets to settle at ${checkpointMinutes} min checkpoint (expected durations: [${usersToSettle.join(', ')}])`);
          return;
        }

        this.logger.log(`✅ Settling ${betsToSettle.length} bets at ${checkpointMinutes} min checkpoint`);

        // Process each bet
        for (const bet of betsToSettle) {
          let isWinner = false;

          // Determine if bet won based on checkpoint results
          if (checkpoint.indecisionTriggered && bet.market === 'GLOBAL' && bet.selection === 'INDECISION') {
            isWinner = true;
          } else if (!checkpoint.indecisionTriggered) {
            // Check market-specific winners
            if (bet.market === 'OUTER' && !checkpoint.outerTied && bet.selection === checkpoint.outerWinner) {
              isWinner = true;
            } else if (bet.market === 'MIDDLE' && !checkpoint.middleTied && bet.selection === checkpoint.middleWinner) {
              isWinner = true;
            } else if (bet.market === 'INNER' && !checkpoint.innerTied && bet.selection === checkpoint.innerWinner) {
              isWinner = true;
            }
          }

          // Calculate payout
          let payoutAmount = new Decimal(0);
          let profitAmount = new Decimal(0);

          if (isWinner) {
            // Calculate payout (2x bet amount - 2% house fee)
            const grossPayout = bet.amountUsd.mul(2);
            const fee = grossPayout.mul(this.FEE_BPS).div(10000);
            payoutAmount = grossPayout.sub(fee);
            profitAmount = payoutAmount.sub(bet.amountUsd);
          }

          // Update bet
          await tx.bet.update({
            where: { id: bet.id },
            data: {
              status: isWinner ? 'WON' : 'LOST',
              isWinner,
              payoutAmount: isWinner ? payoutAmount : null,
              profitAmount: isWinner ? profitAmount : null,
              settledAt: new Date(),
            },
          });

          this.logger.log(
            `  ${isWinner ? '✅' : '❌'} Bet ${bet.id.substring(0, 8)}: ${bet.market} ${bet.selection} $${bet.amountUsd} -> ${isWinner ? 'WON' : 'LOST'} (payout: $${isWinner ? payoutAmount : 0})`
          );

          // Update wallet
          if (bet.isDemo) {
            if (isWinner) {
              await tx.wallet.update({
                where: { userId: bet.userId },
                data: {
                  demoHeld: { decrement: bet.amountUsd },
                  demoAvailable: { increment: payoutAmount },
                  demoTotalWon: { increment: profitAmount },
                } as any,
              });
            } else {
              await tx.wallet.update({
                where: { userId: bet.userId },
                data: {
                  demoHeld: { decrement: bet.amountUsd },
                  demoTotalLost: { increment: bet.amountUsd },
                } as any,
              });
            }
          } else {
            if (isWinner) {
              await tx.wallet.update({
                where: { userId: bet.userId },
                data: {
                  held: { decrement: bet.amountUsd },
                  available: { increment: payoutAmount },
                  totalWon: { increment: profitAmount },
                },
              });
            } else {
              await tx.wallet.update({
                where: { userId: bet.userId },
                data: {
                  held: { decrement: bet.amountUsd },
                  totalLost: { increment: bet.amountUsd },
                },
              });
            }
          }
        }

        this.logger.log(
          `✅ Checkpoint ${checkpointMinutes} min settled: ${betsToSettle.length} bets processed`
        );
      });
    } catch (error) {
      this.logger.error(`Error settling checkpoint ${checkpointMinutes} min:`, error);
      throw error;
    }
  }
}
