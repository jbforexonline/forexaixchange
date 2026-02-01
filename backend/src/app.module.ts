import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';
import { RedisModule } from './cache/redis.module';
import { HealthController } from './monitoring/health.controller';
import { RealtimeGateway } from './realtime/realtime.gateway';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { SpinsModule } from './spins/spins.module';
import { PremiumModule } from './premium/premium.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { AdminModule } from './admin/admin.module';
import { RoundsModule } from './rounds/rounds.module';
import { ChatModule } from './chat/chat.module';
import { PreferencesModule } from './preferences/preferences.module';
import { AppThrottlerModule } from './common/throttler.module';
import { LegalModule } from './legal/legal.module';
import { AdminLegalModule } from './admin-legal/admin-legal.module';
import { RealtimeModule } from './realtime/realtime.module';
// Finance System v2
import { LedgerModule } from './ledger/ledger.module';
import { AdminFinanceModule } from './admin-finance/admin-finance.module';

import { AppController } from './app.controller';
import { LedgerService } from './ledger/ledger.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppThrottlerModule,
    RedisModule,
    AuthModule,
    LegalModule,
    AdminLegalModule,
    UsersModule,
    WalletModule,
    SpinsModule,
    PremiumModule,
    AffiliateModule,
    AdminModule,
    RoundsModule,
    ChatModule,
    PreferencesModule,
    RealtimeModule,
    // Finance System v2
    LedgerModule,
    AdminFinanceModule,
  ],
  controllers: [HealthController, AppController],
  providers: [PrismaService],
})
export class AppModule implements OnModuleInit {
  constructor(private ledgerService: LedgerService) {}

  async onModuleInit() {
    // Initialize system ledger accounts on startup
    try {
      await this.ledgerService.initializeSystemAccounts();
    } catch (error) {
      console.warn('Failed to initialize system accounts (database may not be ready):', error.message);
    }
  }
}
