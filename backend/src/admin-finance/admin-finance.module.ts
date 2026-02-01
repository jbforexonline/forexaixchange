import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { WithdrawalService } from './withdrawal.service';
import { ReserveService } from './reserve.service';
import { AdminFinanceController } from './admin-finance.controller';
import { UserFinanceController } from './user-finance.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { PrismaService } from '../database/prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [LedgerModule, RealtimeModule],
  controllers: [AdminFinanceController, UserFinanceController],
  providers: [DepositService, WithdrawalService, ReserveService, PrismaService],
  exports: [DepositService, WithdrawalService, ReserveService],
})
export class AdminFinanceModule {}
