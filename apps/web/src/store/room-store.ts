import { create } from 'zustand';
import type {
  Member,
  PlaybackState,
  QueueItem,
  Room,
} from '@syncroom/shared';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@syncroom/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface RoomEvent {
  id: string;
  type: 'join' | 'leave' | 'queue-add' | 'shuffle' | 'repeat';
  text: string;
  timestamp: number;
}

interface RoomStore {
  socket: AppSocket | null;
  connected: boolean;
  room: Room | null;
  memberId: string | null;
  memberName: string | null;
  queue: QueueItem[];
  currentIndex: number;
  playback: PlaybackState | null;
  searchOpen: boolean;
  events: RoomEvent[];
  initialized: boolean;
  clockOffset: number;
  getPositionMs: (() => number) | null;

  setSocket: (socket: AppSocket | null) => void;
  setConnected: (connected: boolean) => void;
  setRoomState: (data: {
    room: Room;
    queue: QueueItem[];
    currentIndex: number;
  }) => void;
  setMember: (memberId: string, memberName: string) => void;
  setPlayback: (playback: PlaybackState) => void;
  setQueue: (queue: QueueItem[], currentIndex: number) => void;
  addQueueItemOptimistic: (item: Omit<QueueItem, 'id' | 'addedAt'>) => void;
  addMember: (member: Member) => void;
  removeMember: (memberId: string) => void;
  setHost: (hostId: string, member: Member) => void;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setInitialized: (initialized: boolean) => void;
  addEvent: (event: Omit<RoomEvent, 'id' | 'timestamp'>) => void;
  setClockOffset: (offset: number) => void;
  setGetPositionMs: (fn: (() => number) | null) => void;
  reset: () => void;
}

const initialState = {
  socket: null,
  connected: false,
  room: null,
  memberId: null,
  memberName: null,
  queue: [],
  currentIndex: -1,
  playback: null,
  searchOpen: false,
  searchQuery: '',
  events: [] as RoomEvent[],
  initialized: false,
  clockOffset: 0,
  getPositionMs: null,
};

export const useRoomStore = create<RoomStore>((set, get) => ({
  ...initialState,

  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),

  setRoomState: ({ room, queue, currentIndex }) =>
    set({
      room,
      queue,
      currentIndex,
      playback: room.playback,
    }),

  setMember: (memberId, memberName) => set({ memberId, memberName }),

  setPlayback: (playback) =>
    set((state) => ({
      playback,
      room: state.room ? { ...state.room, playback } : null,
    })),

  setQueue: (queue, currentIndex) => set({ queue, currentIndex }),

  addQueueItemOptimistic: (item) =>
    set((state) => {
      if (state.queue.some((i) => i.videoId === item.videoId)) {
        return state;
      }
      const newItem: QueueItem = {
        ...item,
        id: `optimistic-${Date.now()}`,
        addedAt: Date.now(),
      };
      return {
        queue: [...state.queue, newItem],
        currentIndex: state.currentIndex === -1 ? 0 : state.currentIndex,
      };
    }),

  addMember: (member) =>
    set((state) => {
      if (!state.room) return state;
      if (state.room.members.some((m) => m.id === member.id)) return state;
      return {
        room: { ...state.room, members: [...state.room.members, member] },
      };
    }),

  removeMember: (memberId) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          members: state.room.members.filter((m) => m.id !== memberId),
        },
      };
    }),

  setHost: (hostId, member) =>
    set((state) => {
      if (!state.room) return state;
      return {
        room: {
          ...state.room,
          hostId,
          members: state.room.members.map((m) => ({
            ...m,
            isHost: m.id === hostId,
          })),
        },
      };
    }),

  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setInitialized: (initialized) => set({ initialized }),
  addEvent: (event) =>
    set((state) => {
      const newEvent: RoomEvent = {
        ...event,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      };
      return {
        events: [newEvent, ...state.events].slice(0, 10),
      };
    }),
  setClockOffset: (clockOffset) => set({ clockOffset }),
  setGetPositionMs: (getPositionMs) => set({ getPositionMs }),

  reset: () => set(initialState),
}));

export function useIsHost() {
  const room = useRoomStore((s) => s.room);
  const memberId = useRoomStore((s) => s.memberId);
  return room?.hostId === memberId;
}
