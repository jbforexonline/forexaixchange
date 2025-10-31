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
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RoundsService } from './rounds.service';
import { RoundsSettlementService } from './rounds-settlement.service';
import { RoundsSchedulerService } from './rounds-scheduler.service';
import { BetsService } from './bets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Rounds')
@Controller('rounds')
export class RoundsController {
  constructor(
    private readonly roundsService: RoundsService,
    private readonly settlementService: RoundsSettlementService,
    private readonly schedulerService: RoundsSchedulerService,
    private readonly betsService: BetsService,
  ) {}

  // =============================================================================
  // PUBLIC ENDPOINTS (Authenticated Users)
  // =============================================================================

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
      },
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get round by ID or number' })
  @ApiResponse({ status: 200, description: 'Round retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async getRound(@Param('id') id: string) {
    // Try to parse as number first, fallback to string ID
    const identifier = isNaN(Number(id)) ? id : Number(id);
    return this.roundsService.getRound(identifier);
  }

  @Get(':id/totals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually open a new round (Admin only)' })
  @ApiResponse({ status: 201, description: 'Round created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async adminOpenRound(
    @Body('roundDuration') roundDuration?: number,
    @Body('freezeOffset') freezeOffset?: number,
  ) {
    return this.roundsService.openNewRound(roundDuration, freezeOffset);
  }

  @Post('admin/:id/freeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Force freeze a round (Admin only)' })
  @ApiResponse({ status: 200, description: 'Round frozen successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async adminFreezeRound(@Param('id') id: string) {
    return this.roundsService.adminForceFreeze(id);
  }

  @Post('admin/:id/settle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Force settle a round (Admin only)' })
  @ApiResponse({ status: 200, description: 'Round settled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async adminSettleRound(@Param('id') id: string) {
    return this.settlementService.settleRound(id);
  }

  @Post('admin/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel a round and refund all bets (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Round cancelled and bets refunded' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async adminCancelRound(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.roundsService.adminCancelRound(id, reason);
  }

  @Post('admin/trigger-transitions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Manually trigger round transitions check (Admin only)' })
  @ApiResponse({ status: 200, description: 'Transitions triggered successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async adminTriggerTransitions() {
    await this.schedulerService.manualTrigger();
    return { message: 'Round transitions triggered manually' };
  }

  @Get('admin/:id/bets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all bets for a round (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Bets retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async adminGetRoundBets(
    @Param('id') id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.betsService.getAdminRoundBets(id, page, limit);
  }
}
