// =============================================================================
// MARKET INSTANCE SERVICE - Multi-Duration Market Management
// =============================================================================
// Path: backend/src/rounds/market-instance.service.ts
// Implements: Separate pools per duration (5/10/20 min) with checkpoint windows
// =============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DurationMinutes, MarketInstanceStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Checkpoint configuration for each duration
// Maps duration to its checkpoint windows (in minutes remaining on master clock)
export const DURATION_CHECKPOINTS: Record<DurationMinutes, { start: number; end: number }[]> = {
  FIVE: [
    { start: 20, end: 15 }, // First quarter
    { start: 15, end: 10 }, // Second quarter
    { start: 10, end: 5 },  // Third quarter
    { start: 5, end: 0 },   // Fourth quarter
  ],
  TEN: [
    { start: 20, end: 10 }, // First half
    { start: 10, end: 0 },  // Second half
  ],
  TWENTY: [
    { start: 20, end: 0 },  // Full cycle
  ],
};

// Freeze schedule: minutes remaining on master clock when to freeze each instance
// Freeze happens 1 minute before settlement checkpoint
export const FREEZE_SCHEDULE: { minutesRemaining: number; toFreeze: { duration: DurationMinutes; windowEnd: number }[] }[] = [
  { minutesRemaining: 16, toFreeze: [{ duration: DurationMinutes.FIVE, windowEnd: 15 }] },
  { minutesRemaining: 11, toFreeze: [
    { duration: DurationMinutes.FIVE, windowEnd: 10 },
    { duration: DurationMinutes.TEN, windowEnd: 10 },
  ]},
  { minutesRemaining: 6, toFreeze: [{ duration: DurationMinutes.FIVE, windowEnd: 5 }] },
  { minutesRemaining: 1, toFreeze: [
    { duration: DurationMinutes.FIVE, windowEnd: 0 },
    { duration: DurationMinutes.TEN, windowEnd: 0 },
    { duration: DurationMinutes.TWENTY, windowEnd: 0 },
  ]},
];

// Settlement schedule: minutes remaining on master clock when to settle each instance
export const SETTLEMENT_SCHEDULE: { minutesRemaining: number; toSettle: { duration: DurationMinutes; windowEnd: number }[] }[] = [
  { minutesRemaining: 15, toSettle: [{ duration: DurationMinutes.FIVE, windowEnd: 15 }] },
  { minutesRemaining: 10, toSettle: [
    { duration: DurationMinutes.FIVE, windowEnd: 10 },
    { duration: DurationMinutes.TEN, windowEnd: 10 },
  ]},
  { minutesRemaining: 5, toSettle: [{ duration: DurationMinutes.FIVE, windowEnd: 5 }] },
  { minutesRemaining: 0, toSettle: [
    { duration: DurationMinutes.FIVE, windowEnd: 0 },
    { duration: DurationMinutes.TEN, windowEnd: 0 },
    { duration: DurationMinutes.TWENTY, windowEnd: 0 },
  ]},
];

// Helper to convert DurationMinutes enum to actual minutes
export function durationToMinutes(duration: DurationMinutes): number {
  switch (duration) {
    case DurationMinutes.FIVE: return 5;
    case DurationMinutes.TEN: return 10;
    case DurationMinutes.TWENTY: return 20;
  }
}

// Helper to convert minutes to DurationMinutes enum
export function minutesToDuration(minutes: number): DurationMinutes {
  switch (minutes) {
    case 5: return DurationMinutes.FIVE;
    case 10: return DurationMinutes.TEN;
    case 20: return DurationMinutes.TWENTY;
    default: return DurationMinutes.TWENTY; // Default to 20min
  }
}

