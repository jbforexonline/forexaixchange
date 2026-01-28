// =============================================================================
// ROUNDS SCHEDULER SERVICE - Automatic Round Lifecycle
// =============================================================================
// Path: backend/src/rounds/rounds-scheduler.service.ts
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoundsService } from './rounds.service';
import { RoundsSettlementService } from './rounds-settlement.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SeedingService } from './seeding.service';

@Injectable()
export class RoundsSchedulerService {
  private readonly logger = new Logger(RoundsSchedulerService.name);
  private isProcessing = false;
  private dbMissing = false;
  private dbMissingNotifiedAt = 0;

  constructor(
    private roundsService: RoundsService,
    private settlementService: RoundsSettlementService,
    private realtimeGateway: RealtimeGateway,
    private seedingService: SeedingService,
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

      // 1. Freeze rounds that reached freeze time
      await this.freezeExpiredRounds();

      // 2. Settle rounds that reached settle time
      await this.settleExpiredRounds();

      // 3. Ensure there's always an active round
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
   * Freeze rounds that have reached their freeze time
   * v2.1: Apply seeding before freezing to prevent 0-0 Indecision
   */
  private async freezeExpiredRounds() {
    try {
      // Get rounds that need to be frozen
      const roundsToFreeze = await this.roundsService.getRoundsAboutToFreeze();
      
      // Apply seeding to each round before freezing
      for (const round of roundsToFreeze) {
        try {
          await this.seedingService.applySeedingToRound(round.id, round.roundNumber);
          this.logger.debug(`🌱 Applied seeding to round ${round.roundNumber}`);
        } catch (seedError) {
          this.logger.error(`Failed to apply seeding to round ${round.roundNumber}:`, seedError);
          // Continue with freezing even if seeding fails
        }
      }
      
      // Now freeze the rounds
      const frozen = await this.roundsService.freezeExpiredRounds();
      
      if (frozen.length > 0) {
        this.logger.log(
          `❄️  Froze ${frozen.length} round(s): ${frozen.map((r) => r.roundNumber).join(', ')}`,
        );
        
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
