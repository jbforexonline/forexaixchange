import { Controller, Get, Post, Delete, Body, Param, Req, Headers, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PremiumService } from './premium.service';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Premium')
@Controller('premium')
export class PremiumController {
  constructor(
    private readonly premiumService: PremiumService,
    private readonly jwtService: JwtService,
  ) {}

  private extractUserId(headers: any): string | null {
    try {
      const authHeader = headers.authorization || headers.Authorization;
      if (!authHeader) return null;
      
      const token = authHeader.replace('Bearer ', '');
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.userId || decoded?.sub || decoded?.id || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available premium plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async getPlans() {
    return this.premiumService.getPlans();
  }

  @Post('subscribe/:planId')
  @ApiOperation({ summary: 'Subscribe to a premium plan (requires wallet funds)' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async subscribe(
    @Param('planId') planId: string,
    @Headers() headers: any,
  ) {
    const userId = this.extractUserId(headers);
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.premiumService.subscribe(userId, planId);
  }

  @Post('simulate/:planId')
  @ApiOperation({ summary: 'Simulate premium subscription (testing only - no payment)' })
  @ApiResponse({ status: 201, description: 'Simulated subscription created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async simulateSubscription(
    @Param('planId') planId: string,
    @Headers() headers: any,
  ) {
    const userId = this.extractUserId(headers);
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    try {
      return await this.premiumService.simulateSubscription(userId, planId);
    } catch (error) {
      console.error('Simulate subscription error:', error);
      if (error.status) throw error;
      throw new InternalServerErrorException(error.message || 'Failed to simulate subscription');
    }
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  async getUserSubscription(@Headers() headers: any) {
    const userId = this.extractUserId(headers);
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.premiumService.getUserSubscription(userId);
  }

  @Delete('subscription')
  @ApiOperation({ summary: 'Cancel active subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@Headers() headers: any) {
    const userId = this.extractUserId(headers);
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.premiumService.cancelSubscription(userId);
  }
}
