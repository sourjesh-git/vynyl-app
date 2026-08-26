import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const url = config.get<string>('REDIS_URL');
        const isTls = url?.startsWith('rediss://') || url?.includes('upstash.io');
        const client = url
          ? new Redis(url, {
              tls: isTls ? { rejectUnauthorized: false } : undefined,
              maxRetriesPerRequest: null,
            })
          : new Redis({
              host: config.get('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
              password: config.get('REDIS_PASSWORD') || undefined,
              maxRetriesPerRequest: null,
            });

        client.on('connect', () => {
          logger.log('Successfully connected to Redis');
        });

        client.on('error', (err) => {
          logger.error(`Redis client error: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(private readonly redisService: RedisService) {}

  async onModuleDestroy() {
    await this.redisService.disconnect();
  }
}
