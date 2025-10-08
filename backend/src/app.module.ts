import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './database/prisma.service';
import { RedisModule } from './cache/redis.module';
import { HealthController } from './monitoring/health.controller';
import { RealtimeGateway } from './realtime/realtime.gateway';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), RedisModule],
  controllers: [HealthController],
  providers: [PrismaService, RealtimeGateway],
})
export class AppModule {}
