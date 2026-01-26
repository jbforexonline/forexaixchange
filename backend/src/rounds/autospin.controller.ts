// =============================================================================
// AUTO-SPIN CONTROLLER - Auto-Press Orders Management
// =============================================================================
// Path: backend/src/rounds/autospin.controller.ts
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AutoSpinService } from './autospin.service';
import type { CreateAutoSpinDto } from './autospin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LegalComplianceGuard } from '../legal/guards/legal-compliance.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('AutoSpin')
@Controller('autospin')
@UseGuards(JwtAuthGuard, LegalComplianceGuard)
@ApiBearerAuth('JWT-auth')
export class AutoSpinController {
  constructor(private readonly autoSpinService: AutoSpinService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create an auto-spin order (Premium only, up to 50 rounds)', 
    description: 'Premium feature: Schedule auto-bets up to 2 hours ahead or 24 rounds ahead (for 5-min intervals). Use targetRoundNumber for round-based scheduling or scheduledFor/expiresAt for time-based scheduling.'
  })
  @ApiResponse({ status: 201, description: 'Auto-spin order created successfully' })
  @ApiResponse({ status: 403, description: 'Premium subscription required' })
  @ApiResponse({ status: 400, description: 'Invalid request or limit reached' })
  async createAutoSpinOrder(
    @Body() dto: CreateAutoSpinDto,
    @CurrentUser() user: any,
  ) {
    return this.autoSpinService.createAutoSpinOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user\'s auto-spin orders' })
  @ApiResponse({ status: 200, description: 'Auto-spin orders retrieved' })
  async getUserAutoSpinOrders(@CurrentUser() user: any) {
    return this.autoSpinService.getUserAutoSpinOrders(user.id);
  }

  @Delete(':orderId')
  @ApiOperation({ summary: 'Cancel an auto-spin order (Premium only)' })
  @ApiResponse({ status: 200, description: 'Auto-spin order cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelAutoSpinOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    return this.autoSpinService.cancelAutoSpinOrder(user.id, orderId);
  }

  @Get('active/count')
  @ApiOperation({ summary: 'Get count of active auto-spin orders' })
  @ApiResponse({ status: 200, description: 'Active orders count' })
  async getActiveOrdersCount(@CurrentUser() user: any) {
    const count = await this.autoSpinService.getActiveOrdersCount(user.id);
    return { count };
  }
}

