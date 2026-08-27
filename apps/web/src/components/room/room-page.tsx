'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlayerSection } from '@/components/room/player-section';
import { SearchSection } from '@/components/room/search-section';
import { QueueSection } from '@/components/room/queue-section';
import { MembersSection } from '@/components/room/members-section';
import { Avatar } from '@/components/avatar';
import { useRoomStore } from '@/store/room-store';
import { useSocket } from '@/hooks/use-socket';
import { useDynamicTitle } from '@/hooks/use-dynamic-title';
import { apiFetch } from '@/lib/api';
import { generateGuestName } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { JoinRoomResponse } from '@syncroom/shared';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sun,
  Moon,
  Music,
  Users,
  ListMusic,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

export function RoomPage({ code }: { code: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinedRef = useRef(false);
  const { room, memberId, setMember, setRoomState, searchQuery, setSearchQuery, connected } =
    useRoomStore();

  useSocket();
  useDynamicTitle();

  // Mobile layout active tab state
  const [activeTab, setActiveTab] = useState<'player' | 'queue' | 'members' | 'search'>('player');
  const [isDarkMode, setIsDarkMode] = useState(false); // default to clean light mode styles matching screenshot
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (joinedRef.current || (room?.code === code.toUpperCase() && memberId)) return;

    const join = async () => {
      joinedRef.current = true;
      const roomCodeUpper = code.toUpperCase();
      const storageKey = `vynyl_room_${roomCodeUpper}`;

      let existingMemberId = searchParams.get('memberId');
      let name = searchParams.get('name');

      if (!existingMemberId) {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            existingMemberId = parsed.memberId;
            if (!name) {
              name = parsed.name;
            }
          }
        } catch (e) {
          console.error('Failed to load credentials from localStorage', e);
        }
      }

      if (!name) {
        name = generateGuestName();
      }

      const socket = useRoomStore.getState().socket;

      const applyJoin = (response: {
        room: JoinRoomResponse['room'];
        memberId: string;
        memberName: string;
        queue?: JoinRoomResponse['queue'];
        currentIndex?: number;
      }) => {
        if (!response.room) return;
        setMember(response.memberId, response.memberName);
        setRoomState({
          room: response.room,
          queue: response.queue ?? [],
          currentIndex: response.currentIndex ?? -1,
        });

        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ memberId: response.memberId, name: response.memberName })
          );
        } catch (e) {
          console.error('Failed to save credentials to localStorage', e);
        }

        toast({
          title: 'Welcome to the room!',
          description: `Joined room ${response.room.code} as ${response.memberName}.`,
        });
      };

      if (existingMemberId && socket?.connected) {
        socket.emit('join-room', { code, name, memberId: existingMemberId }, (response) => {
          if (response.success && response.room && response.memberId) {
            applyJoin({
              room: response.room,
              memberId: response.memberId,
              memberName: response.memberName ?? name ?? '',
              queue: response.queue,
              currentIndex: response.currentIndex,
            });
          }
        });
        return;
      }

      const trySocketJoin = () =>
        new Promise<boolean>((resolve) => {
          if (!socket?.connected) {
            resolve(false);
            return;
          }
          socket.emit('join-room', { code, name, memberId: existingMemberId ?? undefined }, (response) => {
            if (response.success && response.room && response.memberId) {
              applyJoin({
                room: response.room,
                memberId: response.memberId,
                memberName: response.memberName ?? name,
                queue: response.queue,
                currentIndex: response.currentIndex,
              });
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });

      const socketOk = await trySocketJoin();
      if (socketOk) return;

      try {
        const result = await apiFetch<JoinRoomResponse & { queue: JoinRoomResponse['queue']; currentIndex: number }>(
          `/rooms/${code}/join`,
          {
            method: 'POST',
            body: JSON.stringify({ name, memberId: existingMemberId ?? undefined }),
          },
        );
        applyJoin(result);

        if (socket?.connected) {
          socket.emit('join-room', { code, name, memberId: result.memberId }, () => { });
        }
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : '';
        const isNetworkError = errMessage.toLowerCase().includes('failed to fetch') || errMessage.toLowerCase().includes('networkerror');
        
        toast({
          title: isNetworkError ? 'Connection Error' : 'Room not found',
          description: isNetworkError
            ? 'Could not connect to the server. It may be spinning up (Render free tier can take up to 60 seconds to wake up).'
            : 'This room may have expired.',
          variant: 'destructive',
        });
        
        if (!isNetworkError) {
          router.push('/');
        }
      }
    };

    join();
  }, [code, room?.code, memberId, searchParams, setMember, setRoomState, router]);

  // Keyboard shortcut listener to focus search bar when typing "/" and Escape to blur/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && isSearchFocused) {
        setIsSearchFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused]);

  // Listen for space key to play/pause when focus is body
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('syncroom:toggle-play'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!room || room.code !== code.toUpperCase() || !memberId) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F6F3EE] text-[#1B1B1B] font-satoshi">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          {/* Custom Groove record spiral logo */}
          <div className="relative h-10 w-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-charcoal/20 flex items-center justify-center animate-spin-slow">
              <div className="h-7 w-7 rounded-full border border-charcoal/30 flex items-center justify-center">
                <div className="h-4.5 w-4.5 rounded-full border border-charcoal/45 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 bg-charcoal rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[#1B1B1B]/60 text-xs tracking-widest font-bold uppercase animate-pulse-slow">
            Connecting and joining room...
          </p>
        </div>
      </div>
    );
  }

  const currentUser = room.members.find((m) => m.id === memberId);

  return (
    <div className="relative min-h-screen text-[#1B1B1B] overflow-hidden font-satoshi select-none flex flex-col lg:flex-row">
      {/* 1. Page split backgrounds */}
      <div className="fixed inset-y-0 left-0 lg:w-64 xl:w-72 bg-[#EBE1D6] -z-30 hidden lg:block border-r border-[#1B1B1B]/5" />
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 xl:left-72 -z-30 pointer-events-none" />

      {/* 2. Soft blurred scandinavian record player bg overlay matching landing page */}
      <div
        className="fixed inset-0 -z-20 transition-all duration-1000 ease-in-out scale-105 pointer-events-none"
        style={{
          backgroundImage: 'url(/webpage_hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'right 65% center',
          filter: 'blur(40px)',
        }}
      />
      <div className="fixed inset-0 -z-15 bg-[#F6F3EE]/78 pointer-events-none" />

      {/* ========================================================================= */}
      {/* DESKTOP LAYOUT (Screen size >= md) */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-1 w-full min-h-screen overflow-hidden">
        {/* LEFT COLUMN: Sidebar (Vynyl Brand, Code copy, Members, Invite) */}
        <aside className="lg:w-64 xl:w-72 shrink-0">
          <MembersSection />
        </aside>

        {/* RIGHT MAIN AREA: Core content + Header + Queue side column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Page Dimming Overlay */}
          <AnimatePresence>
            {isSearchFocused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-[#000000]/25 backdrop-blur-[2px] z-40"
                onClick={() => {
                  setIsSearchFocused(false);
                  inputRef.current?.blur();
                }}
              />
            )}
          </AnimatePresence>

          {/* Top Bar Header (Search, Theme switcher, Profile details) */}
          <header className={`flex items-center justify-between px-8 py-5 shrink-0 transition-all duration-200 ${isSearchFocused ? 'z-50 relative' : 'z-40 relative'}`}>
            {/* Global Search Input */}
            <div className="relative w-[450px] max-w-full z-50">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1B1B1B]/75" />
              <input
                ref={inputRef}
                id="search-input"
                type="text"
                placeholder="Search for songs, artists, albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-10 pr-12 py-2.5 rounded-full bg-white/45 border border-black/5 text-sm text-[#1B1B1B] placeholder-[#1B1B1B]/70 focus:outline-none focus:border-[#E07A5F] transition-all font-satoshi shadow-[0_2px_12px_rgba(0,0,0,0.02)] font-medium"
              />
              {!searchQuery && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-md border border-[#1B1B1B]/15 bg-[#1B1B1B]/5 text-xs text-[#1B1B1B]/60 select-none pointer-events-none font-satoshi">
                  /
                </div>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1B1B1B]/60 hover:text-[#1B1B1B]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Absolute Autocomplete Search Results Dropdown */}
              <AnimatePresence>
                {isSearchFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: -12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -12, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full left-0 w-full mt-2 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/30 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] max-h-[380px] overflow-y-auto z-50 flex flex-col gap-3 text-[#1B1B1B]"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-black/5">
                      <span className="text-[10px] font-bold text-[#1B1B1B]/55 tracking-wider uppercase font-satoshi">
                        Search Results
                      </span>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchFocused(false);
                          inputRef.current?.blur();
                        }}
                        className="text-[#1B1B1B]/50 hover:text-[#1B1B1B] p-0.5 rounded-lg hover:bg-black/5 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <SearchSection />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile area & theme toggle */}
            <div className={`flex items-center gap-5 transition-opacity duration-200 ${isSearchFocused ? 'opacity-30 pointer-events-none' : ''}`}>
              {/* Network connection badge */}
              <span className="flex items-center gap-1.5 text-xs text-[#1B1B1B]/50 bg-white/40 border border-black/5 rounded-full px-3.5 py-1 font-semibold">
                {connected ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-red-500" />
                    Disconnected
                  </>
                )}
              </span>



              {/* Reusable Avatar component */}
              <Avatar
                userId={memberId}
                name={currentUser?.name || 'User'}
                size="md"
                className="border border-[#1B1B1B]/10 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              />
            </div>
          </header>

          {/* Page body columns (Player + Queue Section) */}
          <div className="flex-1 flex flex-row px-8 pb-8 overflow-hidden">
            {/* Player details takes left side */}
            <div className="flex-1 overflow-y-auto pr-4 flex flex-col justify-center">
              <PlayerSection />
            </div>

            {/* Queue Panel (always visible) */}
            <div className="lg:w-[300px] xl:w-[360px] shrink-0 h-full flex flex-col">
              <QueueSection />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE LAYOUT (Screen size < md) */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col flex-1 w-full min-h-screen pb-20 overflow-hidden">
        {/* Top Header bar */}
        <header className="flex items-center justify-between border-b border-black/5 bg-[#F6F3EE]/80 backdrop-blur-md px-5 py-4 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            {/* Custom Groove record spiral logo */}
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

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#EBE1D6] border border-black/5 text-[#1B1B1B] font-satoshi">
              Code: {room.code}
            </span>
            <Avatar userId={memberId} name={currentUser?.name || 'User'} size="sm" />
          </div>
        </header>

        {/* Content area based on active bottom navbar tab selection */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Always mount PlayerSection so the YouTube iframe is not destroyed when tabs change on mobile/tablet */}
          <div className={activeTab !== 'player' ? 'hidden' : 'space-y-4'}>
            <PlayerSection />
            <QueueSection isMobile={true} />
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'queue' && (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <QueueSection isMobile={true} />
              </motion.div>
            )}

            {activeTab === 'members' && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <MembersSection isMobile={true} />
              </motion.div>
            )}

            {activeTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="h-[calc(100vh-175px)]"
              >
                <SearchSection isMobile={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation tab-controller */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-black/5 bg-[#F6F3EE]/90 backdrop-blur-md flex items-center justify-around px-4 z-40">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-all ${activeTab === 'search' ? 'text-[#E07A5F]' : 'text-[#1B1B1B]/40 hover:text-[#1B1B1B]'
              }`}
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-wider font-satoshi uppercase">Search</span>
          </button>

          <button
            onClick={() => setActiveTab('player')}
            className={`relative flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-xl transition-all ${activeTab === 'player' ? 'text-[#E07A5F]' : 'text-[#1B1B1B]/40 hover:text-[#1B1B1B]'
              }`}
          >
            <Music className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-wider font-satoshi uppercase">Player</span>
            {activeTab === 'player' && (
              <motion.div
                layoutId="activeMobileTabIndicator"
                className="absolute -top-1 w-10 h-0.5 bg-[#E07A5F] rounded-full"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`relative flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-xl transition-all ${activeTab === 'queue' ? 'text-[#E07A5F]' : 'text-[#1B1B1B]/40 hover:text-[#1B1B1B]'
              }`}
          >
            <ListMusic className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-wider font-satoshi uppercase">Queue</span>
            {activeTab === 'queue' && (
              <motion.div
                layoutId="activeMobileTabIndicator"
                className="absolute -top-1 w-10 h-0.5 bg-[#E07A5F] rounded-full"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-all ${activeTab === 'members' ? 'text-[#E07A5F]' : 'text-[#1B1B1B]/40 hover:text-[#1B1B1B]'
              }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-bold tracking-wider font-satoshi uppercase">People</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
