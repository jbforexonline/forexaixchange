import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@ApiTags('Premium')
@Controller('premium')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PremiumController {
  constructor(private readonly premiumService: PremiumService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available premium plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    return this.premiumService.getPlans();
  }

  @Post('subscribe/:planId')
  @ApiOperation({ summary: 'Subscribe to a premium plan' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async subscribe(@Param('planId') planId: string, @CurrentUser() user: any) {
    return this.premiumService.subscribe(user.id, planId);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  async getUserSubscription(@CurrentUser() user: any) {
    return this.premiumService.getUserSubscription(user.id);
  }
}
