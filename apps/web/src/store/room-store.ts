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

  reset: () => set(initialState),
}));

export function useIsHost() {
  const room = useRoomStore((s) => s.room);
  const memberId = useRoomStore((s) => s.memberId);
  return room?.hostId === memberId;
}
