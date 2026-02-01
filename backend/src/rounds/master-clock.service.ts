// =============================================================================
// MASTER CLOCK SERVICE - Global 20-Minute Cycle Management
// =============================================================================
// Path: backend/src/rounds/master-clock.service.ts
// Implements: Single master clock for multi-duration rounds with checkpoint scheduling
// =============================================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { MarketInstanceService, FREEZE_SCHEDULE, SETTLEMENT_SCHEDULE } from './market-instance.service';
import { RoundsService } from './rounds.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RoundState, MarketInstanceStatus, DurationMinutes } from '@prisma/client';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/redis.module';

// Master cycle duration: 20 minutes
const MASTER_CYCLE_DURATION_MS = 20 * 60 * 1000;
const MASTER_CYCLE_DURATION_SECONDS = 20 * 60;

export interface MasterClockState {
  masterRoundId: string;
  roundNumber: number;
  openedAt: Date;
  settleAt: Date;
  remainingSeconds: number;
  currentPhase: 'ACTIVE' | 'FINAL_MINUTE';
}

@Injectable()
export class MasterClockService implements OnModuleInit {
  private readonly logger = new Logger(MasterClockService.name);
  private isProcessing = false;
  private lastBroadcastTime = 0;

  constructor(
    private prisma: PrismaService,
    private marketInstanceService: MarketInstanceService,
    private roundsService: RoundsService,
    private gateway: RealtimeGateway,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async onModuleInit() {
    // Ensure there's an active master round with market instances on startup
    await this.ensureActiveMasterRound();
  }

  /**
   * Master clock tick - runs every 5 seconds
   * Handles all checkpoint-based events for multi-duration rounds
   */
  @Cron('*/5 * * * * *')
  async masterClockTick() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      
      // 1. Ensure active master round exists
      const masterRound = await this.ensureActiveMasterRound();
      if (!masterRound) {
        this.logger.warn('No active master round available');
        return;
      }

      // 2. Calculate master clock state
      const clockState = this.calculateClockState(masterRound);
      
      // 3. Freeze market instances that have reached their freeze time
      await this.processMarketInstanceFreezes();
      
      // 4. Settle market instances that have reached their settle time
      await this.processMarketInstanceSettlements();
      
      // 5. Check if master cycle is complete and start new one
      if (clockState.remainingSeconds <= 0) {
        await this.completeMasterCycle(masterRound);
      }
      
      // 6. Broadcast master clock state (throttled to every 1 second max)
      if (now - this.lastBroadcastTime >= 1000) {
        await this.broadcastClockState(clockState);
        this.lastBroadcastTime = now;
      }
      
    } catch (error) {
      this.logger.error('Master clock tick error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Ensure there's an active master round with market instances
   */
  async ensureActiveMasterRound(): Promise<any | null> {
    // First, check for an existing active round
    let activeRound = await this.prisma.round.findFirst({
      where: {
        state: { in: [RoundState.OPEN, RoundState.FROZEN] },
      },
      orderBy: { roundNumber: 'desc' },
    });

    if (!activeRound) {
      // Create new master round
      this.logger.log('🎰 Creating new master round...');
      activeRound = await this.roundsService.openNewRound();
      
      // Create market instances for this round
      await this.marketInstanceService.createMarketInstances(
        activeRound.id,
        activeRound.openedAt,
      );
      
      this.logger.log(`✅ Master round ${activeRound.roundNumber} created with market instances`);
      
      // Broadcast new round opened
      this.gateway.server.emit('masterRoundOpened', {
        roundId: activeRound.id,
        roundNumber: activeRound.roundNumber,
        openedAt: activeRound.openedAt,
        settleAt: activeRound.settleAt,
      });
    } else {
      // Ensure market instances exist for this round
      const instanceCount = await this.prisma.marketInstance.count({
        where: { masterRoundId: activeRound.id },
      });
      
      if (instanceCount === 0) {
        this.logger.log(`Creating market instances for existing round ${activeRound.roundNumber}...`);
        await this.marketInstanceService.createMarketInstances(
          activeRound.id,
          activeRound.openedAt,
        );
      }
    }

    return activeRound;
  }

  /**
   * Calculate current clock state from master round
   */
  calculateClockState(masterRound: any): MasterClockState {
    const now = Date.now();
    const settleTime = new Date(masterRound.settleAt).getTime();
    const remainingMs = Math.max(0, settleTime - now);
    const remainingSeconds = Math.floor(remainingMs / 1000);
    
    return {
      masterRoundId: masterRound.id,
      roundNumber: masterRound.roundNumber,
      openedAt: masterRound.openedAt,
      settleAt: masterRound.settleAt,
      remainingSeconds,
      currentPhase: remainingSeconds <= 60 ? 'FINAL_MINUTE' : 'ACTIVE',
    };
  }

  /**
   * Get remaining seconds for a specific duration
   * Returns the time until the user's selected duration window ends
   */
  calculateDurationRemainingSeconds(
    masterRemainingSeconds: number,
    duration: DurationMinutes,
  ): number {
    const masterRemainingMinutes = masterRemainingSeconds / 60;
    
    // Find the current window for this duration
    let windowEndMinutes = 0;
    
    switch (duration) {
      case DurationMinutes.FIVE:
        // 5-min windows: 20→15, 15→10, 10→5, 5→0
        if (masterRemainingMinutes > 15) windowEndMinutes = 15;
        else if (masterRemainingMinutes > 10) windowEndMinutes = 10;
        else if (masterRemainingMinutes > 5) windowEndMinutes = 5;
        else windowEndMinutes = 0;
        break;
        
      case DurationMinutes.TEN:
        // 10-min windows: 20→10, 10→0
        if (masterRemainingMinutes > 10) windowEndMinutes = 10;
        else windowEndMinutes = 0;
        break;
        
      case DurationMinutes.TWENTY:
        // 20-min window: 20→0
        windowEndMinutes = 0;
        break;
    }
    
    // Calculate seconds until window end
    const windowEndSeconds = windowEndMinutes * 60;
    return Math.max(0, masterRemainingSeconds - windowEndSeconds);
  }

  /**
   * Process market instance freezes at checkpoint times
   */
  async processMarketInstanceFreezes(): Promise<void> {
    const instancesToFreeze = await this.marketInstanceService.getMarketInstancesToFreeze();
    
    for (const instance of instancesToFreeze) {
      try {
        // Apply seeding before freezing (per instance)
        await this.applySeedingToInstance(instance.id);
        
        // Freeze the instance
        const frozen = await this.marketInstanceService.freezeMarketInstance(instance.id);
        
        // Broadcast freeze event
        this.gateway.server.emit('marketInstanceFrozen', {
          instanceId: frozen.id,
          masterRoundId: frozen.masterRoundId,
          durationMinutes: frozen.durationMinutes,
          windowStart: frozen.windowStartMinutes,
          windowEnd: frozen.windowEndMinutes,
          frozenAt: frozen.frozenAt,
        });
        
        this.logger.log(
          `❄️ Market instance frozen: ${frozen.durationMinutes} ` +
          `${frozen.windowStartMinutes}→${frozen.windowEndMinutes}`
        );
      } catch (error) {
        this.logger.error(`Failed to freeze market instance ${instance.id}:`, error);
      }
    }
  }

  /**
   * Process market instance settlements at checkpoint times
   */
  async processMarketInstanceSettlements(): Promise<void> {
    const instancesToSettle = await this.marketInstanceService.getMarketInstancesToSettle();
    
    for (const instance of instancesToSettle) {
      // Emit settlement pending event - actual settlement handled by settlement service
      this.gateway.server.emit('marketInstanceSettling', {
        instanceId: instance.id,
        masterRoundId: instance.masterRoundId,
        durationMinutes: instance.durationMinutes,
        windowStart: instance.windowStartMinutes,
        windowEnd: instance.windowEndMinutes,
      });
      
      this.logger.log(
        `⚙️ Market instance ready for settlement: ${instance.durationMinutes} ` +
        `${instance.windowStartMinutes}→${instance.windowEndMinutes}`
      );
    }
  }

  /**
   * Apply seeding to a market instance before freezing
   * Seeding is per-instance, not across durations
   */
  private async applySeedingToInstance(instanceId: string): Promise<void> {
    // This will be delegated to the seeding service
    // For now, just log it
    this.logger.debug(`Applying seeding to market instance ${instanceId}`);
  }

  /**
   * Complete master cycle and start new one
   */
  async completeMasterCycle(masterRound: any): Promise<void> {
    this.logger.log(`🏁 Master cycle ${masterRound.roundNumber} completing...`);
    
    // Check if all market instances are settled
    const unsettledInstances = await this.prisma.marketInstance.count({
      where: {
        masterRoundId: masterRound.id,
        status: { not: MarketInstanceStatus.SETTLED },
      },
    });
    
    if (unsettledInstances > 0) {
      this.logger.warn(`${unsettledInstances} market instances still not settled`);
      return;
    }
    
    // Mark master round as settled
    await this.prisma.round.update({
      where: { id: masterRound.id },
      data: {
        state: RoundState.SETTLED,
        settledAt: new Date(),
      },
    });
    
    // Broadcast cycle completion
    this.gateway.server.emit('masterRoundSettled', {
      roundId: masterRound.id,
      roundNumber: masterRound.roundNumber,
      settledAt: new Date(),
    });
    
    this.logger.log(`✅ Master cycle ${masterRound.roundNumber} completed`);
    
    // New round will be created on next tick by ensureActiveMasterRound
  }

  /**
   * Broadcast master clock state to all clients
   */
  private async broadcastClockState(clockState: MasterClockState): Promise<void> {
    // Calculate remaining seconds for each duration
    const durationTimers = {
      five: this.calculateDurationRemainingSeconds(clockState.remainingSeconds, DurationMinutes.FIVE),
      ten: this.calculateDurationRemainingSeconds(clockState.remainingSeconds, DurationMinutes.TEN),
      twenty: clockState.remainingSeconds,
    };
    
    this.gateway.server.emit('masterClockTick', {
      masterRoundId: clockState.masterRoundId,
      roundNumber: clockState.roundNumber,
      masterRemainingSeconds: clockState.remainingSeconds,
      durationTimers,
      phase: clockState.currentPhase,
      serverTime: Date.now(),
    });
  }

  /**
   * Get current master clock state (for API calls)
   */
  async getCurrentState(): Promise<MasterClockState | null> {
    const activeRound = await this.prisma.round.findFirst({
      where: {
        state: { in: [RoundState.OPEN, RoundState.FROZEN] },
      },
      orderBy: { roundNumber: 'desc' },
    });
    
    if (!activeRound) {
      return null;
    }
    
    return this.calculateClockState(activeRound);
  }

  /**
   * Get detailed market state for all durations
   */
  async getMarketState(masterRoundId: string): Promise<{
    masterClock: MasterClockState;
    marketInstances: any[];
    durationTimers: Record<string, number>;
  } | null> {
    const masterRound = await this.prisma.round.findUnique({
      where: { id: masterRoundId },
    });
    
    if (!masterRound) {
      return null;
    }
    
    const clockState = this.calculateClockState(masterRound);
    const instances = await this.marketInstanceService.getMarketInstancesByMasterRound(masterRoundId);
    
    const durationTimers = {
      FIVE: this.calculateDurationRemainingSeconds(clockState.remainingSeconds, DurationMinutes.FIVE),
      TEN: this.calculateDurationRemainingSeconds(clockState.remainingSeconds, DurationMinutes.TEN),
      TWENTY: clockState.remainingSeconds,
    };
    
    return {
      masterClock: clockState,
      marketInstances: instances,
      durationTimers,
    };
  }

  /**
   * Store clock state in Redis for fast access
   */
  private async cacheClockState(state: MasterClockState): Promise<void> {
    try {
      if (this.redis.status !== 'ready') return;
      
      await this.redis.set(
        'master:clock:state',
        JSON.stringify({
          ...state,
          cachedAt: Date.now(),
        }),
        'EX',
        5, // 5 second TTL
      );
    } catch (error) {
      // Non-critical, just log
      this.logger.debug(`Failed to cache clock state: ${error.message}`);
    }
  }

  /**
   * Get cached clock state from Redis
   */
  async getCachedClockState(): Promise<MasterClockState | null> {
    try {
      if (this.redis.status !== 'ready') return null;
      
      const cached = await this.redis.get('master:clock:state');
      if (!cached) return null;
      
      return JSON.parse(cached);
    } catch (error) {
      return null;
    }
  }
}
