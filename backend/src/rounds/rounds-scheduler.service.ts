// =============================================================================
// ROUNDS SCHEDULER SERVICE - Automatic Round Lifecycle
// =============================================================================
// Path: backend/src/rounds/rounds-scheduler.service.ts
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoundsService } from './rounds.service';
import { RoundsSettlementService } from './rounds-settlement.service';
import { SeedingService } from './seeding.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class RoundsSchedulerService {
  private readonly logger = new Logger(RoundsSchedulerService.name);
  private isProcessing = false;
  private dbMissing = false;
  private dbMissingNotifiedAt = 0;

  constructor(
    private roundsService: RoundsService,
    private settlementService: RoundsSettlementService,
    private seedingService: SeedingService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Check round transitions every 10 seconds
   */
  @Cron('*/10 * * * * *')
  async checkRoundTransitions() {
    if (this.isProcessing) return; // Skip if already processing

    // If we've previously detected the Round table is missing, skip heavy work
    if (this.dbMissing) {
      const nowTs = Date.now();
      // Log a short notice at most once per minute to avoid noise
      if (nowTs - this.dbMissingNotifiedAt > 60 * 1000) {
        this.logger.warn('Scheduler paused: Round table appears missing. Waiting for DB to become available.');
        this.dbMissingNotifiedAt = nowTs;
      }
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      this.logger.debug(`🔄 Checking round transitions at ${now.toISOString()}`);

      // 1. Apply seeding to empty pairs before freeze (v2.1)
      await this.applySeedingBeforeFreeze();

      // 2. Capture checkpoints for sub-round settlements
      await this.captureCheckpoints();

      // 3. Freeze rounds that reached freeze time (also locks seeds)
      await this.freezeExpiredRounds();

      // 4. Settle rounds that reached settle time
      await this.settleExpiredRounds();

      // 5. Ensure there's always an active round
      await this.ensureActiveRound();
    } catch (error) {
      // Detect Prisma errors that indicate a missing table and flip a guard to stop noisy logs
      try {
        const code = error?.code || error?.meta?.code;
        const model = error?.meta?.modelName || error?.meta?.model;
        const message = String(error?.message || error);
        // if (message.includes('does not exist') || model === 'Round' || code === 'P2021' || code === 'P1010') {
        //   this.dbMissing = true;
        //   this.dbMissingNotifiedAt = Date.now();
        //   this.logger.warn('Detected missing Round table in DB — scheduler paused.');
        //   return;
        // }
      } catch (inner) {
        // fall through to generic error handling
      }

      this.logger.error('Error in round transition check:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * v2.1: Apply seeding to empty pairs before freeze
   * This runs periodically to ensure seeds are in place
   */
  private async applySeedingBeforeFreeze() {
    try {
      const activeRound = await this.roundsService.getActiveRound();
      
      if (!activeRound || activeRound.state !== 'OPEN') {
        return; // Only seed OPEN rounds
      }

      // Check if we're approaching freeze (within 2 minutes)
      const now = new Date();
      const freezeAt = new Date(activeRound.freezeAt).getTime();
      const timeUntilFreeze = (freezeAt - now.getTime()) / 1000;

      // Apply seeds throughout the round, but especially important near freeze
      if (timeUntilFreeze > 0 && timeUntilFreeze <= 120) {
        this.logger.debug(
          `🌱 Checking seeding for Round ${activeRound.roundNumber} (${Math.floor(timeUntilFreeze)}s until freeze)`
        );
        await this.seedingService.applyAllSeeds(activeRound.id, activeRound.roundNumber);
      }
    } catch (error) {
      this.handlePrismaError(error, 'Error applying seeding:');
    }
  }

  /**
   * Capture market state checkpoints at 15, 10, and 5-minute marks
   */
  private async captureCheckpoints() {
    try {
      const activeRound = await this.roundsService.getActiveRound();
      
      if (!activeRound || activeRound.state !== 'OPEN') {
        this.logger.debug(`⏭️ Skipping checkpoints: ${!activeRound ? 'No active round' : `Round state is ${activeRound.state}`}`);
        return; // Only capture checkpoints for OPEN rounds
      }

      const now = new Date();
      const elapsed = (now.getTime() - activeRound.openedAt.getTime()) / 1000; // seconds
      const roundDuration = activeRound.roundDuration; // seconds
      const timeRemaining = roundDuration - elapsed;
      const minutesRemaining = Math.floor(timeRemaining / 60);
      const secondsRemaining = Math.floor(timeRemaining % 60);

      this.logger.debug(
        `⏰ Round ${activeRound.roundNumber} - Time remaining: ${minutesRemaining}:${secondsRemaining.toString().padStart(2, '0')} ` +
        `(${timeRemaining.toFixed(0)}s) | Checkpoints: 15=${!!activeRound.checkpoint15min}, 10=${!!activeRound.checkpoint10min}, 5=${!!activeRound.checkpoint5min}`
      );

      // Check if we need to capture checkpoints
      // Trigger when we've just passed the mark (within 20 seconds after)
      const window = 20; // seconds window after the mark

      // 15-minute checkpoint (trigger when between 14:40 and 15:00 remaining)
      const checkpoint15Seconds = 15 * 60; // 900 seconds
      if (!activeRound.checkpoint15min && 
          timeRemaining <= checkpoint15Seconds && 
          timeRemaining >= checkpoint15Seconds - window) {
        this.logger.log(`📸 Capturing 15-minute checkpoint for Round ${activeRound.roundNumber} (time: ${Math.floor(timeRemaining / 60)}:${Math.floor(timeRemaining % 60).toString().padStart(2, '0')})`);
        await this.roundsService.captureCheckpoint(activeRound.id, 15);
        // Settle bets for users with 5-minute duration (Quarter 1 completed)
        await this.settlementService.settleCheckpoint(activeRound.id, 15);
      }

      // 10-minute checkpoint (trigger when between 9:40 and 10:00 remaining)
      const checkpoint10Seconds = 10 * 60; // 600 seconds
      if (!activeRound.checkpoint10min && 
          timeRemaining <= checkpoint10Seconds && 
          timeRemaining >= checkpoint10Seconds - window) {
        this.logger.log(`📸 Capturing 10-minute checkpoint for Round ${activeRound.roundNumber} (time: ${Math.floor(timeRemaining / 60)}:${Math.floor(timeRemaining % 60).toString().padStart(2, '0')})`);
        await this.roundsService.captureCheckpoint(activeRound.id, 10);
        // Settle bets for users with 5-minute (Quarter 2) and 10-minute (Semi 1) durations
        await this.settlementService.settleCheckpoint(activeRound.id, 10);
      }

      // 5-minute checkpoint (trigger when between 4:40 and 5:00 remaining)
      const checkpoint5Seconds = 5 * 60; // 300 seconds
      if (!activeRound.checkpoint5min && 
          timeRemaining <= checkpoint5Seconds && 
          timeRemaining >= checkpoint5Seconds - window) {
        this.logger.log(`📸 Capturing 5-minute checkpoint for Round ${activeRound.roundNumber} (time: ${Math.floor(timeRemaining / 60)}:${Math.floor(timeRemaining % 60).toString().padStart(2, '0')})`);
        await this.roundsService.captureCheckpoint(activeRound.id, 5);
        // Settle bets for users with 5-minute duration (Quarter 3 completed)
        await this.settlementService.settleCheckpoint(activeRound.id, 5);
      }
    } catch (error) {
      this.handlePrismaError(error, 'Error capturing checkpoints:');
    }
  }

  /**
   * Freeze rounds that have reached their freeze time
   * v2.1: Also locks seeds at freeze
   */
  private async freezeExpiredRounds() {
    try {
      const frozen = await this.roundsService.freezeExpiredRounds();
      
      if (frozen.length > 0) {
        this.logger.log(
          `❄️  Froze ${frozen.length} round(s): ${frozen.map((r) => r.roundNumber).join(', ')}`,
        );
        
        // v2.1: Lock seeds for each frozen round
        for (const round of frozen) {
          try {
            await this.seedingService.lockSeedsAtFreeze(round.id);
          } catch (e) {
            this.logger.warn(`Failed to lock seeds for round ${round.roundNumber}: ${e.message}`);
          }
        }
        
        // Broadcast round state change
        frozen.forEach((round) => {
          this.realtimeGateway.server.emit('roundStateChanged', {
            roundId: round.id,
            roundNumber: round.roundNumber,
            state: round.state,
            freezeAt: round.freezeAt,
            settleAt: round.settleAt,
          });
        });
      }
    } catch (error) {
      this.handlePrismaError(error, 'Error freezing rounds:');
    }
  }

  /**
   * Settle rounds that have reached their settle time
   */
  private async settleExpiredRounds() {
    try {
      const toSettle = await this.roundsService.getRoundsToSettle();

      if (toSettle.length === 0) return;

      this.logger.log(
        `⚙️  Settling ${toSettle.length} round(s): ${toSettle.map((r) => r.roundNumber).join(', ')}`,
      );

      for (const round of toSettle) {
        try {
          await this.settlementService.settleRound(round.id);
          
          // Broadcast round settlement
          this.realtimeGateway.server.emit('roundSettled', {
            roundId: round.id,
            roundNumber: round.roundNumber,
            state: 'SETTLED',
            settledAt: new Date(),
          });
          
          this.logger.log(`✅ Round ${round.roundNumber} settled and broadcasted`);
        } catch (error) {
          this.logger.error(`Failed to settle round ${round.roundNumber}:`, error);
        }
      }
    } catch (error) {
      this.handlePrismaError(error, 'Error settling rounds:');
    }
  }

  /**
   * Ensure there's always an active round (OPEN or FROZEN, not SETTLED)
   */
  private async ensureActiveRound() {
    try {
      // Use getActiveRound which only returns OPEN or FROZEN rounds
      const activeRound = await this.roundsService.getActiveRound();

      if (!activeRound) {
        this.logger.log('🎰 No active round found, opening new round...');
        const newRound = await this.roundsService.openNewRound();
        this.logger.log(
          `✅ Round ${newRound.roundNumber} opened - Settles at ${newRound.settleAt.toISOString()}`,
        );
        
        // Broadcast new round opened
        this.realtimeGateway.server.emit('roundStateChanged', {
          roundId: newRound.id,
          roundNumber: newRound.roundNumber,
          state: newRound.state,
          openedAt: newRound.openedAt,
          freezeAt: newRound.freezeAt,
          settleAt: newRound.settleAt,
          roundDuration: newRound.roundDuration,
        });

        // Also emit roundOpened event for better client handling
        this.realtimeGateway.server.emit('roundOpened', {
          roundId: newRound.id,
          roundNumber: newRound.roundNumber,
          state: newRound.state,
          openedAt: newRound.openedAt,
          freezeAt: newRound.freezeAt,
          settleAt: newRound.settleAt,
          roundDuration: newRound.roundDuration,
        });
      }
    } catch (error) {
      this.handlePrismaError(error, 'Error ensuring active round:');
    }
  }

  /**
   * Health check - runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async healthCheck() {
    try {
      const stats = await this.roundsService.getRoundStats();
      this.logger.debug(
        `📊 Health Check - Total Rounds: ${stats.totalRounds}, ` +
          `Active: ${stats.activeRound ? `Round ${stats.activeRound.roundNumber}` : 'None'}, ` +
          `Total Bets: ${stats.totalBets}`,
      );
    } catch (error) {
      this.handlePrismaError(error, 'Health check failed:');
    }
  }

  /**
   * Centralized Prisma error handler — detect missing Round table and pause scheduler
   */
  private handlePrismaError(error: any, prefix?: string) {
    try {
      const message = String(error?.message || error || '');
      const code = error?.code || error?.meta?.code;
      const model = error?.meta?.modelName || error?.meta?.model;

      if (message.includes('does not exist') || model === 'Round' || code === 'P2021') {
        this.dbMissing = true;
        this.dbMissingNotifiedAt = Date.now();
        this.logger.warn(`${prefix || ''} Detected missing Round table — scheduler paused.`);
        return;
      }
    } catch (inner) {
      // ignore
    }

    this.logger.error(prefix || 'Scheduler error:', error);
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger() {
    this.logger.log('🔧 Manual transition trigger requested');
    await this.checkRoundTransitions();
  }
}
