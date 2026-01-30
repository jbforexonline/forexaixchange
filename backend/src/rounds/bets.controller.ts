// =============================================================================
// BETS CONTROLLER - Bet Placement and History
// =============================================================================
// Path: backend/src/rounds/bets.controller.ts
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BetsService } from './bets.service';
import { RoundsService } from './rounds.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalComplianceGuard } from '../legal/guards/legal-compliance.guard';

@ApiTags('Bets')
@Controller('bets')
@UseGuards(JwtAuthGuard, LegalComplianceGuard)
export class BetsController {
  private readonly logger = new Logger(BetsController.name);

  constructor(
    private readonly betsService: BetsService,
    private readonly roundsService: RoundsService,
  ) {}

  @Post('cancel/:betId')
  @ApiOperation({ summary: 'Cancel a bet (Premium only, before freeze)' })
  @ApiResponse({ status: 200, description: 'Bet cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Premium subscription required' })
  @ApiResponse({ status: 400, description: 'Cannot cancel bet' })
  async cancelBet(@Param('betId') betId: string, @CurrentUser() user: any) {
    return this.betsService.cancelBet(user.id, betId);
  }

  @Post()
  @ApiOperation({ summary: 'Place a bet on the current active round' })
  @ApiBody({ type: PlaceBetDto })
  @ApiResponse({
    status: 201,
    description: 'Bet placed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        roundId: { type: 'string' },
        market: { type: 'string', enum: ['OUTER', 'MIDDLE', 'INNER', 'GLOBAL'] },
        selection: { type: 'string' },
        amountUsd: { type: 'number' },
        status: { type: 'string', enum: ['ACCEPTED'] },
        isPremiumUser: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid bet or insufficient funds' })
  @ApiResponse({ status: 404, description: 'No active round available' })
  async placeBet(@Body() dto: PlaceBetDto, @CurrentUser() user: any) {
    this.logger.debug(`📝 placeBet request: user=${user?.id}, dto=${JSON.stringify(dto)}`);
    
    // Get current active round
    const currentRound = await this.roundsService.getCurrentRound();
    
    if (!currentRound) {
      this.logger.warn('No active round found for bet placement');
      throw new BadRequestException('No active round available. Please wait for next round.');
    }

    this.logger.debug(`📝 Current round: ${currentRound.roundNumber} (${currentRound.state})`);

    if (currentRound.state !== 'OPEN') {
      this.logger.warn(`Round ${currentRound.roundNumber} is ${currentRound.state}, cannot place bets`);
      throw new BadRequestException(`Round is ${currentRound.state}. Cannot place orders.`);
    }

    // Place bet with authenticated user
    return this.betsService.placeBet(user.id, {
      ...dto,
      roundId: currentRound.id,
    });
  }

  @Get('current-round')
  @ApiOperation({ summary: 'Get user\'s bets for the current active round' })
  @ApiResponse({
    status: 200,
    description: 'User bets for current round retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          market: { type: 'string' },
          selection: { type: 'string' },
          amountUsd: { type: 'number' },
          status: { type: 'string' },
          isWinner: { type: 'boolean', nullable: true },
          payoutAmount: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getCurrentRoundBets(@CurrentUser() user: any) {
    const currentRound = await this.roundsService.getCurrentRound();
    
    if (!currentRound) {
      return [];
    }

    return this.betsService.getUserBets(user.id, currentRound.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user\'s complete bet history with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Bet history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              market: { type: 'string' },
              selection: { type: 'string' },
              amountUsd: { type: 'number' },
              status: { type: 'string' },
              isWinner: { type: 'boolean', nullable: true },
              payoutAmount: { type: 'number', nullable: true },
              profitAmount: { type: 'number', nullable: true },
              round: {
                type: 'object',
                properties: {
                  roundNumber: { type: 'number' },
                  state: { type: 'string' },
                  settledAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getHistory(
    @CurrentUser() user: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.betsService.getUserBetHistory(user.id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user\'s betting statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalBets: { type: 'number' },
        wonBets: { type: 'number' },
        lostBets: { type: 'number' },
        winRate: { type: 'number', description: 'Percentage (0-100)' },
        totalWagered: { type: 'number' },
        totalWon: { type: 'number' },
        profitLoss: { type: 'number', description: 'Net profit/loss (negative if loss)' },
      },
    },
  })
  async getStats(@CurrentUser() user: any) {
    return this.betsService.getUserBetStats(user.id);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get market distribution statistics (historical)' })
  @ApiQuery({ 
    name: 'timeFilter', 
    required: false, 
    enum: ['hourly', 'daily', 'monthly', 'quarterly', 'yearly'],
    description: 'Time period for statistics (default: all time)' 
  })
  @ApiResponse({
    status: 200,
    description: 'Market distribution statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        distribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              selection: { type: 'string' },
              market: { type: 'string' },
              label: { type: 'string' },
              count: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
        },
        totalBets: { type: 'number' },
        totalParticipants: { type: 'number' },
        timeFilter: { type: 'string' },
        fromDate: { type: 'string', nullable: true },
        toDate: { type: 'string' },
      },
    },
  })
  async getMarketDistribution(
    @Query('timeFilter') timeFilter?: 'hourly' | 'daily' | 'monthly' | 'quarterly' | 'yearly',
  ) {
    return this.betsService.getMarketDistribution(timeFilter);
  }

  @Get('distribution/live')
  @ApiOperation({ summary: 'Get live market distribution for current round' })
  @ApiResponse({
    status: 200,
    description: 'Live market distribution retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        roundId: { type: 'string', nullable: true },
        roundNumber: { type: 'number', nullable: true },
        distribution: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              selection: { type: 'string' },
              market: { type: 'string' },
              label: { type: 'string' },
              count: { type: 'number' },
              percentage: { type: 'number' },
              amount: { type: 'number' },
            },
          },
        },
        totalBets: { type: 'number' },
        totalParticipants: { type: 'number' },
        totalVolume: { type: 'number' },
      },
    },
  })
  async getLiveMarketDistribution() {
    return this.betsService.getLiveMarketDistribution();
  }

  @Get('round/:roundId')
  @ApiOperation({ summary: 'Get user\'s bets for a specific round' })
  @ApiResponse({ status: 200, description: 'Bets retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async getRoundBets(
    @Param('roundId') roundId: string,
    @CurrentUser() user: any,
  ) {
    // Verify round exists
    await this.roundsService.getRound(roundId);

    return this.betsService.getUserBets(user.id, roundId);
  }
}
