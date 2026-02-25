import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@ApiTags('Admin FAQ')
@Controller('api/admin/faq')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth('JWT-auth')
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'List all FAQ items (admin)' })
  @ApiResponse({ status: 200, description: 'List of FAQ items' })
  async findAll() {
    return this.faqService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one FAQ item by id' })
  @ApiResponse({ status: 200, description: 'FAQ item' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create FAQ item' })
  @ApiResponse({ status: 201, description: 'Created' })
  async create(@Body() dto: CreateFaqDto) {
    return this.faqService.create({
      category: dto.category,
      question: dto.question,
      answer: dto.answer,
      sortOrder: dto.sortOrder,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update FAQ item' })
  @ApiResponse({ status: 200, description: 'Updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete FAQ item' })
  @ApiResponse({ status: 200, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}
