import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { PrismaService } from '../database/prisma.service';
import { AffiliateService } from '../affiliate/affiliate.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [PremiumController],
  providers: [PremiumService, PrismaService, AffiliateService],
  exports: [PremiumService],
})
export class PremiumModule {}
