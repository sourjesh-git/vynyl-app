import type { Member, PlaybackState, Room } from './room-types';
import type { QueueItem } from './queue-types';
import type { SearchResult } from './search-types';

// Client -> Server
export interface ClientToServerEvents {
  'create-room': (
    data: { name: string },
    callback: (response: CreateRoomAck) => void,
  ) => void;
  'join-room': (
    data: { code: string; name: string; memberId?: string },
    callback: (response: JoinRoomAck) => void,
  ) => void;
  'leave-room': (data: { code: string }) => void;
  'load-track': (data: { code: string; item: QueueItem }) => void;
  play: (data: { code: string; positionMs?: number }) => void;
  pause: (data: { code: string; positionMs?: number }) => void;
  seek: (data: { code: string; positionMs: number }) => void;
  'next-track': (data: { code: string }) => void;
  'playback-prev': (data: { code: string }) => void;
  'queue-add': (data: { code: string; item: Omit<QueueItem, 'id' | 'addedAt'> }) => void;
  'queue-remove': (data: { code: string; itemId: string }) => void;
  'queue-reorder': (data: { code: string; fromIndex: number; toIndex: number }) => void;
  heartbeat: (data: { code: string; memberId: string; positionMs?: number }) => void;
}

// Server -> Client
export interface ServerToClientEvents {
  'member-joined': (data: { member: Member }) => void;
  'member-left': (data: { memberId: string }) => void;
  'host-changed': (data: { hostId: string; member: Member }) => void;
  'playback-updated': (data: { playback: PlaybackState }) => void;
  'queue-updated': (data: { items: QueueItem[]; currentIndex: number }) => void;
  'room-state': (data: { room: Room; queue: QueueItem[]; currentIndex: number }) => void;
  sync: (data: { positionMs: number; playing: boolean; startedAt: number | null }) => void;
  error: (data: { message: string }) => void;
}

export interface CreateRoomAck {
  success: boolean;
  code?: string;
  room?: Room;
  memberId?: string;
  memberName?: string;
  queue?: QueueItem[];
  currentIndex?: number;
  error?: string;
}

export interface JoinRoomAck {
  success: boolean;
  room?: Room;
  memberId?: string;
  memberName?: string;
  queue?: QueueItem[];
  currentIndex?: number;
  error?: string;
}

export type SearchResponse = { results: SearchResult[] };
