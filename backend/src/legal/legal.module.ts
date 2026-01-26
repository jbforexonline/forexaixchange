import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';
import { LegalComplianceGuard } from './guards/legal-compliance.guard';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [LegalController],
  providers: [LegalService, LegalComplianceGuard, PrismaService],
  exports: [LegalService, LegalComplianceGuard],
})
export class LegalModule {}
