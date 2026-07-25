import { Injectable } from '@nestjs/common';
import { Member, ROOM_TTL_SECONDS } from '@syncroom/shared';
import { RedisService } from '../redis/redis.service';

interface PresenceEntry {
  memberId: string;
  lastSeen: number;
}

@Injectable()
export class PresenceService {
  constructor(private readonly redis: RedisService) {}

  private presenceKey(code: string) {
    return `presence:${code.toUpperCase()}`;
  }

  async getPresence(code: string): Promise<PresenceEntry[]> {
    return (await this.redis.get<PresenceEntry[]>(this.presenceKey(code))) ?? [];
  }

  async heartbeat(code: string, memberId: string): Promise<void> {
    const entries = await this.getPresence(code);
    const index = entries.findIndex((e) => e.memberId === memberId);
    const entry: PresenceEntry = { memberId, lastSeen: Date.now() };

    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }

    await this.redis.set(this.presenceKey(code), entries, ROOM_TTL_SECONDS);
  }

  async removeMember(code: string, memberId: string): Promise<void> {
    const entries = await this.getPresence(code);
    const filtered = entries.filter((e) => e.memberId !== memberId);
    if (filtered.length === 0) {
      await this.redis.del(this.presenceKey(code));
    } else {
      await this.redis.set(this.presenceKey(code), filtered, ROOM_TTL_SECONDS);
    }
  }

  async getStaleMembers(code: string): Promise<string[]> {
    const entries = await this.getPresence(code);
    const threshold = Date.now() - 30_000 * 2;
    return entries.filter((e) => e.lastSeen < threshold).map((e) => e.memberId);
  }

  async registerMember(code: string, memberId: string): Promise<void> {
    await this.heartbeat(code, memberId);
  }
}
