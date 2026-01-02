import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PremiumService } from './premium.service';
import { PremiumController } from './premium.controller';
import { PrismaService } from '../database/prisma.service';
import { AffiliateModule } from '../affiliate/affiliate.module';

@Module({
  imports: [
    JwtModule.register({}),
    AffiliateModule,
  ],
  controllers: [PremiumController],
  providers: [PremiumService, PrismaService],
  exports: [PremiumService],
})
export class PremiumModule { }
