'use client';

import React, { forwardRef } from 'react';

export type PlayedTrack = {
  title: string;
  artist: string;
};

export type SessionSummary = {
  durationMs: number;
  startedAt: Date;
  participants: string[];
  songsPlayed?: number;
  recentTracks?: PlayedTrack[];
};

export function formatParticipants(participants: string[]): string {
  if (!participants || participants.length === 0) {
    return 'All by yourself';
  }
  if (participants.length === 1) {
    return `with ${participants[0]}`;
  }
  if (participants.length === 2) {
    return `with ${participants[0]} and ${participants[1]}`;
  }
  if (participants.length === 3) {
    return `with ${participants[0]}, ${participants[1]} and ${participants[2]}`;
  }
  return `with ${participants[0]}, ${participants[1]} and ${participants.length - 2} others`;
}

export function formatSessionDuration(durationMs: number): string {
  if (durationMs < 60_000) {
    return '< 1 min';
  }
  const totalMinutes = Math.floor(durationMs / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

export function formatSessionDate(date: Date): { dateStr: string; timeStr: string } {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dateStr = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;

  return { dateStr, timeStr };
}

export const SessionCard = forwardRef<HTMLDivElement, { summary: SessionSummary }>(
  ({ summary }, ref) => {
    const durationFormatted = formatSessionDuration(summary.durationMs);
    const participantsFormatted = formatParticipants(summary.participants);
    const { dateStr, timeStr } = formatSessionDate(summary.startedAt);
    const songsCount = summary.songsPlayed ?? 1;

    return (
      <div
        ref={ref}
        style={{
          backgroundColor: '#F6F3EE',
          borderColor: '#EBE1D6',
        }}
        className="w-[340px] sm:w-[380px] aspect-[4/5] rounded-[32px] border p-8 flex flex-col justify-between text-[#1B1B1B] font-satoshi shadow-[0_12px_40px_rgba(0,0,0,0.06)] relative overflow-hidden select-none"
      >
        {/* Subtle decorative background noise gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-[#E07A5F]/5 pointer-events-none" />

        {/* Top Header: Brand Logo & Title */}
        <div className="relative z-10 flex flex-col items-center gap-2 text-center pt-2">
          <div className="flex items-center gap-2.5">
            {/* Concentric circles vinyl record logo */}
            <div className="relative h-7 w-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-charcoal/20 flex items-center justify-center animate-spin-slow">
                <div className="h-5 w-5 rounded-full border border-charcoal/30 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full border border-charcoal/40 flex items-center justify-center">
                    <div className="h-1 w-1 bg-charcoal rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-black font-satoshi lowercase">
              vynyl
            </span>
          </div>

          <span className="text-[10px] font-bold tracking-[0.2em] text-[#E07A5F] uppercase font-satoshi pt-1">
            LISTENED TOGETHER
          </span>
        </div>

        {/* Middle Body: Duration, Participants, Date, Songs List */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-3.5 my-auto py-1">
          {/* Main Duration display */}
          <div className="space-y-0.5">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#1B1B1B] font-canela tracking-tight">
              {durationFormatted}
            </h1>
            <p className="text-sm font-semibold text-[#1B1B1B]/80 font-satoshi">
              {participantsFormatted}
            </p>
          </div>

          {/* Divider line */}
          <div className="w-12 h-[1px] bg-[#1B1B1B]/15 my-0.5" />

          {/* Date & Time */}
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#1B1B1B]/60 font-satoshi">
              {dateStr}
            </p>
            <p className="text-[11px] font-medium text-[#1B1B1B]/40 font-mono">
              {timeStr}
            </p>
          </div>

          {/* Recent Tracks List (Current/Last played + 1-2 previous) */}
          {summary.recentTracks && summary.recentTracks.length > 0 && (
            <div className="w-full space-y-1.5 pt-1 text-left bg-white/70 border border-[#EBE1D6] rounded-2xl p-3 shadow-inner">
              <span className="text-[9px] font-bold tracking-widest text-[#E07A5F] uppercase font-satoshi block pb-0.5">
                TRACKS LISTENED
              </span>
              {summary.recentTracks.map((track, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs truncate">
                  <span className={idx === 0 ? "text-[#E07A5F] font-bold text-[10px]" : "text-[#1B1B1B]/40 text-[10px]"}>
                    {idx === 0 ? '►' : '•'}
                  </span>
                  <div className="truncate min-w-0 flex-1">
                    <span className="font-semibold text-[#1B1B1B] truncate">{track.title}</span>
                    <span className="text-[#1B1B1B]/50 text-[10px] font-satoshi truncate ml-1 font-medium">
                      — {track.artist}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Songs Played Count */}
          <div className="pt-0.5">
            <span className="inline-block px-3 py-1 rounded-full bg-[#1B1B1B]/5 border border-[#1B1B1B]/10 text-xs font-semibold text-[#1B1B1B]/75 font-satoshi">
              {songsCount} {songsCount === 1 ? 'song' : 'songs'} played
            </span>
          </div>
        </div>

        {/* Bottom Footer: App link watermark for social sharing */}
        <div className="relative z-10 flex items-center justify-center pt-2 border-t border-[#1B1B1B]/10">
          <span className="text-[11px] font-bold text-[#1B1B1B]/50 font-satoshi tracking-wider">
            vynyl-web.vercel.app
          </span>
        </div>
      </div>
    );
  }
);

SessionCard.displayName = 'SessionCard';
