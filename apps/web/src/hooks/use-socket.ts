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

    socket.on('room-state', (data) => setRoomState(data));
    socket.on('playback-updated', (data) => setPlayback(data.playback));
    socket.on('queue-updated', (data) => setQueue(data.items, data.currentIndex));
    socket.on('member-joined', (data) => addMember(data.member));
    socket.on('member-left', (data) => removeMember(data.memberId));
    socket.on('host-changed', (data) => setHost(data.hostId, data.member));
    socket.on('sync', (data) => {
      window.dispatchEvent(
        new CustomEvent('syncroom:sync', { detail: data }),
      );
    });
    socket.on('error', (data) => {
      toast({ title: 'Error', description: data.message, variant: 'destructive' });
    });

    return () => {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
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
      if (response?.success && response.room) {
        setRoomState({
          room: response.room,
          queue: response.queue ?? [],
          currentIndex: response.currentIndex ?? -1,
        });
      }
    });
  }, [connected, room?.code, memberId, memberName, setRoomState]);

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
