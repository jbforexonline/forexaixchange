import { Controller, Get, Inject } from '@nestjs/common';
import type Redis from 'ioredis';            // ⬅️ type-only default import
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../cache/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  ok() {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  @Get('database')
  async database() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { database: 'ok' };
  }

  @Get('cache')
  async cache() {
    const pong = await this.redis.ping();
    return { cache: pong === 'PONG' ? 'ok' : 'fail' };
  }
}
