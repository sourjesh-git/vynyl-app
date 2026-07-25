'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SYNC_DRIFT_THRESHOLD_MS } from '@syncroom/shared';
import { useRoomStore, useIsHost } from '@/store/room-store';
import { useSyncHeartbeat } from '@/hooks/use-socket';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  loadVideoById: (videoId: string) => void;
  destroy: () => void;
}

declare namespace YT {
  class Player {
    constructor(elementId: string, config: Record<string, unknown>);
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getPlayerState: () => number;
    loadVideoById: (videoId: string) => void;
    destroy: () => void;
  }
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

let apiLoaded = false;
let apiLoading = false;
const loadCallbacks: Array<() => void> = [];

function loadYouTubeAPI(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    loadCallbacks.push(resolve);
    if (apiLoading) return;
    apiLoading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
  });
}

export function useYouTubePlayer(containerId: string) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const playback = useRoomStore((s) => s.playback);
  const room = useRoomStore((s) => s.room);
  const socket = useRoomStore((s) => s.socket);
  const isHost = useIsHost();
  const lastVideoRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const getPositionMs = useCallback(() => {
    if (!playerRef.current) return 0;
    return Math.floor(playerRef.current.getCurrentTime() * 1000);
  }, []);

  useSyncHeartbeat(getPositionMs);

  useEffect(() => {
    let mounted = true;
    loadYouTubeAPI().then(() => {
      if (!mounted) return;
      playerRef.current = new window.YT.Player(containerId, {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (event: { data: number }) => {
            if (!isHost || !room?.code || syncingRef.current) return;
            if (event.data === YT.PlayerState.ENDED) {
              socket?.emit('next-track', { code: room.code });
            }
          },
        },
      }) as unknown as YTPlayer;
    });

    return () => {
      mounted = false;
      playerRef.current?.destroy();
    };
  }, [containerId, isHost, room?.code, socket]);

  useEffect(() => {
    if (!ready || !playerRef.current || !playback?.videoId) return;
    if (lastVideoRef.current !== playback.videoId) {
      syncingRef.current = true;
      playerRef.current.loadVideoById(playback.videoId);
      lastVideoRef.current = playback.videoId;
      setTimeout(() => {
        syncingRef.current = false;
      }, 1000);
    }
  }, [ready, playback?.videoId]);

  useEffect(() => {
    if (!ready || !playerRef.current || !playback) return;

    syncingRef.current = true;
    
    let posMs = playback.positionMs;
    if (playback.playing && playback.startedAt) {
      posMs += (Date.now() - playback.startedAt);
    }
    const posSec = posMs / 1000;

    if (playback.playing) {
      playerRef.current.seekTo(posSec, true);
      playerRef.current.playVideo();
    } else {
      playerRef.current.seekTo(posSec, true);
      playerRef.current.pauseVideo();
    }

    setTimeout(() => {
      syncingRef.current = false;
    }, 300);
  }, [ready, playback?.playing, playback?.positionMs, playback?.startedAt]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!playerRef.current || isHost) return;
      const detail = (event as CustomEvent).detail as {
        positionMs: number;
        playing: boolean;
      };
      const currentMs = playerRef.current.getCurrentTime() * 1000;
      const drift = Math.abs(currentMs - detail.positionMs);

      if (drift > SYNC_DRIFT_THRESHOLD_MS) {
        syncingRef.current = true;
        playerRef.current.seekTo(detail.positionMs / 1000, true);
        if (detail.playing) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
        setTimeout(() => {
          syncingRef.current = false;
        }, 300);
      } else if (detail.playing && playerRef.current.getPlayerState() !== YT.PlayerState.PLAYING) {
        playerRef.current.playVideo();
      } else if (!detail.playing && playerRef.current.getPlayerState() === YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      }
    };

    window.addEventListener('syncroom:sync', handler);
    return () => window.removeEventListener('syncroom:sync', handler);
  }, [isHost, ready]);

  const play = useCallback(() => {
    if (!isHost || !room?.code || !playerRef.current) return;
    socket?.emit('play', {
      code: room.code,
      positionMs: getPositionMs(),
    });
  }, [isHost, room?.code, socket, getPositionMs]);

  const pause = useCallback(() => {
    if (!isHost || !room?.code || !playerRef.current) return;
    socket?.emit('pause', {
      code: room.code,
      positionMs: getPositionMs(),
    });
  }, [isHost, room?.code, socket, getPositionMs]);

  const seek = useCallback(
    (positionMs: number) => {
      if (!isHost || !room?.code) return;
      socket?.emit('seek', { code: room.code, positionMs });
    },
    [isHost, room?.code, socket],
  );

  const skip = useCallback(() => {
    if (!isHost || !room?.code) return;
    socket?.emit('next-track', { code: room.code });
  }, [isHost, room?.code, socket]);

  return { ready, play, pause, seek, skip, getPositionMs, playerRef };
}
