import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Headers, 
  UnauthorizedException,
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AffiliateService } from './affiliate.service';
import { LegalComplianceGuard } from '../legal/guards/legal-compliance.guard';

@ApiTags('Affiliate')
@Controller('affiliate')
@UseGuards(AuthGuard('jwt'), LegalComplianceGuard)
@ApiBearerAuth()
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get()
  @ApiOperation({ summary: 'Get user affiliate data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Affiliate data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            affiliateCode: { type: 'string' },
            totalReferrals: { type: 'number' },
            activeReferrals: { type: 'number' },
            totalEarnings: { type: 'number' },
            totalPaid: { type: 'number' },
            pendingPayout: { type: 'number' },
            referrals: { type: 'array' },
            earnings: { type: 'array' },
          }
        }
      }
    }
  })
  async getUserAffiliateData(@Headers('authorization') authorization: string) {
    try {
      // Extract user ID from JWT token
      const userId = this.extractUserIdFromToken(authorization);
      const data = await this.affiliateService.getUserAffiliateData(userId);

      // Map internal service shape to frontend expected AffiliateStats shape
      const totalDepositsFromReferrals = (data.referrals || []).reduce((sum: number, r: any) => sum + (r.totalDeposited || 0), 0);
      const totalCommissionsEarned = data.totalEarnings || 0;
      const pendingCommission = data.pendingPayout || 0;

      const mapped = {
        referralCode: data.affiliateCode || '',
        totalReferrals: data.totalReferrals || 0,
        activeReferrals: data.activeReferrals || 0,
        totalDepositsFromReferrals,
        totalCommissionsEarned,
        pendingCommission,
        commissionTiers: [],
        lastPayoutDate: null,
        nextPayoutDate: null,
      };

      // Return the mapped object directly (frontend expects AffiliateStats)
      return mapped;
    } catch (error) {
      console.error('Error in getUserAffiliateData endpoint:', error);
      
      // Return default data if there's an error
      return {
        referralCode: '',
        totalReferrals: 0,
        activeReferrals: 0,
        totalDepositsFromReferrals: 0,
        totalCommissionsEarned: 0,
        pendingCommission: 0,
        commissionTiers: [],
        lastPayoutDate: null,
        nextPayoutDate: null,
        error: error.message,
      };
    }
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get user referrals list' })
  @ApiResponse({ 
    status: 200, 
    description: 'Referrals list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' }
      }
    }
  })
  async getUserReferrals(@Headers('authorization') authorization: string) {
    try {
      const userId = this.extractUserIdFromToken(authorization);
      const referrals = await this.affiliateService.getUserReferrals(userId);
      
      return {
        success: true,
        data: referrals,
      };
    } catch (error) {
      console.error('Error in getUserReferrals endpoint:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  // REMOVE WITHDRAWAL ENDPOINT FOR NOW
  // @Post('withdraw')
  // @ApiOperation({ summary: 'Withdraw affiliate earnings' })
  // async withdrawCommission(
  //   @Headers('authorization') authorization: string,
  //   @Body() body: { amount: number },
  // ) {
  //   // Remove for now
  // }

  @Post('generate-code')
  @ApiOperation({ summary: 'Generate affiliate code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Affiliate code generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        affiliateCode: { type: 'string' }
      }
    }
  })
  async generateAffiliateCode(@Headers('authorization') authorization: string) {
    try {
      const userId = this.extractUserIdFromToken(authorization);
      const code = await this.affiliateService.generateAffiliateCode(userId);
      
      return {
        success: true,
        affiliateCode: code,
      };
    } catch (error) {
      console.error('Error in generateAffiliateCode endpoint:', error);
      return {
        success: false,
        affiliateCode: '',
        error: error.message,
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get affiliate statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        totalAffiliates: { type: 'number' },
        totalReferrals: { type: 'number' },
        totalCommissions: { type: 'number' },
        paidCommissions: { type: 'number' },
        pendingCommissions: { type: 'number' },
        timestamp: { type: 'string' }
      }
    }
  })
  async getAffiliateStats() {
    try {
      const stats = await this.affiliateService.getAffiliateStats();
      
      return {
        success: true,
        ...stats,
      };
    } catch (error) {
      console.error('Error in getAffiliateStats endpoint:', error);
      return {
        success: false,
        totalAffiliates: 0,
        totalReferrals: 0,
        totalCommissions: 0,
        paidCommissions: 0,
        pendingCommissions: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' },
        service: { type: 'string' }
      }
    }
  })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'affiliate-service',
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        userId: { type: 'string' },
        timestamp: { type: 'string' }
      }
    }
  })
  async testEndpoint(@Headers('authorization') authorization: string) {
    try {
      const userId = this.extractUserIdFromToken(authorization);
      
      return {
        success: true,
        message: 'Affiliate service is working',
        userId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Authentication failed',
        error: error.message,
      };
    }
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get affiliate leaderboard' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
  })
  async getLeaderboard(@Query('period') period: string = 'allTime', @Query('limit') limit = '10') {
    try {
      const p = (period as any) || 'allTime';
      const l = parseInt(limit as any, 10) || 10;
      const list = await this.affiliateService.getAffiliateLeaderboard(p, l);
      return {
        success: true,
        data: list,
      };
    } catch (error) {
      console.error('Error in getLeaderboard endpoint:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  private extractUserIdFromToken(authorization: string): string {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const token = authorization.replace('Bearer ', '');
      const base64Url = token.split('.')[1];
      
      if (!base64Url) {
        throw new Error('Invalid token format');
      }
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(Buffer.from(base64, 'base64').toString());
      
      return decoded.sub || decoded.userId || decoded.id;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}