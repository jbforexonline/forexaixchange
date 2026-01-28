// =============================================================================
// SEEDING SERVICE - System Liquidity Seeding for Low-Traffic Hours
// =============================================================================
// Path: backend/src/rounds/seeding.service.ts
// Implements: Technical Specification v2.1 - System Liquidity Seeding
// Purpose: Prevents 0-0 pairs from triggering Global Indecision
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BetMarket, RoundState } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';

// Seed amount: smallest supported currency unit
const SEED_EPSILON = new Decimal(0.01);

// Seed types for each betting pair
export enum SeedType {
  DIRECTION = 'DIRECTION', // OUTER: BUY/SELL
  VOLATILITY = 'VOLATILITY', // INNER: HIGH_VOL/LOW_VOL
  COLOR = 'COLOR', // MIDDLE: BLUE/RED
}

// Seed side rotation schedule (deterministic per round)
interface SeedRotation {
  direction: 'BUY' | 'SELL';
  volatility: 'HIGH_VOL' | 'LOW_VOL';
  color: 'BLUE' | 'RED';
}

export interface SeedState {
  direction: { side: string; amount: Decimal } | null;
  volatility: { side: string; amount: Decimal } | null;
  color: { side: string; amount: Decimal } | null;
  locked: boolean;
}

@Injectable()
export class SeedingService {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /**
   * Get seed rotation for a round (deterministic based on round number)
   * Rotates through combinations to ensure fairness
   */
  getSeedRotation(roundNumber: number): SeedRotation {
    // 8 combinations for rotation (2^3)
    const rotationIndex = roundNumber % 8;
    
    return {
      direction: (rotationIndex & 1) ? 'SELL' : 'BUY',
      volatility: (rotationIndex & 2) ? 'LOW_VOL' : 'HIGH_VOL',
      color: (rotationIndex & 4) ? 'RED' : 'BLUE',
    };
  }

  /**
   * Check if a pair has any user bets (excludes system seeds)
   */
  async hasUserBets(roundId: string, market: BetMarket): Promise<boolean> {
    const count = await this.prisma.bet.count({
      where: {
        roundId,
        market,
        status: 'ACCEPTED',
        isSystemSeed: false,
      },
    });
    return count > 0;
  }

