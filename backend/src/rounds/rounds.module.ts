// =============================================================================
// ROUNDS MODULE - Core Round Lifecycle Management
// =============================================================================
// Path: backend/src/rounds/rounds.module.ts
// =============================================================================

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { RoundsSettlementService } from './rounds-settlement.service';
import { RoundsFairnessService } from './rounds-fairness.service';
import { RoundsSchedulerService } from './rounds-scheduler.service';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';
import { AutoSpinService } from './autospin.service';
import { AutoSpinController } from './autospin.controller';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { PrismaService } from '../database/prisma.service';
import { RedisModule } from '../cache/redis.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MockRoundsService } from './mock-rounds.service';

@Module({
  imports: [ScheduleModule.forRoot(), RedisModule],
  controllers: [RoundsController, BetsController, AutoSpinController, SuggestionsController],
  providers: [
    RoundsService,
    RoundsSettlementService,
    RoundsFairnessService,
    RoundsSchedulerService,
    BetsService,
    AutoSpinService,
    SuggestionsService,
    PrismaService,
    RealtimeGateway,
    MockRoundsService,
  ],
  exports: [RoundsService, BetsService, AutoSpinService, SuggestionsService],
})
export class RoundsModule {}
