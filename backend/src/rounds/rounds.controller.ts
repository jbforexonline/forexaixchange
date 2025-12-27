// =============================================================================
// ROUNDS CONTROLLER - Public and Admin Endpoints
// =============================================================================
// Path: backend/src/rounds/rounds.controller.ts
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RoundsService } from './rounds.service';
import { RoundsSettlementService } from './rounds-settlement.service';
import { RoundsSchedulerService } from './rounds-scheduler.service';
import { BetsService } from './bets.service';
import { MockRoundsService } from './mock-rounds.service';

@ApiTags('Rounds')
@Controller('rounds')
export class RoundsController {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly settlementService: RoundsSettlementService,
    private readonly schedulerService: RoundsSchedulerService,
    private readonly betsService: BetsService,
    private readonly mockRoundsService: MockRoundsService,
  ) {}

  // =============================================================================
  // PUBLIC ENDPOINTS (Authenticated Users)
  // =============================================================================

  @Get('current')
  @ApiOperation({ summary: 'Get current active round' })
  @ApiResponse({
    status: 200,
    description: 'Current round retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roundNumber: { type: 'number' },
        state: { type: 'string', enum: ['OPEN', 'FROZEN', 'SETTLING', 'SETTLED'] },
        openedAt: { type: 'string', format: 'date-time' },
        freezeAt: { type: 'string', format: 'date-time' },
        settleAt: { type: 'string', format: 'date-time' },
        artifact: {
          type: 'object',
          properties: {
            commitHash: { type: 'string' },
          },
        },
      },
    },
  })
  async getCurrentRound() {
    try {
      const round = await this.roundsService.getCurrentRound();
      
      if (!round) {
        return {
          message: 'No active round. New round opening soon...',
          round: null,
        };
      }

      return {
        round: {
          id: round.id,
          roundNumber: round.roundNumber,
          state: round.state,
          openedAt: round.openedAt,
          freezeAt: round.freezeAt,
          settleAt: round.settleAt,
          roundDuration: round.roundDuration,
          commitHash: round.artifact?.commitHash,
          betsCount: round._count?.bets || 0,
          // Winner fields (only present when state === 'SETTLED')
          outerWinner: round.outerWinner,
          middleWinner: round.middleWinner,
          innerWinner: round.innerWinner,
          indecisionTriggered: round.indecisionTriggered,
          outerTied: round.outerTied,
          middleTied: round.middleTied,
          innerTied: round.innerTied,
        },
      };
    } catch (error) {
      console.error('Error fetching current round, falling back to mock:', error);
      // Fallback to mock round in development or when DB is unavailable
      // Try DI-provided mock service first
      try {
        if (this.mockRoundsService && typeof this.mockRoundsService.getCurrentRound === 'function') {
          const mock = this.mockRoundsService.getCurrentRound();
          return {
            round: {
              id: mock.id,
              roundNumber: mock.roundNumber,
              state: mock.state,
              openedAt: mock.openedAt,
              freezeAt: mock.freezeAt,
              settleAt: mock.settleAt,
              roundDuration: mock.roundDuration,
              commitHash: mock.artifact?.commitHash,
              betsCount: mock._count?.bets || 0,
              outerWinner: mock.outerWinner,
              middleWinner: mock.middleWinner,
              innerWinner: mock.innerWinner,
              indecisionTriggered: mock.indecisionTriggered,
              outerTied: mock.outerTied,
              middleTied: mock.middleTied,
              innerTied: mock.innerTied,
            },
            message: 'Using mock round due to backend error',
          };
        }

        // If DI mock isn't available for any reason, produce an inline fallback
        const now = new Date();
        const roundDuration = 60;
        const freezeOffset = 5;
        const openedAt = new Date(now.getTime() - (now.getTime() % (roundDuration * 1000)));
        const freezeAt = new Date(openedAt.getTime() + (roundDuration - freezeOffset) * 1000);
        const settleAt = new Date(openedAt.getTime() + roundDuration * 1000);

        return {
          round: {
            id: `inline-mock-${Math.floor(now.getTime() / 1000)}`,
            roundNumber: Math.floor(now.getTime() / 1000 / roundDuration),
            state: (now.getTime() >= freezeAt.getTime()) ? 'FROZEN' : 'OPEN',
            openedAt,
            freezeAt,
            settleAt,
            roundDuration,
            commitHash: undefined,
            betsCount: 0,
            outerWinner: undefined,
            middleWinner: undefined,
            innerWinner: undefined,
            indecisionTriggered: false,
            outerTied: false,
            middleTied: false,
            innerTied: false,
          },
          message: 'Using inline mock round due to backend error',
        };
      } catch (mockErr) {
        console.error('Mock fallback failed:', mockErr);
        return {
          message: 'Unable to fetch current round. Please try again.',
          round: null,
          error: process.env.NODE_ENV === 'development' ? (error?.message || String(error)) : undefined,
        };
      }
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get round history with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Round history retrieved successfully' })
  async getHistory(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.roundsService.getRoundHistory(page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get round statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRounds: { type: 'number' },
        activeRound: {
          type: 'object',
          nullable: true,
          properties: {
            roundNumber: { type: 'number' },
            state: { type: 'string' },
            freezeAt: { type: 'string' },
            settleAt: { type: 'string' },
            betsCount: { type: 'number' },
          },
        },
        averageVolume: { type: 'number' },
        totalBets: { type: 'number' },
      },
    },
  })
  async getStats() {
    return this.roundsService.getRoundStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get round by ID or number' })
  @ApiResponse({ status: 200, description: 'Round retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async getRound(@Param('id') id: string) {
    // Try to parse as number first, fallback to string ID
    const identifier = isNaN(Number(id)) ? id : Number(id);
    return this.roundsService.getRound(identifier);
  }

  @Get(':id/totals')
  @ApiOperation({ summary: 'Get live totals for a round (from Redis)' })
  @ApiResponse({
    status: 200,
    description: 'Live totals retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        outer: {
          type: 'object',
          properties: {
            BUY: { type: 'number' },
            SELL: { type: 'number' },
          },
        },
        middle: {
          type: 'object',
          properties: {
            BLUE: { type: 'number' },
            RED: { type: 'number' },
          },
        },
        inner: {
          type: 'object',
          properties: {
            HIGH_VOL: { type: 'number' },
            LOW_VOL: { type: 'number' },
          },
        },
        global: {
          type: 'object',
          properties: {
            INDECISION: { type: 'number' },
          },
        },
      },
    },
  })
  async getRoundTotals(@Param('id') id: string) {
    const totals = await this.betsService.getRedisTotals(id);
    return { roundId: id, totals };
  }

  // =============================================================================
  // ADMIN ENDPOINTS (Super Admin & Admin Only)
  // =============================================================================

  @Post('admin/new')
  @ApiOperation({ summary: 'Manually open a new round' })
  @ApiResponse({ status: 201, description: 'Round created successfully' })
  async adminOpenRound(
    @Body('roundDuration') roundDuration?: number,
    @Body('freezeOffset') freezeOffset?: number,
  ) {
    return this.roundsService.openNewRound(roundDuration, freezeOffset);
  }

  @Post('admin/:id/freeze')
  @ApiOperation({ summary: 'Force freeze a round' })
  @ApiResponse({ status: 200, description: 'Round frozen successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async adminFreezeRound(@Param('id') id: string) {
    return this.roundsService.adminForceFreeze(id);
  }

  @Post('admin/:id/settle')
  @ApiOperation({ summary: 'Force settle a round' })
  @ApiResponse({ status: 200, description: 'Round settled successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async adminSettleRound(@Param('id') id: string) {
    return this.settlementService.settleRound(id);
  }

  @Post('admin/:id/cancel')
  @ApiOperation({ summary: 'Cancel a round and refund all bets' })
  @ApiResponse({ status: 200, description: 'Round cancelled and bets refunded' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async adminCancelRound(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.roundsService.adminCancelRound(id, reason);
  }

  @Post('admin/trigger-transitions')
  @ApiOperation({ summary: 'Manually trigger round transitions check' })
  @ApiResponse({ status: 200, description: 'Transitions triggered successfully' })
  async adminTriggerTransitions() {
    await this.schedulerService.manualTrigger();
    return { message: 'Round transitions triggered manually' };
  }

  @Get('admin/:id/bets')
  @ApiOperation({ summary: 'Get all bets for a round' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Bets retrieved successfully' })
  async adminGetRoundBets(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.betsService.getAdminRoundBets(id, page, limit);
  }
}
