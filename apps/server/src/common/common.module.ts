import { Global, Module } from '@nestjs/common';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { SocketRateLimiterService } from './rate-limiter/socket-rate-limiter.service';

@Global()
@Module({
  providers: [RateLimitGuard, SocketRateLimiterService],
  exports: [RateLimitGuard, SocketRateLimiterService],
})
export class CommonModule {}
