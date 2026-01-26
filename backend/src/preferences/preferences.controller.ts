// =============================================================================
// PREFERENCES CONTROLLER - User Preferences & Flexible Timing
// =============================================================================
// Path: backend/src/preferences/preferences.controller.ts
// =============================================================================

import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import type { UpdatePreferencesDto } from './preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalComplianceGuard } from '../legal/guards/legal-compliance.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('Preferences')
@Controller('preferences')
@UseGuards(JwtAuthGuard, LegalComplianceGuard)
@ApiBearerAuth('JWT-auth')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getPreferences(@CurrentUser() user: any) {
    return this.preferencesService.getUserPreferences(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences (Premium for round duration)' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 403, description: 'Premium required for round duration' })
  async updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: any,
  ) {
    return this.preferencesService.updatePreferences(user.id, dto);
  }
}

