import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PremiumService } from './premium.service';

@ApiTags('Premium')
@Controller('premium')
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
  async subscribe(@Param('planId') planId: string, @Body() body: any) {
    const userId = body.userId || 'default-user';
    return this.premiumService.subscribe(userId, planId);
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  async getUserSubscription(@Body() body: any) {
    const userId = body.userId || 'default-user';
    return this.premiumService.getUserSubscription(userId);
  }
}
