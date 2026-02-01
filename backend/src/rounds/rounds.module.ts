// =============================================================================
// ROUNDS MODULE - Core Round Lifecycle Management
// =============================================================================
// Path: backend/src/rounds/rounds.module.ts
// v3.0: Added multi-duration support services
// =============================================================================

import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';
import { RoundsSettlementService } from './rounds-settlement.service';
import { RoundsFairnessService } from './rounds-fairness.service';
import { RoundsSchedulerService } from './rounds-scheduler.service';
import { SeedingService } from './seeding.service';
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
import { LegalModule } from '../legal/legal.module';

// v3.0: Multi-duration support services
import { MarketInstanceService } from './market-instance.service';
import { MasterClockService } from './master-clock.service';
import { MarketInstanceSettlementService } from './market-instance-settlement.service';
import { MarketAggregationService } from './market-aggregation.service';

@Module({
  imports: [ScheduleModule.forRoot(), RedisModule, LegalModule],
  controllers: [RoundsController, BetsController, AutoSpinController, SuggestionsController],
  providers: [
    // Core round services
    RoundsService,
    RoundsSettlementService,
    RoundsFairnessService,
    RoundsSchedulerService,
    SeedingService,
    BetsService,
    AutoSpinService,
    SuggestionsService,
    PrismaService,
    RealtimeGateway,
    MockRoundsService,
    
    // v3.0: Multi-duration support services
    MarketInstanceService,
    MasterClockService,
    MarketInstanceSettlementService,
    MarketAggregationService,
  ],
  exports: [
    RoundsService, 
    BetsService, 
    AutoSpinService, 
    SuggestionsService, 
    SeedingService,
    // v3.0: Export multi-duration services
    MarketInstanceService,
    MasterClockService,
    MarketInstanceSettlementService,
    MarketAggregationService,
  ],
})
export class RoundsModule {}
