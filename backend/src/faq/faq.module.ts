import { Module } from '@nestjs/common';
import { FaqController } from './faq.controller';
import { AdminFaqController } from './admin-faq.controller';
import { FaqService } from './faq.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [FaqController, AdminFaqController],
  providers: [FaqService, PrismaService],
  exports: [FaqService],
})
export class FaqModule {}
