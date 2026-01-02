import { Module } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { AffiliateController } from './affiliate.controller';
import { PrismaService } from '../database/prisma.service';
import { AuthModule } from '../auth/auth.module'; // Import your auth module

@Module({
  imports: [AuthModule], // Import the module that provides AuthService
  controllers: [AffiliateController],
  providers: [AffiliateService, PrismaService],
  exports: [AffiliateService],
})
export class AffiliateModule {}