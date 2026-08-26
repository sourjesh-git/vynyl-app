import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // If endpoint doesn't specify @RateLimit(), allow request
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown-ip';

    const routePath = request.route?.path || request.url;
    const redisKey = `ratelimit:rest:${clientIp}:${routePath}`;

    const currentCount = await this.redis.client.incr(redisKey);

    if (currentCount === 1) {
      await this.redis.client.expire(redisKey, options.durationSeconds);
    }

    if (currentCount > options.points) {
      throw new HttpException(
        `Too many requests. Limit is ${options.points} per ${options.durationSeconds}s. Please slow down.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
