import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AffiliateModule, RealtimeModule],
  controllers: [WalletController],
  providers: [WalletService, TransactionsService, PrismaService],
  exports: [WalletService, TransactionsService],
})
export class WalletModule {}
