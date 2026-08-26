import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  points: number; // Maximum number of requests allowed
  durationSeconds: number; // Window duration in seconds
}

export const RATE_LIMIT_KEY = 'rate_limit_options';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