@Injectable()
export class MarketInstanceService {
  private readonly logger = new Logger(MarketInstanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create all market instances for a new master round
   * Called when a new 20-minute cycle begins
   */
  async createMarketInstances(masterRoundId: string, masterOpenedAt: Date): Promise<void> {
    const masterSettleAt = new Date(masterOpenedAt.getTime() + 20 * 60 * 1000);
    
    // Create instances for each duration
    for (const [duration, checkpoints] of Object.entries(DURATION_CHECKPOINTS)) {
      const durationEnum = duration as DurationMinutes;
      
      for (const checkpoint of checkpoints) {
        // Calculate freeze and settle times based on checkpoint
        const settleAt = new Date(masterSettleAt.getTime() - checkpoint.end * 60 * 1000);
        const freezeAt = new Date(settleAt.getTime() - 60 * 1000); // Freeze 60s before settle
        
        try {
          await this.prisma.marketInstance.create({
            data: {
              masterRoundId,
              durationMinutes: durationEnum,
              windowStartMinutes: checkpoint.start,
              windowEndMinutes: checkpoint.end,
              status: MarketInstanceStatus.ACTIVE,
              openedAt: masterOpenedAt,
              freezeAt,
              settleAt,
            },
          });
          
          this.logger.debug(
            `Created market instance: ${duration} ${checkpoint.start}→${checkpoint.end} ` +
            `(freeze: ${freezeAt.toISOString()}, settle: ${settleAt.toISOString()})`
          );
        } catch (error) {
          // Handle unique constraint violation (instance already exists)
          if (error.code === 'P2002') {
            this.logger.debug(`Market instance already exists: ${duration} ${checkpoint.start}→${checkpoint.end}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    this.logger.log(`Created market instances for master round ${masterRoundId}`);
  }

  /**
   * Get the currently active market instance for a given duration
   * Based on master clock time, returns the correct checkpoint window
   */
  async getActiveMarketInstance(
    masterRoundId: string,
    duration: DurationMinutes,
    masterRemainingSeconds: number,
  ): Promise<any | null> {
    const masterRemainingMinutes = Math.ceil(masterRemainingSeconds / 60);
    const checkpoints = DURATION_CHECKPOINTS[duration];
    
    // Find the checkpoint window that contains the current time
    let targetCheckpoint: { start: number; end: number } | null = null;
    
    for (const checkpoint of checkpoints) {
      // User is in this window if: end < remaining <= start
      if (masterRemainingMinutes <= checkpoint.start && masterRemainingMinutes > checkpoint.end) {
        targetCheckpoint = checkpoint;
        break;
      }
      // Edge case: exactly at end, belongs to next window or is last window
      if (masterRemainingMinutes === checkpoint.end && checkpoint.end === 0) {
        targetCheckpoint = checkpoint;
        break;
      }
    }
    
    if (!targetCheckpoint) {
      // Default to first checkpoint if none found
      targetCheckpoint = checkpoints[0];
    }
    
    // Get the market instance for this checkpoint
    return this.prisma.marketInstance.findFirst({
      where: {
        masterRoundId,
        durationMinutes: duration,
        windowStartMinutes: targetCheckpoint.start,
        windowEndMinutes: targetCheckpoint.end,
        status: MarketInstanceStatus.ACTIVE,
      },
    });
  }

  /**
   * Get all active market instances for a master round
   */
  async getActiveMarketInstances(masterRoundId: string): Promise<any[]> {
    return this.prisma.marketInstance.findMany({
      where: {
        masterRoundId,
        status: {
          in: [MarketInstanceStatus.ACTIVE, MarketInstanceStatus.FROZEN],
        },
      },
    });
  }

  /**
   * Get market instances that need to be frozen
   */
  async getMarketInstancesToFreeze(): Promise<any[]> {
    const now = new Date();
    
    return this.prisma.marketInstance.findMany({
      where: {
        status: MarketInstanceStatus.ACTIVE,
        freezeAt: {
          lte: now,
        },
      },
    });
  }

  /**
   * Freeze a market instance and capture pool snapshot
   */
  async freezeMarketInstance(instanceId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.marketInstance.findUnique({
        where: { id: instanceId },
      });
      
      if (!instance) {
        throw new NotFoundException('Market instance not found');
      }
      
      if (instance.status !== MarketInstanceStatus.ACTIVE) {
        throw new Error(`Market instance ${instanceId} is not ACTIVE`);
      }
      
      // Compute final totals from bets
      const totals = await this.computeInstanceTotals(instanceId, tx);
      
      // Create freeze snapshot
      const snapshot = await tx.marketSnapshot.create({
        data: {
          marketInstanceId: instanceId,
          snapshotType: 'FREEZE',
          outerBuy: totals.outerBuy,
          outerSell: totals.outerSell,
          middleBlue: totals.middleBlue,
          middleRed: totals.middleRed,
          innerHighVol: totals.innerHighVol,
          innerLowVol: totals.innerLowVol,
          globalIndecision: totals.globalIndecision,
          totalVolume: totals.totalVolume,
          totalBetsCount: totals.totalBetsCount,
          uniqueUsersCount: totals.uniqueUsersCount,
          snapshotData: totals as any,
        },
      });
      
      // Update instance with totals and freeze status
      // Note: Only spread pool fields, not counts (those are in snapshot only)
      const frozen = await tx.marketInstance.update({
        where: { id: instanceId },
        data: {
          status: MarketInstanceStatus.FROZEN,
          frozenAt: new Date(),
          outerBuy: totals.outerBuy,
          outerSell: totals.outerSell,
          middleBlue: totals.middleBlue,
          middleRed: totals.middleRed,
          innerHighVol: totals.innerHighVol,
          innerLowVol: totals.innerLowVol,
          globalIndecision: totals.globalIndecision,
          totalVolume: totals.totalVolume,
          frozenPoolsJson: totals as any,
        },
      });
      
      this.logger.log(
        `❄️ Market instance frozen: ${frozen.durationMinutes} ` +
        `${frozen.windowStartMinutes}→${frozen.windowEndMinutes} ` +
        `(Volume: $${totals.totalVolume.toFixed(2)})`
      );
      
      return frozen;
    });
  }

  /**
   * Get market instances that need to be settled
   */
  async getMarketInstancesToSettle(): Promise<any[]> {
    const now = new Date();
    
    return this.prisma.marketInstance.findMany({
      where: {
        status: MarketInstanceStatus.FROZEN,
        settleAt: {
          lte: now,
        },
      },
    });
  }

  /**
   * Mark market instance as settling
   */
  async markAsSettling(instanceId: string): Promise<any> {
    return this.prisma.marketInstance.update({
      where: { id: instanceId },
      data: {
        status: MarketInstanceStatus.SETTLING,
      },
    });
  }

  /**
   * Mark market instance as settled
   */
  async markAsSettled(
    instanceId: string,
    settlementResult: {
      indecisionTriggered: boolean;
      outerWinner?: string;
      middleWinner?: string;
      innerWinner?: string;
      outerTied: boolean;
      middleTied: boolean;
      innerTied: boolean;
      totalHouseFee: Decimal;
    },
  ): Promise<any> {
    return this.prisma.marketInstance.update({
      where: { id: instanceId },
      data: {
        status: MarketInstanceStatus.SETTLED,
        settledAt: new Date(),
        ...settlementResult,
      },
    });
  }

  /**
   * Compute pool totals for a market instance from its bets
   */
  async computeInstanceTotals(
    instanceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    outerBuy: Decimal;
    outerSell: Decimal;
    middleBlue: Decimal;
    middleRed: Decimal;
    innerHighVol: Decimal;
    innerLowVol: Decimal;
    globalIndecision: Decimal;
    totalVolume: Decimal;
    totalBetsCount: number;
    uniqueUsersCount: number;
  }> {
    const prismaClient = tx || this.prisma;
    
    const totals = {
      outerBuy: new Decimal(0),
      outerSell: new Decimal(0),
      middleBlue: new Decimal(0),
      middleRed: new Decimal(0),
      innerHighVol: new Decimal(0),
      innerLowVol: new Decimal(0),
      globalIndecision: new Decimal(0),
      totalVolume: new Decimal(0),
      totalBetsCount: 0,
      uniqueUsersCount: 0,
    };
    
    // Get all accepted, non-demo bets for this instance
    const bets = await prismaClient.bet.findMany({
      where: {
        marketInstanceId: instanceId,
        status: 'ACCEPTED',
        isDemo: false,
      },
      select: {
        market: true,
        selection: true,
        amountUsd: true,
        userId: true,
      },
    });
    
    const uniqueUsers = new Set<string>();
    
    for (const bet of bets) {
      const amount = bet.amountUsd;
      totals.totalVolume = totals.totalVolume.add(amount);
      uniqueUsers.add(bet.userId);
      
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
    
    totals.totalBetsCount = bets.length;
    totals.uniqueUsersCount = uniqueUsers.size;
    
    return totals;
  }

  /**
   * Get market instance by ID
   */
  async getMarketInstance(instanceId: string): Promise<any> {
    const instance = await this.prisma.marketInstance.findUnique({
      where: { id: instanceId },
      include: {
        masterRound: true,
        bets: {
          where: { status: 'ACCEPTED' },
        },
        snapshots: true,
      },
    });
    
    if (!instance) {
      throw new NotFoundException('Market instance not found');
    }
    
    return instance;
  }

  /**
   * Get all market instances for a master round
   */
  async getMarketInstancesByMasterRound(masterRoundId: string): Promise<any[]> {
    return this.prisma.marketInstance.findMany({
      where: { masterRoundId },
      orderBy: [
        { durationMinutes: 'asc' },
        { windowStartMinutes: 'desc' },
      ],
    });
  }

  /**
   * Calculate remaining seconds until settlement for a given market instance
   */
  calculateRemainingSeconds(instance: any): number {
    const now = Date.now();
    const settleTime = new Date(instance.settleAt).getTime();
    return Math.max(0, Math.floor((settleTime - now) / 1000));
  }

  /**
   * Get the correct market instance for placing a bet
   * Returns null if no active instance found (shouldn't happen in normal operation)
   */
  async getInstanceForBet(
    masterRoundId: string,
    duration: DurationMinutes,
    masterSettleAt: Date,
  ): Promise<any | null> {
    const now = Date.now();
    const masterRemainingMs = new Date(masterSettleAt).getTime() - now;
    const masterRemainingSeconds = Math.max(0, Math.floor(masterRemainingMs / 1000));
    
    // Find active instance for this duration and current time
    const instance = await this.getActiveMarketInstance(
      masterRoundId,
      duration,
      masterRemainingSeconds,
    );
    
    if (!instance) {
      // If no active instance, check if there's a frozen one (user is too late)
      const frozenInstance = await this.prisma.marketInstance.findFirst({
        where: {
          masterRoundId,
          durationMinutes: duration,
          status: MarketInstanceStatus.FROZEN,
        },
        orderBy: { freezeAt: 'desc' },
      });
      
      if (frozenInstance) {
        this.logger.warn(`No active market instance for ${duration}, latest is frozen`);
        return null; // Bet not allowed - market is frozen
      }
    }
    
    return instance;
  }

  /**
   * Update pool totals for a market instance (real-time, called after bet placement)
   */
  async updateInstanceTotals(
    instanceId: string,
    market: string,
    selection: string,
    amount: Decimal,
  ): Promise<void> {
    const updateData: any = {
      totalVolume: { increment: amount },
    };
    
    // Map market/selection to correct field
    switch (market) {
      case 'OUTER':
        if (selection === 'BUY') updateData.outerBuy = { increment: amount };
        else if (selection === 'SELL') updateData.outerSell = { increment: amount };
        break;
      case 'MIDDLE':
        if (selection === 'BLUE') updateData.middleBlue = { increment: amount };
        else if (selection === 'RED') updateData.middleRed = { increment: amount };
        break;
      case 'INNER':
        if (selection === 'HIGH_VOL') updateData.innerHighVol = { increment: amount };
        else if (selection === 'LOW_VOL') updateData.innerLowVol = { increment: amount };
        break;
      case 'GLOBAL':
        if (selection === 'INDECISION') updateData.globalIndecision = { increment: amount };
        break;
    }
    
    await this.prisma.marketInstance.update({
      where: { id: instanceId },
      data: updateData,
    });
  }
}
