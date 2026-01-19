import { Module } from '@nestjs/common';
import Redis from 'ioredis';                 // ⬅️ default import

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        const password = process.env.REDIS_PASSWORD || undefined; // kept for local/dev

        const redis = redisUrl
          ? new Redis(redisUrl, {
              maxRetriesPerRequest: 3,
              lazyConnect: true,
              connectTimeout: 5000,
            })
          : new Redis({
              host,
              port,
              password,
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
