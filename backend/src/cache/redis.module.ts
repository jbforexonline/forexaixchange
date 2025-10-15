import { Module } from '@nestjs/common';
import Redis from 'ioredis';                 // ⬅️ default import

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: 3,
          lazyConnect: true, // Don't connect immediately
          connectTimeout: 5000,
        });

        // Handle connection errors gracefully
        redis.on('error', (err) => {
          console.warn('Redis connection error:', err.message);
          console.warn('Continuing without Redis cache...');
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
