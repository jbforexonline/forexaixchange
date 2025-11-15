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
    const lockAcquired = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');

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

          this.logger.log(`⚙️  Settling Round ${round.roundNumber}...`);

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
      const currentValue = await this.redis.get(lockKey);
      if (currentValue === lockValue) {
        await this.redis.del(lockKey);
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
   * Updated: Tie if both sides are equal (including 0-0 case)
   * If any layer ties (including 0-0), Indecision wins globally
   */
  private isTied(a: Decimal, b: Decimal): boolean {
    // Tie if both sides are equal (to the cent), including 0-0
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
   */
  private async applyPayouts(
    tx: Prisma.TransactionClient,
    round: any,
    settlement: SettlementResult,
  ) {
    for (const bet of round.bets) {
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
        // Winner: return stake + profit to available, remove from held
        // Balance = original balance + profit (stake already deducted at bet time)
        await tx.wallet.update({
          where: { userId: bet.userId },
          data: {
            available: { increment: payout.payoutAmount }, // Stake + profit added back
            held: { decrement: bet.amountUsd }, // Remove held stake
            totalWon: { increment: payout.profitAmount }, // Track profit only
          },
        });

        // Create WIN transaction
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: 'SPIN_WIN',
            amount: payout.profitAmount,
            status: 'COMPLETED',
            description: `Round ${round.roundNumber} win - ${bet.market} ${bet.selection} - Profit: $${payout.profitAmount.toFixed(2)}`,
            processedAt: new Date(),
          },
        });

        // Emit real-time wallet update for winner
        const winnerWallet = await tx.wallet.findUnique({
          where: { userId: bet.userId },
        });
        this.gateway.server.to(`user:${bet.userId}`).emit('walletUpdated', {
          userId: bet.userId,
          available: winnerWallet.available.toNumber(),
          held: winnerWallet.held.toNumber(),
          total: winnerWallet.available.add(winnerWallet.held).toNumber(),
          reason: 'bet_won',
          profitAmount: payout.profitAmount.toNumber(),
          payoutAmount: payout.payoutAmount.toNumber(),
        });
      } else {
        // Loser: remove held funds, increase totalLost (no return - funds lost)
        await tx.wallet.update({
          where: { userId: bet.userId },
          data: {
            held: { decrement: bet.amountUsd }, // Remove held stake (funds lost)
            totalLost: { increment: bet.amountUsd }, // Track loss
          },
        });

        // Create LOSS transaction
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: 'SPIN_LOSS',
            amount: bet.amountUsd,
            status: 'COMPLETED',
            description: `Round ${round.roundNumber} loss - ${bet.market} ${bet.selection} - Lost: $${bet.amountUsd.toFixed(2)}`,
            processedAt: new Date(),
          },
        });

        // Emit real-time wallet update for loser
        const loserWallet = await tx.wallet.findUnique({
          where: { userId: bet.userId },
        });
        this.gateway.server.to(`user:${bet.userId}`).emit('walletUpdated', {
          userId: bet.userId,
          available: loserWallet.available.toNumber(),
          held: loserWallet.held.toNumber(),
          total: loserWallet.available.add(loserWallet.held).toNumber(),
          reason: 'bet_lost',
          lostAmount: bet.amountUsd.toNumber(),
        });
      }
    }
  }
}
