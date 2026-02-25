import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FaqService } from './faq.service';

@ApiTags('FAQ')
@Controller('api/faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'Get all FAQ items (public)' })
  @ApiResponse({ status: 200, description: 'List of FAQ items' })
  async findAll() {
    return this.faqService.findAll();
  }
}
