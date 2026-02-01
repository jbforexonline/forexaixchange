import { Module, Global } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { PrismaService } from '../database/prisma.service';

@Global() // Make LedgerService globally available
@Module({
  providers: [LedgerService, PrismaService],
  exports: [LedgerService],
})
export class LedgerModule {}
