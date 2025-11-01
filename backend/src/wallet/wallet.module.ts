import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../database/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Module({
  controllers: [WalletController],
  providers: [WalletService, TransactionsService, PrismaService, RealtimeGateway],
  exports: [WalletService, TransactionsService],
})
export class WalletModule {}
