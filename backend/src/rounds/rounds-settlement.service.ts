// =============================================================================
// ROUNDS SETTLEMENT SERVICE - Core Settlement Algorithm v2
// =============================================================================
// Path: backend/src/rounds/rounds-settlement.service.ts
// Implements: Minority rule + Indecision override from Spin V1 spec
// v2: Uses ledger-based accounting with idempotency
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RoundState, BetMarket, Prisma, LedgerEntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { LedgerService, SYSTEM_ACCOUNTS } from '../ledger/ledger.service';

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
    private ledgerService: LedgerService, // v2: Ledger-based accounting
  ) {}

  /**
   * Main settlement entry point
   * v2: Includes idempotency check via RoundSettlement model
   */
  async settleRound(roundId: string, settledByAdminId?: string) {
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
          // 0. IDEMPOTENCY CHECK: If settlement already exists, return early
          const existingSettlement = await tx.roundSettlement.findUnique({
            where: { roundId },
          });

          if (existingSettlement) {
            this.logger.warn(`⚠️ Round ${roundId} already settled (version ${existingSettlement.settlementVersion}). Skipping re-settlement.`);
            return tx.round.findUnique({ where: { id: roundId } });
          }

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
          const payoutResult = await this.applyPayouts(tx, round, settlement, settledByAdminId);

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

          // 5.1. Create RoundSettlement record for idempotency
          await tx.roundSettlement.create({
            data: {
              roundId,
              roundNumber: round.roundNumber,
              settlementVersion: 1,
              totalPool: payoutResult.totalPool,
              totalPayouts: payoutResult.totalPayouts,
              houseFee: settlement.houseFee,
              houseProfit: payoutResult.houseProfit,
              totalBets: round.bets.length,
              winningBets: payoutResult.winningBetsCount,
              losingBets: payoutResult.losingBetsCount,
              settledBy: settledByAdminId,
              clearingLedgerEntryId: payoutResult.clearingLedgerEntryId,
              profitLedgerEntryId: payoutResult.profitLedgerEntryId,
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
   * v2: Returns settlement metrics for RoundSettlement record
   */
  private async applyPayouts(
    tx: Prisma.TransactionClient,
    round: any,
    settlement: SettlementResult,
    settledByAdminId?: string,
  ): Promise<{
    totalPool: Decimal;
    totalPayouts: Decimal;
    houseProfit: Decimal;
    winningBetsCount: number;
    losingBetsCount: number;
    clearingLedgerEntryId?: string;
    profitLedgerEntryId?: string;
  }> {
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

    // 3. Process all bets
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

    // 6. Create ledger entries for house profit (v2)
    let profitLedgerEntryId: string | undefined;
    let clearingLedgerEntryId: string | undefined;
    
    const houseProfit = totalCollectedFromLosers.sub(totalPaidToWinners);
    
    try {
      // Record house profit via ledger if positive
      if (houseProfit.gt(0)) {
        const profitResult = await this.ledgerService.recordHouseProfit(
          houseProfit,
          round.id,
          round.roundNumber,
          `round-profit-${round.id}`,
          tx,
        );
        profitLedgerEntryId = profitResult.ledgerEntryId;
      }
      
      // Record fees via ledger
      if (settlement.houseFee.gt(0)) {
        const feeResult = await this.ledgerService.recordFee(
          settlement.houseFee,
          `Round ${round.roundNumber} house fee (2%)`,
          'ROUND',
          round.id,
          `round-fee-${round.id}`,
          tx,
        );
        clearingLedgerEntryId = feeResult.ledgerEntryId;
      }
    } catch (ledgerError) {
      this.logger.warn(`Ledger entry creation failed (non-critical): ${ledgerError.message}`);
    }

    // Calculate total pool
    const totalPool = round.outerBuy
      .add(round.outerSell)
      .add(round.middleBlue)
      .add(round.middleRed)
      .add(round.innerHighVol)
      .add(round.innerLowVol)
      .add(round.globalIndecision);

    const winningBetsCount = Array.from(settlement.payouts.values()).filter(p => p.isWinner).length;
    const losingBetsCount = Array.from(settlement.payouts.values()).filter(p => !p.isWinner).length;

    this.logger.log(
      `🏦 House: Collected $${totalCollectedFromLosers.toFixed(2)}, ` +
      `Paid $${totalPaidToWinners.toFixed(2)}, ` +
      `Fee $${settlement.houseFee.toFixed(2)}, ` +
      `Net $${houseProfit.toFixed(2)}`
    );

    return {
      totalPool,
      totalPayouts: totalPaidToWinners,
      houseProfit,
      winningBetsCount,
      losingBetsCount,
      clearingLedgerEntryId,
      profitLedgerEntryId,
    };
  }
}
