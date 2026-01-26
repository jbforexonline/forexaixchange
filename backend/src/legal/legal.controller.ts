import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { LegalService } from './legal.service';
import { CurrentUser } from '../auth/decorators/user.decorator';
import type { LegalType } from './legal.constants';

function getClientIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0]?.trim();
  if (Array.isArray(xff) && xff[0]) return String(xff[0]).split(',')[0]?.trim();
  return req.socket?.remoteAddress;
}

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : undefined;
}

@ApiTags('Legal')
@Controller('api/legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get(':type/active')
  @ApiOperation({ summary: 'Get active legal document by type (terms | privacy)' })
  @ApiResponse({ status: 200, description: 'Active document' })
  @ApiResponse({ status: 404, description: 'No active document' })
  async getActive(@Param('type') type: string) {
    const doc = await this.legalService.getActive(type as LegalType);
    if (!doc) throw new NotFoundException(`No active ${type} document found`);
    return doc;
  }

  @Post('age-confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirm user is 18+ (store ip, user-agent)' })
  @ApiResponse({ status: 200, description: 'Age confirmation recorded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async ageConfirm(@CurrentUser() user: { id: string }, @Req() req: Request) {
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    return this.legalService.confirmAge(user.id, ip, ua);
  }

  @Post(':type/accept')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Accept active terms or privacy (idempotent per user+doc)' })
  @ApiResponse({ status: 200, description: 'Acceptance recorded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'No active document' })
  async accept(
    @Param('type') type: string,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    return this.legalService.accept(type as LegalType, user.id, ip, ua);
  }
}
