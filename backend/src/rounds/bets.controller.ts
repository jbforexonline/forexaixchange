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

@ApiTags('Bets')
@Controller('bets')
export class BetsController {
  constructor(
    private readonly betsService: BetsService,
    private readonly roundsService: RoundsService,
  ) {}

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
  async placeBet(@Body() dto: PlaceBetDto) {
    const userId = dto['userId'] || 'default-user';
    // Get current active round
    const currentRound = await this.roundsService.getCurrentRound();
    
    if (!currentRound) {
      throw new BadRequestException('No active round available. Please wait for next round.');
    }

    if (currentRound.state !== 'OPEN') {
      throw new BadRequestException(`Round is ${currentRound.state}. Cannot place bets.`);
    }

    // Place bet
    return this.betsService.placeBet(userId, {
      ...dto,
      roundId: currentRound.id,
    });
  }

  @Get('current-round')
  @ApiOperation({ summary: 'Get user\'s bets for the current active round' })
  @ApiQuery({ name: 'userId', required: false, type: String })
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
  async getCurrentRoundBets(@Query('userId') userId: string) {
    const id = userId || 'default-user';
    const currentRound = await this.roundsService.getCurrentRound();
    
    if (!currentRound) {
      return [];
    }

    return this.betsService.getUserBets(id, currentRound.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user\'s complete bet history with pagination' })
  @ApiQuery({ name: 'userId', required: false, type: String })
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
    @Query('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const id = userId || 'default-user';
    return this.betsService.getUserBetHistory(id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user\'s betting statistics' })
  @ApiQuery({ name: 'userId', required: false, type: String })
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
  async getStats(@Query('userId') userId: string) {
    const id = userId || 'default-user';
    return this.betsService.getUserBetStats(id);
  }

  @Get('round/:roundId')
  @ApiOperation({ summary: 'Get user\'s bets for a specific round' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Bets retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Round not found' })
  async getRoundBets(
    @Param('roundId') roundId: string,
    @Query('userId') userId: string,
  ) {
    const id = userId || 'default-user';
    // Verify round exists
    await this.roundsService.getRound(roundId);

    return this.betsService.getUserBets(id, roundId);
  }
}
