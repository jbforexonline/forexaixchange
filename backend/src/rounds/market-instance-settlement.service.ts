// =============================================================================
// MARKET INSTANCE SETTLEMENT SERVICE - Settlement for Multi-Duration Markets
// =============================================================================
// Path: backend/src/rounds/market-instance-settlement.service.ts
// Implements: Settlement per market instance using the SAME algorithm as rounds
// CRITICAL: This service REUSES the existing minority-wins + indecision logic
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MarketInstanceStatus, BetMarket, Prisma, LedgerEntryType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { LedgerService, SYSTEM_ACCOUNTS } from '../ledger/ledger.service';
import { MarketInstanceService } from './market-instance.service';

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
export class MarketInstanceSettlementService {
  private readonly logger = new Logger(MarketInstanceSettlementService.name);
  private readonly FEE_BPS = 200; // 2% house fee - UNCHANGED from original

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private gateway: RealtimeGateway,
    private ledgerService: LedgerService,
    private marketInstanceService: MarketInstanceService,
  ) {}

  /**
   * Settle a single market instance
   * CRITICAL: Uses the SAME algorithm as RoundsSettlementService.settleRound
   */
  async settleMarketInstance(instanceId: string, settledByAdminId?: string) {
    // Acquire Redis lock to prevent concurrent settlement
    const lockKey = `lock:settle:instance:${instanceId}`;
    const lockValue = Date.now().toString();
    let lockAcquired = false;

    try {
      if (this.redis.status === 'ready') {
        const result = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');
        lockAcquired = result === 'OK';
      } else {
        this.logger.warn(`Redis not ready, skipping lock for instance ${instanceId}`);
        lockAcquired = true;
      }
    } catch (e) {
      this.logger.warn(`Failed to acquire lock: ${e.message}. Proceeding anyway.`);
      lockAcquired = true;
    }

    if (!lockAcquired) {
      this.logger.warn(`Settlement already in progress for market instance ${instanceId}`);
      return null;
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 0. IDEMPOTENCY CHECK: If settlement already exists, return early
          const existingSettlement = await tx.marketInstanceSettlement.findUnique({
            where: { marketInstanceId: instanceId },
          });

          if (existingSettlement) {
            this.logger.warn(`⚠️ Market instance ${instanceId} already settled. Skipping.`);
            return tx.marketInstance.findUnique({ where: { id: instanceId } });
          }

          // 1. Get the market instance with its bets
          const instance = await tx.marketInstance.findUnique({
            where: { id: instanceId },
            include: {
              masterRound: true,
              bets: {
                where: { status: 'ACCEPTED' },
              },
              snapshots: {
                where: { snapshotType: 'FREEZE' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });

          if (!instance) {
            throw new Error('Market instance not found');
          }

          if (instance.status !== MarketInstanceStatus.FROZEN) {
            throw new Error(`Market instance must be FROZEN, currently: ${instance.status}`);
          }

          this.logger.log(
            `⚙️ Settling market instance: ${instance.durationMinutes} ` +
            `${instance.windowStartMinutes}→${instance.windowEndMinutes}...`
          );

          // 2. Transition to SETTLING
          await tx.marketInstance.update({
            where: { id: instanceId },
            data: { status: MarketInstanceStatus.SETTLING },
          });

          // 3. Get pool totals from freeze snapshot (or current if no snapshot)
          const poolTotals = instance.snapshots[0] || {
            outerBuy: instance.outerBuy,
            outerSell: instance.outerSell,
            middleBlue: instance.middleBlue,
            middleRed: instance.middleRed,
            innerHighVol: instance.innerHighVol,
            innerLowVol: instance.innerLowVol,
            globalIndecision: instance.globalIndecision,
          };

          // 4. Run settlement algorithm - EXACT SAME as RoundsSettlementService
          const settlement = await this.computeSettlement(poolTotals, instance.bets);

          // 5. Apply payouts to all bets
          const payoutResult = await this.applyPayouts(
            tx,
            instance,
            settlement,
            settledByAdminId,
          );

          // 6. Update market instance with results
          const settledInstance = await tx.marketInstance.update({
            where: { id: instanceId },
            data: {
              status: MarketInstanceStatus.SETTLED,
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

          // 7. Create MarketInstanceSettlement record for idempotency
          await tx.marketInstanceSettlement.create({
            data: {
              marketInstanceId: instanceId,
              settlementVersion: 1,
              totalPool: payoutResult.totalPool,
              totalPayouts: payoutResult.totalPayouts,
              houseFee: settlement.houseFee,
              houseProfit: payoutResult.houseProfit,
              totalBets: instance.bets.length,
              winningBets: payoutResult.winningBetsCount,
              losingBets: payoutResult.losingBetsCount,
              settledBy: settledByAdminId,
              clearingLedgerEntryId: payoutResult.clearingLedgerEntryId,
              profitLedgerEntryId: payoutResult.profitLedgerEntryId,
            },
          });

          this.logger.log(
            `✅ Market instance settled: ${instance.durationMinutes} ` +
            `${instance.windowStartMinutes}→${instance.windowEndMinutes} - ` +
            `Indecision: ${settlement.indecisionTriggered}, ` +
            `House Fee: $${settlement.houseFee.toFixed(2)}`
          );

          // 8. Broadcast settlement via WebSocket
          this.gateway.server.emit('marketInstanceSettled', {
            instanceId,
            masterRoundId: instance.masterRoundId,
            roundNumber: instance.masterRound.roundNumber,
            durationMinutes: instance.durationMinutes,
            windowStart: instance.windowStartMinutes,
            windowEnd: instance.windowEndMinutes,
            indecisionTriggered: settlement.indecisionTriggered,
            winners: settlement.layerResults,
          });

          return settledInstance;
        },
        {
          timeout: 60000,
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
   * Core settlement algorithm - IDENTICAL to RoundsSettlementService
   * DO NOT MODIFY without updating both services
   */
  private async computeSettlement(
    poolTotals: any,
    bets: any[],
  ): Promise<SettlementResult> {
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

    // Convert to Decimal if needed
    const outerBuy = new Decimal(poolTotals.outerBuy || 0);
    const outerSell = new Decimal(poolTotals.outerSell || 0);
    const middleBlue = new Decimal(poolTotals.middleBlue || 0);
    const middleRed = new Decimal(poolTotals.middleRed || 0);
    const innerHighVol = new Decimal(poolTotals.innerHighVol || 0);
    const innerLowVol = new Decimal(poolTotals.innerLowVol || 0);

    // Check for ties (both sides > 0 and equal to the cent)
    const outerTied = this.isTied(outerBuy, outerSell);
    const middleTied = this.isTied(middleBlue, middleRed);
    const innerTied = this.isTied(innerHighVol, innerLowVol);

    result.layerResults.outer.tied = outerTied;
    result.layerResults.middle.tied = middleTied;
    result.layerResults.inner.tied = innerTied;

    // INDECISION OVERRIDE: If ANY layer is tied
    if (outerTied || middleTied || innerTied) {
      result.indecisionTriggered = true;
      this.logger.log(`🎯 INDECISION TRIGGERED!`);

      // All layer bets lose, only INDECISION bets win
      const losersPool = outerBuy
        .add(outerSell)
        .add(middleBlue)
        .add(middleRed)
        .add(innerHighVol)
        .add(innerLowVol);

      // Calculate house fee from losers pool (2%)
      const houseFee = losersPool.mul(this.FEE_BPS).div(10000);
      result.houseFee = houseFee;

      // Calculate payouts with fixed 2x multiplier
      for (const bet of bets) {
        if (bet.market === BetMarket.GLOBAL && bet.selection === 'INDECISION') {
          // INDECISION bets win: Fixed 2x payout
          const payoutAmount = bet.amountUsd.mul(2);
          const profitAmount = bet.amountUsd;
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
        outerBuy,
        outerSell,
        'BUY',
        'SELL',
      );
      result.layerResults.middle.winner = this.determineWinner(
        middleBlue,
        middleRed,
        'BLUE',
        'RED',
      );
      result.layerResults.inner.winner = this.determineWinner(
        innerHighVol,
        innerLowVol,
        'HIGH_VOL',
        'LOW_VOL',
      );

      // Settle each layer independently
      const outerPayouts = this.settleLayer(
        { a: outerBuy, b: outerSell, labelA: 'BUY', labelB: 'SELL' },
        result.layerResults.outer.winner!,
        bets.filter((b) => b.market === BetMarket.OUTER),
      );

      const middlePayouts = this.settleLayer(
        { a: middleBlue, b: middleRed, labelA: 'BLUE', labelB: 'RED' },
        result.layerResults.middle.winner!,
        bets.filter((b) => b.market === BetMarket.MIDDLE),
      );

      const innerPayouts = this.settleLayer(
        { a: innerHighVol, b: innerLowVol, labelA: 'HIGH_VOL', labelB: 'LOW_VOL' },
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
   * Check if two amounts constitute a tie - IDENTICAL to RoundsSettlementService
   * IMPORTANT: 0-0 is NOT a tie (seeding prevents this, but we handle it gracefully)
   * A tie only occurs when both sides have bets AND they're equal
   */
  private isTied(a: Decimal, b: Decimal): boolean {
    // Both zero is NOT a tie - minority rule handles this
    if (a.eq(0) && b.eq(0)) return false;
    // Equal non-zero amounts IS a tie
    return a.eq(b);
  }

  /**
   * Determine winner by minority rule - IDENTICAL to RoundsSettlementService
   */
  private determineWinner(
    a: Decimal,
    b: Decimal,
    labelA: string,
    labelB: string,
  ): string {
    if (a.eq(0) && b.eq(0)) return labelA;
    return a.lt(b) ? labelA : labelB;
  }

  /**
   * Settle a single layer using minority rule - IDENTICAL to RoundsSettlementService
   */
  private settleLayer(
    totals: LayerTotals,
    winner: string,
    bets: any[],
  ): { payouts: Map<string, any>; houseFee: Decimal } {
    const payouts = new Map();

    const winnersPool = winner === totals.labelA ? totals.a : totals.b;
    const losersPool = winner === totals.labelA ? totals.b : totals.a;

    // Calculate house fee from losers pool (2%)
    const houseFee = losersPool.mul(this.FEE_BPS).div(10000);

    // Fixed 2x payout
    for (const bet of bets) {
      if (bet.selection === winner) {
        const payoutAmount = bet.amountUsd.mul(2);
        const profitAmount = bet.amountUsd;
        payouts.set(bet.id, {
          isWinner: true,
          payoutAmount: payoutAmount,
          profitAmount: profitAmount,
        });
      } else {
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
   * CRITICAL: Follows same logic as RoundsSettlementService
   */
  private async applyPayouts(
    tx: Prisma.TransactionClient,
    instance: any,
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
    // 1. Ensure PlatformAccount exists
    let platformAccount = await (tx as any).platformAccount.findUnique({
      where: { id: 'HOUSE' },
    });

    if (!platformAccount) {
      platformAccount = await (tx as any).platformAccount.create({
        data: {
          id: 'HOUSE',
          balance: new Decimal(0),
          reserveBalance: new Decimal(10000),
        },
      });
      this.logger.log('🏦 House account created with $10,000 reserve');
    }

    // 2. Calculate totals
    let totalCollectedFromLosers = new Decimal(0);
    let totalPaidToWinners = new Decimal(0);

    // 3. Process all bets
    for (const bet of instance.bets) {
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
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              demoAvailable: { increment: payout.payoutAmount },
              demoHeld: { decrement: bet.amountUsd },
              demoTotalWon: { increment: payout.profitAmount },
            } as any,
          });
        } else {
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              available: { increment: payout.payoutAmount },
              held: { decrement: bet.amountUsd },
              totalWon: { increment: payout.profitAmount },
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
            description: `Market ${instance.durationMinutes} ${instance.windowStartMinutes}→${instance.windowEndMinutes} win - ${bet.market} ${bet.selection}`,
            processedAt: new Date(),
          } as any,
        });

        // Emit wallet update for winner
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
          await tx.wallet.update({
            where: { userId: bet.userId },
            data: {
              demoHeld: { decrement: bet.amountUsd },
              demoTotalLost: { increment: bet.amountUsd },
            } as any,
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

        totalCollectedFromLosers = totalCollectedFromLosers.add(bet.amountUsd);

        // Create LOSS transaction
        await tx.transaction.create({
          data: {
            user: { connect: { id: bet.userId } },
            type: 'SPIN_LOSS',
            amount: bet.amountUsd,
            status: 'COMPLETED',
            isDemo: (bet as any).isDemo || false,
            description: `Market ${instance.durationMinutes} ${instance.windowStartMinutes}→${instance.windowEndMinutes} loss - ${bet.market} ${bet.selection}`,
            processedAt: new Date(),
          } as any,
        });

        // Emit wallet update for loser
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

    // 4. Update Platform Account
    const netProfit = totalCollectedFromLosers.sub(totalPaidToWinners).sub(settlement.houseFee);
    const newBalance = platformAccount.balance.add(netProfit).add(settlement.houseFee);

    await (tx as any).platformAccount.update({
      where: { id: 'HOUSE' },
      data: {
        balance: newBalance,
        totalFees: { increment: settlement.houseFee },
        totalPaidOut: { increment: totalPaidToWinners },
        totalCollected: { increment: totalCollectedFromLosers },
        totalSubsidy: totalPaidToWinners.gt(totalCollectedFromLosers)
          ? { increment: totalPaidToWinners.sub(totalCollectedFromLosers) }
          : undefined,
      },
    });

    // 5. Create ledger entries
    if (totalCollectedFromLosers.gt(0)) {
      await (tx as any).platformLedger.create({
        data: {
          roundId: instance.masterRoundId,
          type: 'LOSER_COLLECTION',
          amount: totalCollectedFromLosers,
          description: `Market ${instance.durationMinutes} ${instance.windowStartMinutes}→${instance.windowEndMinutes} - Collected`,
          balanceAfter: newBalance,
        },
      });
    }

    if (totalPaidToWinners.gt(0)) {
      await (tx as any).platformLedger.create({
        data: {
          roundId: instance.masterRoundId,
          type: 'WINNER_PAYOUT',
          amount: totalPaidToWinners.neg(),
          description: `Market ${instance.durationMinutes} ${instance.windowStartMinutes}→${instance.windowEndMinutes} - Paid`,
          balanceAfter: newBalance,
        },
      });
    }

    if (settlement.houseFee.gt(0)) {
      await (tx as any).platformLedger.create({
        data: {
          roundId: instance.masterRoundId,
          type: 'FEE',
          amount: settlement.houseFee,
          description: `Market ${instance.durationMinutes} ${instance.windowStartMinutes}→${instance.windowEndMinutes} - Fee (2%)`,
          balanceAfter: newBalance,
        },
      });
    }

    // 6. Ledger entries for house profit
    let profitLedgerEntryId: string | undefined;
    let clearingLedgerEntryId: string | undefined;
    const houseProfit = totalCollectedFromLosers.sub(totalPaidToWinners);

    try {
      if (houseProfit.gt(0)) {
        const profitResult = await this.ledgerService.recordHouseProfit(
          houseProfit,
          instance.masterRoundId,
          instance.masterRound.roundNumber,
          `instance-profit-${instance.id}`,
          tx,
        );
        profitLedgerEntryId = profitResult.ledgerEntryId;
      }

      if (settlement.houseFee.gt(0)) {
        const feeResult = await this.ledgerService.recordFee(
          settlement.houseFee,
          `Market ${instance.durationMinutes} house fee (2%)`,
          'MARKET_INSTANCE',
          instance.id,
          `instance-fee-${instance.id}`,
          tx,
        );
        clearingLedgerEntryId = feeResult.ledgerEntryId;
      }
    } catch (ledgerError) {
      this.logger.warn(`Ledger entry creation failed (non-critical): ${ledgerError.message}`);
    }

    // Calculate total pool
    const totalPool = new Decimal(instance.outerBuy || 0)
      .add(instance.outerSell || 0)
      .add(instance.middleBlue || 0)
      .add(instance.middleRed || 0)
      .add(instance.innerHighVol || 0)
      .add(instance.innerLowVol || 0)
      .add(instance.globalIndecision || 0);

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

  /**
   * Settle all market instances that are ready for settlement
   */
  async settleReadyInstances(): Promise<void> {
    const instancesToSettle = await this.marketInstanceService.getMarketInstancesToSettle();

    for (const instance of instancesToSettle) {
      try {
        await this.settleMarketInstance(instance.id);
      } catch (error) {
        this.logger.error(
          `Failed to settle market instance ${instance.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
