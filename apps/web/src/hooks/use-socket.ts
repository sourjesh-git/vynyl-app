'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  SYNC_HEARTBEAT_INTERVAL_MS,
  SYNC_DRIFT_THRESHOLD_MS,
} from '@syncroom/shared';
import { getSocketUrl } from '@/lib/api';
import { useRoomStore, type AppSocket } from '@/store/room-store';
import { toast } from '@/hooks/use-toast';

export function useSocket() {
  const socketRef = useRef<AppSocket | null>(null);
  const pendingLeavesRef = useRef<Map<string, { timeoutId: NodeJS.Timeout; memberName: string }>>(new Map());
  const {
    setSocket,
    setConnected,
    setRoomState,
    setPlayback,
    setQueue,
    addMember,
    removeMember,
    setHost,
    room,
    memberId,
    connected,
    memberName,
    setMember,
  } = useRoomStore();

  useEffect(() => {
    const socket: AppSocket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('room-state', (data) => {
      setRoomState(data);
      useRoomStore.getState().setInitialized(true);
    });
    socket.on('playback-updated', (data) => setPlayback(data.playback));
    socket.on('queue-updated', (data) => {
      const currentQueue = useRoomStore.getState().queue;
      const isInitialized = useRoomStore.getState().initialized;

      if (isInitialized && currentQueue.length > 0) {
        const newItems = data.items.filter((newItem) => {
          const existsInCurrent = currentQueue.some(
            (oldItem) => oldItem.videoId === newItem.videoId && !oldItem.id.startsWith('optimistic-')
          );
          return !existsInCurrent;
        });

        newItems.forEach((item) => {
          const roomState = useRoomStore.getState().room;
          const isHost = roomState?.hostId === item.addedBy;
          const member = roomState?.members.find((m) => m.id === item.addedBy);
          const name = isHost ? 'Host' : (member?.name ?? 'Someone');
          useRoomStore.getState().addEvent({
            type: 'queue-add',
            text: `${name} added ${item.title}`,
          });
        });
      }

      setQueue(data.items, data.currentIndex);
    });
    socket.on('member-joined', (data) => {
      const isRejoining = pendingLeavesRef.current.has(data.member.id);

      if (isRejoining) {
        // Clear pending leave for this rejoining member to cancel the leave event log
        clearTimeout(pendingLeavesRef.current.get(data.member.id)!.timeoutId);
        pendingLeavesRef.current.delete(data.member.id);
      } else {
        const isInitialized = useRoomStore.getState().initialized;
        const roomState = useRoomStore.getState().room;
        const isAlreadyInRoom = roomState?.members.some((m) => m.id === data.member.id);

        if (isInitialized && !isAlreadyInRoom) {
          useRoomStore.getState().addEvent({
            type: 'join',
            text: `${data.member.name} joined`,
          });
        }
      }
      addMember(data.member);

      // Sync new member immediately if I am host
      const state = useRoomStore.getState();
      const isHost = state.room?.hostId === state.memberId;
      if (isHost && socketRef.current && state.getPositionMs) {
        socketRef.current.emit('heartbeat', {
          code: state.room!.code,
          memberId: state.memberId!,
          positionMs: state.getPositionMs(),
        });
      }
    });
    socket.on('member-left', (data) => {
      const isInitialized = useRoomStore.getState().initialized;
      
      if (isInitialized) {
        const member = useRoomStore.getState().room?.members.find((m) => m.id === data.memberId);
        const name = member ? member.name : 'Someone';

        // Clear any existing leave timeout for this member
        if (pendingLeavesRef.current.has(data.memberId)) {
          clearTimeout(pendingLeavesRef.current.get(data.memberId)!.timeoutId);
        }

        // Schedule the leave event to be logged after a 2-second grace period
        const timeoutId = setTimeout(() => {
          useRoomStore.getState().addEvent({
            type: 'leave',
            text: `${name} left`,
          });
          pendingLeavesRef.current.delete(data.memberId);
        }, 2000);

        pendingLeavesRef.current.set(data.memberId, { timeoutId, memberName: name });
      }
      removeMember(data.memberId);
    });
    socket.on('host-changed', (data) => setHost(data.hostId, data.member));
    socket.on('sync', (data) => {
      window.dispatchEvent(
        new CustomEvent('syncroom:sync', { detail: data }),
      );
    });
    socket.on('queue-shuffled', (data) => {
      useRoomStore.getState().addEvent({
        type: 'shuffle',
        text: `${data.memberName} shuffled queue`,
      });
    });
    socket.on('repeat-changed', (data) => {
      const modeLabel =
        data.mode === 'one'
          ? 'Repeat One'
          : data.mode === 'all'
          ? 'Repeat All'
          : 'Repeat Off';
      useRoomStore.getState().addEvent({
        type: 'repeat',
        text: `${data.memberName} set ${modeLabel}`,
      });
    });
    socket.on('error', (data) => {
      toast({ title: 'Error', description: data.message, variant: 'destructive' });
    });
    socket.on('info', (data) => {
      toast({ title: 'Notice', description: data.message });
    });

    return () => {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      // Clean up all pending leave timeouts
      pendingLeavesRef.current.forEach((val) => clearTimeout(val.timeoutId));
      pendingLeavesRef.current.clear();
    };
  }, [
    setSocket,
    setConnected,
    setRoomState,
    setPlayback,
    setQueue,
    addMember,
    removeMember,
    setHost,
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !room?.code || !memberId) return;

    socket.emit('join-room', {
      code: room.code,
      name: memberName ?? 'Guest',
      memberId: memberId,
    }, (response) => {
      if (response?.success && response.room && response.memberId) {
        setMember(response.memberId, response.memberName ?? memberName ?? 'Guest');
        setRoomState({
          room: response.room,
          queue: response.queue ?? [],
          currentIndex: response.currentIndex ?? -1,
        });
        useRoomStore.getState().setInitialized(true);

        try {
          localStorage.setItem(
            `vynyl_room_${room.code.toUpperCase()}`,
            JSON.stringify({ memberId: response.memberId, name: response.memberName ?? memberName })
          );
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, [connected, room?.code, memberId, memberName, setRoomState, setMember]);

  useEffect(() => {
    if (!room?.code || !memberId) return;

    const interval = setInterval(() => {
      socketRef.current?.emit('heartbeat', {
        code: room.code,
        memberId,
      });
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [room?.code, memberId]);

  return socketRef;
}

export function useSyncHeartbeat(getPositionMs: () => number) {
  const room = useRoomStore((s) => s.room);
  const memberId = useRoomStore((s) => s.memberId);
  const isHost = room?.hostId === memberId;

  useEffect(() => {
    if (!isHost || !room?.code || !memberId) return;

    const interval = setInterval(() => {
      useRoomStore.getState().socket?.emit('heartbeat', {
        code: room.code,
        memberId,
        positionMs: getPositionMs(),
      });
    }, SYNC_HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isHost, room?.code, memberId, getPositionMs]);
}

export { SYNC_DRIFT_THRESHOLD_MS };
