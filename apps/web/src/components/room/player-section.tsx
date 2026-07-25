'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import {
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoomStore, useIsHost } from '@/store/room-store';
import { useYouTubePlayer } from '@/hooks/use-youtube-player';
import { formatDuration } from '@/lib/utils';
import { motion } from 'framer-motion';

const PLAYER_ID = 'syncroom-yt-player';

// Predefined waveform signature Heights
const WAVEFORM_HEIGHTS = [
  14, 18, 26, 34, 30, 22, 16, 24, 38, 52, 44, 34, 26, 18, 14, 18, 26, 34, 42, 38,
  26, 18, 22, 30, 38, 46, 50, 42, 34, 26, 22, 18, 26, 34, 38, 44, 30, 22, 16, 14
];

export function PlayerSection() {
  const playback = useRoomStore((s) => s.playback);
  const room = useRoomStore((s) => s.room);
  const queue = useRoomStore((s) => s.queue);
  const currentIndex = useRoomStore((s) => s.currentIndex);
  const memberId = useRoomStore((s) => s.memberId);
  const isHost = useIsHost();

  const { ready, play, pause, seek, skip, getPositionMs, playerRef } =
    useYouTubePlayer(PLAYER_ID);

  const [progress, setProgress] = useState(0);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Sync state variables
  useEffect(() => {
    if (!playback) return;
    setLocalPlaying(playback.playing);

    const interval = setInterval(() => {
      if (playback.playing && playback.startedAt) {
        const pos = playback.positionMs + (Date.now() - playback.startedAt);
        setProgress(pos / 1000);
      } else {
        setProgress(playback.positionMs / 1000);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [playback]);

  // Sync volume state
  useEffect(() => {
    if (!playerRef.current || !ready) return;
    if (muted) {
      playerRef.current.setVolume(0);
    } else {
      playerRef.current.setVolume(volume);
    }
  }, [volume, muted, ready, playerRef]);

  // Handle Play/Pause trigger
  const togglePlay = () => {
    if (!isHost || !playback) return;
    if (localPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Keyboard spaces & custom event triggers
  useEffect(() => {
    const handleToggle = () => togglePlay();
    window.addEventListener('syncroom:toggle-play', handleToggle);
    return () => window.removeEventListener('syncroom:toggle-play', handleToggle);
  }, [localPlaying, isHost, playback]);

  const handlePrev = () => {
    if (!isHost || !room?.code) return;
    const socket = useRoomStore.getState().socket;
    socket?.emit('playback-prev', { code: room.code });
  };

  if (!playback?.videoId) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-6 min-h-[350px] relative overflow-hidden py-12">
        <Skeleton className="h-52 w-52 rounded-3xl bg-charcoal/5 animate-pulse-slow border border-charcoal/10" />
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-[#1B1B1B]/80 font-canela">Nothing playing yet</h2>
          <p className="text-xs text-[#1B1B1B]/50 max-w-xs font-satoshi leading-relaxed">
            Search for your favorite tracks and add them to the queue to kick off the session.
          </p>
        </div>
        <div id={PLAYER_ID} className="hidden" />
      </div>
    );
  }

  const duration = playback.duration;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Find who added this song
  const adder = room?.members.find((m) => m.id === playback.addedBy);
  const addedByName = adder
    ? adder.id === memberId
      ? 'You'
      : adder.name
    : 'Host';

  return (
    <div className="w-full flex flex-col gap-8 text-[#1B1B1B] font-satoshi py-2">
      {/* Player content (Direct split layout, not inside cards) */}
      <div className="flex flex-col gap-8 md:flex-row items-center md:items-start md:gap-10">
        {/* Album Artwork */}
        <motion.div
          animate={{ scale: localPlaying ? 1.015 : 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative h-[180px] w-[180px] lg:h-[300px] lg:w-[300px] shrink-0 overflow-hidden rounded-3xl bg-black/5 border border-[#1B1B1B]/5 shadow-[0_12px_36px_rgba(0,0,0,0.08)]"
        >
          {playback.thumbnail && (
            <Image
              src={playback.thumbnail}
              alt={playback.title}
              fill
              className="object-cover scale-[1.5]"
              unoptimized
            />
          )}
        </motion.div>

        {/* Player details, seekbar, controls */}
        <div className="flex-1 w-full flex flex-col justify-between min-h-[256px] text-center md:text-left gap-5">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#E07A5F] tracking-widest uppercase">
              Now playing
            </span>
            <h2 className="text-2xl sm:text-3.5xl font-bold tracking-tight text-[#FFFFF0] leading-tight font-canela drop-shadow-sm">
              {playback.title}
            </h2>
            <p className="text-base text-[#FFFFF0] font-semibold font-satoshi">{playback.artist}</p>
            <p className="text-[11px] text-[#FFFFF0] mt-1 font-satoshi font-medium tracking-wide">
              Added by {addedByName}
            </p>
          </div>

          {/* Timeline Waveform seekbar */}
          <div className="space-y-2">
            <div className="relative w-full group py-3">
              {/* Custom Waveform bars */}
              <div className="flex items-center justify-between gap-1 w-full pointer-events-none h-14">
                {WAVEFORM_HEIGHTS.map((h, i) => {
                  const barProgress = i / WAVEFORM_HEIGHTS.length;
                  const isActive = progressPercent / 100 >= barProgress;
                  return (
                    <div
                      key={i}
                      style={{ height: `${h}px` }}
                      className={`w-[3px] rounded-full transition-all duration-300 ${isActive
                        ? 'bg-[#1B1B1B]/50 shadow-[0_0_12px_rgba(224,122,95,0.6)]'
                        : 'bg-[#FFFFF0]/50'
                        }`}
                    />
                  );
                })}
              </div>

              {/* Native range input overlay for seamless seek click interaction */}
              <input
                type="range"
                min={0}
                max={duration}
                value={progress}
                step={0.5}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setProgress(val);
                  if (isHost) {
                    seek(val * 1000);
                  }
                }}
                disabled={!isHost}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
              />
            </div>

            {/* Time labels below waveform */}
            <div className="flex justify-between text-xs font-semibold text-[#1B1B1B]/45 tracking-wider font-satoshi">
              <span>{formatDuration(progress)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls bar (Play/Pause, Prev, Next, Shuffle, Repeat) */}
          <div className="flex items-center justify-center md:justify-start gap-5 pt-1">
            <button
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm ${isHost
                ? 'bg-[#1B1B1B] text-white hover:bg-black'
                : 'bg-[#1B1B1B]/15 text-[#1B1B1B]/40 cursor-not-allowed'
                }`}
              onClick={() => isHost && setShuffle(!shuffle)}
            >
              <Shuffle className="h-4.5 w-4.5 fill-current" />
            </button>

            {/* Previous Button */}
            <button
              onClick={handlePrev}
              disabled={!isHost}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm ${isHost
                ? 'bg-[#1B1B1B] text-white hover:bg-black'
                : 'bg-[#1B1B1B]/15 text-[#1B1B1B]/40 cursor-not-allowed'
                }`}
            >
              <SkipBack className="h-4.5 w-4.5 fill-current" />
            </button>

            {/* Play/Pause Button */}
            <motion.button
              whileHover={isHost ? { scale: 1.04 } : {}}
              whileTap={isHost ? { scale: 0.96 } : {}}
              onClick={togglePlay}
              disabled={!isHost}
              className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-md ${isHost
                ? 'bg-[#1B1B1B] text-white hover:bg-black'
                : 'bg-[#1B1B1B]/15 text-[#1B1B1B]/40 cursor-not-allowed'
                }`}
            >
              {localPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current ml-0.5" />
              )}
            </motion.button>

            {/* Next Button */}
            <button
              onClick={skip}
              disabled={!isHost}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm ${isHost
                ? 'bg-[#1B1B1B] text-white hover:bg-black'
                : 'bg-[#1B1B1B]/15 text-[#1B1B1B]/40 cursor-not-allowed'
                }`}
            >
              <SkipForward className="h-4.5 w-4.5 fill-current" />
            </button>

            {/* Repeat Button */}
            <button
              onClick={() => setRepeat(!repeat)}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm ${repeat
                ? 'bg-[#E07A5F] text-white hover:bg-[#E07A5F]/90'
                : 'bg-[#1B1B1B] text-white hover:bg-black'
                }`}
            >
              <Repeat className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Volume slider at the very bottom */}
      <div className="flex items-center gap-2.5 max-w-[200px] mt-2 group/volume mx-auto md:mx-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[#1B1B1B]/60 hover:text-[#1B1B1B] hover:bg-black/5 rounded-lg shrink-0"
          onClick={() => setMuted(!muted)}
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <div className="relative flex-1 h-6">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#1B1B1B]/15" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#E07A5F] shadow-[0_0_8px_rgba(224,122,95,0.4)]"
            style={{ width: `${muted ? 0 : volume}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => {
              setVolume(parseInt(e.target.value));
              setMuted(false);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <div id={PLAYER_ID} className="hidden" />
    </div>
  );
}
