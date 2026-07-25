import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchResult } from '@syncroom/shared';
import { RedisService } from '../redis/redis.service';

const IGNORE_PATTERNS = [
  /lyrics/i,
  /nightcore/i,
  /slowed/i,
  /reverb/i,
  /bass boosted/i,
  /10 hour/i,
  /8 hour/i,
  /1 hour/i,
];

const PRIORITY_PATTERNS = [
  { pattern: /vevo/i, score: 100 },
  { pattern: /official/i, score: 80 },
  { pattern: /topic/i, score: 70 },
  { pattern: /records/i, score: 50 },
];

@Injectable()
export class SearchService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private searchKey(query: string) {
    return `search:${query.toLowerCase().trim()}`;
  }

  private shouldIgnore(title: string): boolean {
    return IGNORE_PATTERNS.some((p) => p.test(title));
  }

  private rankResult(title: string, channel: string): number {
    let score = 0;
    const combined = `${title} ${channel}`;
    for (const { pattern, score: s } of PRIORITY_PATTERNS) {
      if (pattern.test(combined)) score += s;
    }
    return score;
  }

  private parseDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  async search(query: string): Promise<SearchResult[]> {
    const normalized = query.trim();
    if (!normalized) return [];

    const cached = await this.redis.get<SearchResult[]>(this.searchKey(normalized));
    if (cached) return cached;

    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      return this.mockSearch(normalized);
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoCategoryId', '10');
    url.searchParams.set('maxResults', '20');
    url.searchParams.set('q', normalized);
    url.searchParams.set('key', apiKey);

    const searchRes = await fetch(url.toString());
    if (!searchRes.ok) {
      return this.mockSearch(normalized);
    }

    const searchData = (await searchRes.json()) as {
      items?: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { medium?: { url: string }; default?: { url: string } };
        };
      }>;
    };

    const videoIds =
      searchData.items?.map((i) => i.id.videoId).filter(Boolean) ?? [];

    if (videoIds.length === 0) return [];

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'contentDetails,snippet');
    detailsUrl.searchParams.set('id', videoIds.join(','));
    detailsUrl.searchParams.set('key', apiKey);

    const detailsRes = await fetch(detailsUrl.toString());
    const detailsData = detailsRes.ok
      ? ((await detailsRes.json()) as {
          items?: Array<{
            id: string;
            snippet: {
              title: string;
              channelTitle: string;
              thumbnails: { medium?: { url: string }; default?: { url: string } };
            };
            contentDetails: { duration: string };
          }>;
        })
      : { items: [] };

    const results: Array<SearchResult & { rank: number }> = [];

    for (const item of detailsData.items ?? []) {
      const title = item.snippet.title;
      if (this.shouldIgnore(title)) continue;

      results.push({
        videoId: item.id,
        title,
        artist: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.medium?.url ??
          item.snippet.thumbnails.default?.url ??
          '',
        duration: this.parseDuration(item.contentDetails.duration),
        rank: this.rankResult(title, item.snippet.channelTitle),
      });
    }

    results.sort((a, b) => b.rank - a.rank);
    const finalResults = results.map(({ rank: _, ...rest }) => rest);

    await this.redis.set(this.searchKey(normalized), finalResults, 1800);
    return finalResults;
  }

  private mockSearch(query: string): SearchResult[] {
    return [
      {
        videoId: 'dQw4w9WgXcQ',
        title: `${query} - Official Video`,
        artist: 'VEVO',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        duration: 212,
      },
      {
        videoId: 'kJQP7kiw5Fk',
        title: `${query} - Live Performance`,
        artist: 'Music Topic',
        thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
        duration: 280,
      },
    ];
  }
}
