import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class SocketRateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Checks if a socket event has exceeded its point limit within the given duration.
   * Returns true if rate limit IS EXCEEDED (should block), false if allowed.
   */
  async isRateLimited(
    socketId: string,
    eventName: string,
    points: number,
    durationSeconds: number,
  ): Promise<boolean> {
    const key = `ratelimit:socket:${socketId}:${eventName}`;
    const count = await this.redis.client.incr(key);

    if (count === 1) {
      await this.redis.client.expire(key, durationSeconds);
    }

    return count > points;
  }
}
