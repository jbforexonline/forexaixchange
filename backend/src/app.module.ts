import { Module } from '@nestjs/common';
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

import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppThrottlerModule,
    RedisModule,
    AuthModule,
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
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
