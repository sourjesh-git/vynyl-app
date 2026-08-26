import { Injectable, Logger } from '@nestjs/common';
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

const SEARCH_CACHE_TTL_SECONDS = 86400; // 24 Hours
const CIRCUIT_BREAKER_TTL_SECONDS = 3600; // 1 Hour

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) { }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ');
  }

  private searchKey(normalizedQuery: string) {
    return `search:v3:${normalizedQuery}`;
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

  private parseIsoDuration(iso: string): number {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private parseSimpleDuration(str?: string): number {
    if (!str) return 180;
    const parts = str.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p))) return 180;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 180;
  }

  async search(query: string): Promise<SearchResult[]> {
    const normalized = this.normalizeQuery(query);
    if (!normalized) return [];

    // 1. Check Redis Cache
    const cached = await this.redis.get<SearchResult[]>(this.searchKey(normalized));
    if (cached && cached.length > 0) {
      return cached;
    }

    // 2. Check Circuit Breaker (Is API Quota Burned Out?)
    const isQuotaExceeded = await this.redis.get<boolean>('yt:quota_exceeded');
    if (isQuotaExceeded) {
      this.logger.warn(`Circuit breaker active [yt:quota_exceeded]. Routing query "${normalized}" to Public Search Parser.`);
      return this.publicYouTubeSearch(normalized);
    }

    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) {
      return this.publicYouTubeSearch(normalized);
    }

    // 3. Attempt YouTube Data API v3 Search
    try {
      const url = new URL('https://www.googleapis.com/youtube/v3/search');
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('videoEmbeddable', 'true');
      url.searchParams.set('videoSyndicated', 'true');
      url.searchParams.set('videoCategoryId', '10'); // Music category
      url.searchParams.set('maxResults', '20');
      url.searchParams.set('q', normalized);
      url.searchParams.set('key', apiKey);

      const searchRes = await fetch(url.toString());

      // If Quota Exceeded (HTTP 403 / 429), trigger circuit breaker
      if (searchRes.status === 403 || searchRes.status === 429) {
        this.logger.error(`YouTube API quota limit reached (HTTP ${searchRes.status}). Triggering 1-hour circuit breaker.`);
        await this.redis.set('yt:quota_exceeded', true, CIRCUIT_BREAKER_TTL_SECONDS);
        return this.publicYouTubeSearch(normalized);
      }

      if (!searchRes.ok) {
        return this.publicYouTubeSearch(normalized);
      }

      const searchData = (await searchRes.json()) as {
        error?: { code: number; message: string };
        items?: Array<{
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
          };
        }>;
      };

      if (searchData.error?.code === 403) {
        await this.redis.set('yt:quota_exceeded', true, CIRCUIT_BREAKER_TTL_SECONDS);
        return this.publicYouTubeSearch(normalized);
      }

      const videoIds = searchData.items?.map((i) => i.id?.videoId).filter(Boolean) ?? [];
      if (videoIds.length === 0) {
        return this.publicYouTubeSearch(normalized);
      }


      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('part', 'contentDetails,snippet,status');
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
              thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
            };
            contentDetails: { duration: string };
            status?: { embeddable?: boolean };
          }>;
        })
        : { items: [] };

      const results: Array<SearchResult & { rank: number }> = [];

      for (const item of detailsData.items ?? []) {
        if (item.status && item.status.embeddable === false) continue;
        const title = item.snippet.title;
        if (this.shouldIgnore(title)) continue;

        results.push({
          videoId: item.id,
          title,
          artist: item.snippet.channelTitle,
          thumbnail:
            item.snippet.thumbnails.high?.url ??
            item.snippet.thumbnails.medium?.url ??
            `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          duration: this.parseIsoDuration(item.contentDetails.duration),
          rank: this.rankResult(title, item.snippet.channelTitle),
        });
      }

      results.sort((a, b) => b.rank - a.rank);
      const finalResults = results.map(({ rank: _, ...rest }) => rest);

      if (finalResults.length > 0) {
        await this.redis.set(this.searchKey(normalized), finalResults, SEARCH_CACHE_TTL_SECONDS);
        return finalResults;
      }

      return this.publicYouTubeSearch(normalized);
    } catch (err) {
      this.logger.error(`YouTube API fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return this.publicYouTubeSearch(normalized);
    }
  }

  private async publicYouTubeSearch(query: string): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) {
        return this.staticFallback(query);
      }

      const html = await res.text();
      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        html.match(/window\["ytInitialData"\] = ({.*?});/s);

      if (!match) {
        return this.staticFallback(query);
      }

      const data = JSON.parse(match[1]);
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
          ?.itemSectionRenderer?.contents;

      if (!Array.isArray(contents)) {
        return this.staticFallback(query);
      }

      const results: SearchResult[] = [];

      for (const item of contents) {
        const video = item.videoRenderer;
        if (!video || !video.videoId) continue;

        const title = video.title?.runs?.[0]?.text ?? '';
        if (this.shouldIgnore(title)) continue;

        const artist = video.ownerText?.runs?.[0]?.text ?? 'Unknown Artist';
        const durationStr = video.lengthText?.simpleText ?? '';
        const thumbnail =
          video.thumbnail?.thumbnails?.[0]?.url ??
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

        results.push({
          videoId: video.videoId,
          title,
          artist,
          thumbnail,
          duration: this.parseSimpleDuration(durationStr),
        });

        if (results.length >= 15) break;
      }

      if (results.length > 0) {
        await this.redis.set(this.searchKey(query), results, SEARCH_CACHE_TTL_SECONDS);
        return results;
      }

      return this.staticFallback(query);
    } catch (err) {
      this.logger.error(`Public YouTube search parsing error: ${err instanceof Error ? err.message : String(err)}`);
      return this.staticFallback(query);
    }
  }

  private staticFallback(query: string): SearchResult[] {
    return [
      {
        videoId: 'jfKfPfyJRdk',
        title: `${query} (Radio Stream)`,
        artist: 'Lofi Girl',
        thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        duration: 240,
      },
      {
        videoId: '5qap5aO4i9A',
        title: `${query} (Chillhop Music)`,
        artist: 'Chillhop Music',
        thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
        duration: 210,
      },
    ];
  }
}
