// =============================================================================
// ROUNDS SCHEDULER SERVICE - Automatic Round Lifecycle
// =============================================================================
// Path: backend/src/rounds/rounds-scheduler.service.ts
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RoundsService } from './rounds.service';
import { RoundsSettlementService } from './rounds-settlement.service';

@Injectable()
export class RoundsSchedulerService {
  private readonly logger = new Logger(RoundsSchedulerService.name);
  private isProcessing = false;

  constructor(
    private roundsService: RoundsService,
    private settlementService: RoundsSettlementService,
  ) {}

  /**
   * Check round transitions every 10 seconds
   */
  @Cron('*/10 * * * * *')
  async checkRoundTransitions() {
    if (this.isProcessing) {
      return; // Skip if already processing
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
      this.logger.error('Error in round transition check:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Freeze rounds that have reached their freeze time
   */
  private async freezeExpiredRounds() {
    try {
      const frozen = await this.roundsService.freezeExpiredRounds();
      
      if (frozen.length > 0) {
        this.logger.log(
          `❄️  Froze ${frozen.length} round(s): ${frozen.map((r) => r.roundNumber).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error('Error freezing rounds:', error);
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
        } catch (error) {
          this.logger.error(`Failed to settle round ${round.roundNumber}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error settling rounds:', error);
    }
  }

  /**
   * Ensure there's always an active round
   */
  private async ensureActiveRound() {
    try {
      const currentRound = await this.roundsService.getCurrentRound();

      if (!currentRound) {
        this.logger.log('🎰 No active round found, opening new round...');
        const newRound = await this.roundsService.openNewRound();
        this.logger.log(
          `✅ Round ${newRound.roundNumber} opened - Settles at ${newRound.settleAt.toISOString()}`,
        );
      }
    } catch (error) {
      this.logger.error('Error ensuring active round:', error);
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
      this.logger.error('Health check failed:', error);
    }
  }

  /**
   * Manual trigger for testing
   */
  async manualTrigger() {
    this.logger.log('🔧 Manual transition trigger requested');
    await this.checkRoundTransitions();
  }
}
