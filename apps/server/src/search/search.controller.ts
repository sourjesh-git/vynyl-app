import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';

@Controller('search')
@UseGuards(RateLimitGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RateLimit({ points: 20, durationSeconds: 60 })
  async search(@Query('q') q: string) {
    const results = await this.searchService.search(q ?? '');
    return { results };
  }
}
