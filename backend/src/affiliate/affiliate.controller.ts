import { Controller, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AffiliateService } from './affiliate.service';

@ApiTags('Affiliate')
@Controller('affiliate')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get()
  @ApiOperation({ summary: 'Get user affiliate data' })
  @ApiResponse({ status: 200, description: 'Affiliate data retrieved successfully' })
  async getUserAffiliateData(@Body() body: any) {
    const userId = body.userId || 'default-user';
    return this.affiliateService.getUserAffiliateData(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get affiliate statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAffiliateStats() {
    return this.affiliateService.getAffiliateStats();
  }
}
