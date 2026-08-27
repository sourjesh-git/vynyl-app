import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { QueueItem, QueueState, RepeatMode, ROOM_TTL_SECONDS } from '@syncroom/shared';
import { RedisService } from '../redis/redis.service';

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

@Injectable()
export class QueueService {
  constructor(private readonly redis: RedisService) {}

  private queueKey(code: string) {
    return `queue:${code.toUpperCase()}`;
  }

  async getQueue(code: string): Promise<QueueState> {
    const state = await this.redis.get<QueueState>(this.queueKey(code));
    return state ?? { currentIndex: -1, items: [] };
  }

  async saveQueue(code: string, state: QueueState): Promise<void> {
    await this.redis.set(this.queueKey(code), state, ROOM_TTL_SECONDS);
  }

  async addItem(
    code: string,
    item: Omit<QueueItem, 'id' | 'addedAt'>,
  ): Promise<QueueState> {
    const state = await this.getQueue(code);
    const newItem: QueueItem = {
      ...item,
      id: generateId(),
      addedAt: Date.now(),
    };
    state.items.push(newItem);
    if (state.currentIndex === -1) {
      state.currentIndex = state.items.length - 1;
    }
    await this.saveQueue(code, state);
    return state;
  }

  async removeItem(code: string, itemId: string): Promise<QueueState> {
    const state = await this.getQueue(code);
    const index = state.items.findIndex((i) => i.id === itemId);
    if (index === -1) return state;

    state.items.splice(index, 1);
    if (state.currentIndex >= state.items.length) {
      state.currentIndex = state.items.length - 1;
    }
    if (state.items.length === 0) {
      state.currentIndex = -1;
    } else if (index < state.currentIndex) {
      state.currentIndex -= 1;
    }
    await this.saveQueue(code, state);
    return state;
  }

  async reorderItem(
    code: string,
    fromIndex: number,
    toIndex: number,
  ): Promise<QueueState> {
    const state = await this.getQueue(code);
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= state.items.length ||
      toIndex >= state.items.length
    ) {
      return state;
    }

    const [item] = state.items.splice(fromIndex, 1);
    state.items.splice(toIndex, 0, item);

    if (state.currentIndex === fromIndex) {
      state.currentIndex = toIndex;
    } else if (fromIndex < state.currentIndex && toIndex >= state.currentIndex) {
      state.currentIndex -= 1;
    } else if (fromIndex > state.currentIndex && toIndex <= state.currentIndex) {
      state.currentIndex += 1;
    }

    await this.saveQueue(code, state);
    return state;
  }

  async shuffleQueue(code: string): Promise<QueueState> {
    const state = await this.getQueue(code);
    if (state.items.length <= 1) return state;

    const currentIdx = state.currentIndex >= 0 ? state.currentIndex : 0;
    const pastItems = state.items.slice(0, currentIdx + 1);
    const upcomingItems = state.items.slice(currentIdx + 1);

    // Fisher-Yates Shuffle on upcoming tracks
    for (let i = upcomingItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [upcomingItems[i], upcomingItems[j]] = [upcomingItems[j], upcomingItems[i]];
    }

    state.items = [...pastItems, ...upcomingItems];
    await this.saveQueue(code, state);
    return state;
  }

  getCurrentItem(state: QueueState): QueueItem | null {
    if (state.currentIndex < 0 || state.currentIndex >= state.items.length) {
      return null;
    }
    return state.items[state.currentIndex];
  }

  async advanceQueue(
    code: string,
    repeatMode: RepeatMode = 'off',
  ): Promise<{ state: QueueState; item: QueueItem | null }> {
    const state = await this.getQueue(code);
    if (state.items.length === 0) {
      return { state, item: null };
    }

    if (repeatMode === 'one') {
      // Keep current index, replay track
      if (state.currentIndex < 0) state.currentIndex = 0;
    } else if (repeatMode === 'all') {
      // Loop back to start if at end
      if (state.currentIndex < state.items.length - 1) {
        state.currentIndex += 1;
      } else {
        state.currentIndex = 0;
      }
    } else {
      // 'off': Stop when queue ends
      if (state.currentIndex < state.items.length - 1) {
        state.currentIndex += 1;
      } else {
        state.currentIndex = -1;
      }
    }

    await this.saveQueue(code, state);
    const item = this.getCurrentItem(state);
    return { state, item };
  }

  async regressQueue(code: string): Promise<{ state: QueueState; item: QueueItem | null }> {
    const state = await this.getQueue(code);
    if (state.items.length === 0) {
      return { state, item: null };
    }

    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
    } else {
      state.currentIndex = 0;
    }

    await this.saveQueue(code, state);
    const item = this.getCurrentItem(state);
    return { state, item };
  }

  async setCurrentFromItem(code: string, item: QueueItem): Promise<QueueState> {
    const state = await this.getQueue(code);
    const existingIndex = state.items.findIndex((i) => i.id === item.id);
    if (existingIndex >= 0) {
      state.currentIndex = existingIndex;
    } else {
      state.items.unshift(item);
      state.currentIndex = 0;
    }
    await this.saveQueue(code, state);
    return state;
  }
}
