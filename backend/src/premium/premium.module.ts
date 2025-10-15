import { Module } from '@nestjs/common';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [PremiumController],
  providers: [PremiumService, PrismaService],
  exports: [PremiumService],
})
export class PremiumModule {}
