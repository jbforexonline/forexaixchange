import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SpinsService } from './spins.service';
import { CreateSpinDto } from './dto/create-spin.dto';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Spins')
@Controller('spins')
export class SpinsController {
  constructor(private readonly spinsService: SpinsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new spin' })
  @ApiResponse({ status: 201, description: 'Spin created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createSpinDto: CreateSpinDto) {
    const userId = createSpinDto['userId'] || 'default-user';
    const betAmount = new Decimal(createSpinDto.betAmount);
    return this.spinsService.createSpin(
      userId,
      betAmount,
      createSpinDto.betType,
      createSpinDto.volatility,
      createSpinDto.color,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get user spin history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Spin history retrieved successfully' })
  async getHistory(
    @Query('userId') userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    const id = userId || 'default-user';
    return this.spinsService.getSpinHistory(id, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user spin statistics' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query('userId') userId: string) {
    const id = userId || 'default-user';
    return this.spinsService.getSpinStats(id);
  }

  @Get('sentiment')
  @ApiOperation({ summary: 'Get community sentiment' })
  @ApiResponse({ status: 200, description: 'Community sentiment retrieved successfully' })
  async getCommunitySentiment() {
    return this.spinsService.getCommunitySentiment();
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent spin results' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Recent results retrieved successfully' })
  async getRecentResults(@Query('limit', new ParseIntPipe({ optional: true })) limit = 10) {
    return this.spinsService.getRecentResults(limit);
  }
}
