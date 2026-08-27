import type { QueueItem } from './queue-types';

export type RepeatMode = 'off' | 'all' | 'one';

export interface Member {
  id: string;
  name: string;
  joinedAt: number;
  isHost: boolean;
}

export interface PlaybackState {
  videoId: string | null;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  playing: boolean;
  positionMs: number;
  startedAt: number | null;
  addedBy: string | null;
  repeatMode?: RepeatMode;
}

export interface Room {
  code: string;
  hostId: string;
  createdAt: number;
  members: Member[];
  playback: PlaybackState;
}

export interface CreateRoomResponse {
  code: string;
  memberId: string;
  memberName: string;
}

export interface JoinRoomResponse {
  room: Room;
  memberId: string;
  memberName: string;
  queue?: QueueItem[];
  currentIndex?: number;
}

export interface AppStatsResponse {
  activeRooms: number;
  activeListeners: number;
}

export const ROOM_TTL_SECONDS = 60 * 60;
export const HOST_DISCONNECT_TIMEOUT_MS = 60_000;
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 30_000;
export const PRESENCE_MISSED_HEARTBEATS = 2;
export const SYNC_HEARTBEAT_INTERVAL_MS = 5_000;
export const SYNC_DRIFT_THRESHOLD_MS = 250;
