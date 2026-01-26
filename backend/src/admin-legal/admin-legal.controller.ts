import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { AdminLegalService } from './admin-legal.service';
import { CreateLegalDraftDto } from './dto/create-legal-draft.dto';
import type { LegalType } from '../legal/legal.constants';

@ApiTags('Admin Legal')
@Controller('api/admin/legal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth('JWT-auth')
export class AdminLegalController {
  constructor(private readonly adminLegalService: AdminLegalService) {}

  @Get('preview/:id')
  @ApiOperation({ summary: 'Get one document by id (preview)' })
  @ApiResponse({ status: 200, description: 'Document' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getById(@Param('id') id: string) {
    return this.adminLegalService.getById(id);
  }

  @Get(':type/versions')
  @ApiOperation({ summary: 'List all versions for type' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async listVersions(@Param('type') type: string) {
    return this.adminLegalService.listVersions(type as LegalType);
  }

  @Post(':type')
  @ApiOperation({ summary: 'Create draft legal document (inactive)' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  @ApiResponse({ status: 400, description: 'Validation error or version exists' })
  async createDraft(
    @Param('type') type: string,
    @Body() dto: CreateLegalDraftDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminLegalService.createDraft(
      type as LegalType,
      { version: dto.version, content: dto.content, effectiveAt: dto.effectiveAt },
      user.id,
    );
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate version (deactivate old active for same type)' })
  @ApiResponse({ status: 200, description: 'Activated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async activate(@Param('id') id: string) {
    return this.adminLegalService.activate(id);
  }
}