  /**
   * Get current seed state for a round
   */
  async getSeedState(roundId: string): Promise<SeedState> {
    const seeds = await this.prisma.bet.findMany({
      where: {
        roundId,
        isSystemSeed: true,
        status: 'ACCEPTED',
      },
    });

    const state: SeedState = {
      direction: null,
      volatility: null,
      color: null,
      locked: false,
    };

    for (const seed of seeds) {
      if (seed.market === BetMarket.OUTER) {
        state.direction = { side: seed.selection, amount: seed.amountUsd };
      } else if (seed.market === BetMarket.INNER) {
        state.volatility = { side: seed.selection, amount: seed.amountUsd };
      } else if (seed.market === BetMarket.MIDDLE) {
        state.color = { side: seed.selection, amount: seed.amountUsd };
      }
    }

    // Check if round is frozen (seeds are locked)
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      select: { state: true },
    });
    state.locked = round?.state !== RoundState.OPEN;

    return state;
  }

  /**
   * Apply seed to a pair if needed (no user bets exist)
   * Returns true if seed was applied
   */
  async applySeedIfNeeded(
    roundId: string,
    roundNumber: number,
    market: BetMarket,
  ): Promise<boolean> {
    // Don't seed GLOBAL market (Indecision)
    if (market === BetMarket.GLOBAL) return false;

    // Check if round is still OPEN
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      select: { state: true },
    });

    if (round?.state !== RoundState.OPEN) {
      this.logger.debug(`Seed skipped: Round ${roundId} is not OPEN`);
      return false;
    }

    // Check if any user bets exist
    const hasUsers = await this.hasUserBets(roundId, market);
    if (hasUsers) {
      this.logger.debug(`Seed not needed: ${market} has user bets`);
      return false;
    }

    // Check if seed already exists
    const existingSeed = await this.prisma.bet.findFirst({
      where: {
        roundId,
        market,
        isSystemSeed: true,
        status: 'ACCEPTED',
      },
    });

    if (existingSeed) {
      this.logger.debug(`Seed already exists for ${market}`);
      return false;
    }

    // Determine seed side based on rotation
    const rotation = this.getSeedRotation(roundNumber);
    let seedSelection: string;
    let seedType: string;

    switch (market) {
      case BetMarket.OUTER:
        seedSelection = rotation.direction;
        seedType = SeedType.DIRECTION;
        break;
      case BetMarket.INNER:
        seedSelection = rotation.volatility;
        seedType = SeedType.VOLATILITY;
        break;
      case BetMarket.MIDDLE:
        seedSelection = rotation.color;
        seedType = SeedType.COLOR;
        break;
      default:
        return false;
    }

    // Create seed bet
    await this.prisma.bet.create({
      data: {
        roundId,
        userId: 'SYSTEM_SEED', // Special system user ID
        market,
        selection: seedSelection,
        amountUsd: SEED_EPSILON,
        status: 'ACCEPTED',
        isSystemSeed: true,
        seedType,
        isPremiumUser: false,
        isDemo: false,
        userRoundDuration: 20,
      },
    });

    // Update house seed wallet
    await this.updateHouseSeedWallet(SEED_EPSILON, 'SEED_PLACED');

    this.logger.log(
      `🌱 Seed applied: Round ${roundNumber} ${market} ${seedSelection} $${SEED_EPSILON}`,
    );

    return true;
  }

  /**
   * Remove seed from a pair (when user bet is placed)
   */
  async removeSeed(roundId: string, market: BetMarket): Promise<boolean> {
    // Check if round is still OPEN
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      select: { state: true },
    });

    if (round?.state !== RoundState.OPEN) {
      this.logger.debug(`Seed removal skipped: Round ${roundId} is frozen`);
      return false;
    }

    const seed = await this.prisma.bet.findFirst({
      where: {
        roundId,
        market,
        isSystemSeed: true,
        status: 'ACCEPTED',
      },
    });

    if (!seed) {
      return false;
    }

    // Cancel the seed bet
    await this.prisma.bet.update({
      where: { id: seed.id },
      data: { status: 'CANCELLED' },
    });

    // Update house seed wallet (refund)
    await this.updateHouseSeedWallet(seed.amountUsd.neg(), 'SEED_REMOVED');

    this.logger.log(
      `🌱 Seed removed: ${market} (user bet placed)`,
    );

    return true;
  }

  /**
   * Apply seeds to all empty pairs in a round
   */
  async applyAllSeeds(roundId: string, roundNumber: number): Promise<void> {
    const markets = [BetMarket.OUTER, BetMarket.MIDDLE, BetMarket.INNER];

    for (const market of markets) {
      await this.applySeedIfNeeded(roundId, roundNumber, market);
    }
  }

  /**
   * Check and re-apply seeds after bet cancellation
   */
  async checkAndReapplySeeds(roundId: string, roundNumber: number, market: BetMarket): Promise<void> {
    // Check if round is still OPEN
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      select: { state: true },
    });

    if (round?.state !== RoundState.OPEN) {
      return;
    }

    // Check if pair is now empty
    const hasUsers = await this.hasUserBets(roundId, market);
    if (!hasUsers) {
      await this.applySeedIfNeeded(roundId, roundNumber, market);
    }
  }

  /**
   * Lock seeds at freeze time (capture final state)
   */
  async lockSeedsAtFreeze(roundId: string): Promise<SeedState> {
    const seedState = await this.getSeedState(roundId);
    seedState.locked = true;

    // Store seed snapshot in round
    await this.prisma.round.update({
      where: { id: roundId },
      data: {
        seedEnabled: true,
        seedSnapshotJson: seedState as any,
      },
    });

    this.logger.log(`🔒 Seeds locked for round ${roundId}`);
    return seedState;
  }

  /**
   * Get user-only totals (excludes seeds) for UI display
   */
  async getUserOnlyTotals(roundId: string): Promise<{
    outerBuy: Decimal;
    outerSell: Decimal;
    middleBlue: Decimal;
    middleRed: Decimal;
    innerHighVol: Decimal;
    innerLowVol: Decimal;
    globalIndecision: Decimal;
  }> {
    const totals = {
      outerBuy: new Decimal(0),
      outerSell: new Decimal(0),
      middleBlue: new Decimal(0),
      middleRed: new Decimal(0),
      innerHighVol: new Decimal(0),
      innerLowVol: new Decimal(0),
      globalIndecision: new Decimal(0),
    };

    const bets = await this.prisma.bet.findMany({
      where: {
        roundId,
        status: 'ACCEPTED',
        isSystemSeed: false, // Exclude seeds
        isDemo: false, // Exclude demo
      },
      select: {
        market: true,
        selection: true,
        amountUsd: true,
      },
    });

    for (const bet of bets) {
      const amount = bet.amountUsd;

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
   * Update house seed wallet for tracking
   */
  private async updateHouseSeedWallet(amount: Decimal, type: string): Promise<void> {
    try {
      // Upsert house seed wallet
      await this.prisma.$executeRaw`
        INSERT INTO "HouseSeedWallet" (id, balance, "totalSeeded", "totalReturned", "updatedAt")
        VALUES ('SEED_HOUSE', ${amount}, ${amount.gt(0) ? amount : new Decimal(0)}, ${amount.lt(0) ? amount.abs() : new Decimal(0)}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          balance = "HouseSeedWallet".balance + ${amount},
          "totalSeeded" = "HouseSeedWallet"."totalSeeded" + ${amount.gt(0) ? amount : new Decimal(0)},
          "totalReturned" = "HouseSeedWallet"."totalReturned" + ${amount.lt(0) ? amount.abs() : new Decimal(0)},
          "updatedAt" = NOW()
      `;
    } catch (error) {
      // Log but don't fail - wallet tracking is secondary
      this.logger.warn(`Failed to update house seed wallet: ${error.message}`);
    }
  }

  /**
   * Get seed statistics for admin reporting
   */
  async getSeedStats(): Promise<{
    totalSeedsActive: number;
    totalSeedAmount: Decimal;
    seedsByMarket: Record<string, number>;
  }> {
    const activeSeeds = await this.prisma.bet.findMany({
      where: {
        isSystemSeed: true,
        status: 'ACCEPTED',
      },
      select: {
        market: true,
        amountUsd: true,
      },
    });

    const seedsByMarket: Record<string, number> = {
      OUTER: 0,
      MIDDLE: 0,
      INNER: 0,
    };

    let totalSeedAmount = new Decimal(0);

    for (const seed of activeSeeds) {
      seedsByMarket[seed.market]++;
      totalSeedAmount = totalSeedAmount.add(seed.amountUsd);
    }

    return {
      totalSeedsActive: activeSeeds.length,
      totalSeedAmount,
      seedsByMarket,
    };
  }
}
