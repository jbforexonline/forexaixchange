// =============================================================================
// SUGGESTIONS CONTROLLER - Minority Rule Based Suggestions
// =============================================================================
// Path: backend/src/rounds/suggestions.controller.ts
// =============================================================================

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SuggestionsService } from './suggestions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Suggestions')
@Controller('suggestions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get suggestions for current round based on first 3 orders' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getCurrentRoundSuggestions() {
    return this.suggestionsService.getCurrentRoundSuggestions();
  }

  @Get('round/:roundId')
  @ApiOperation({ summary: 'Get suggestions for a specific round' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getRoundSuggestions(@Param('roundId') roundId: string) {
    return this.suggestionsService.getSuggestionsForRound(roundId);
  }
}

