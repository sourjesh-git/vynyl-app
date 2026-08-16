'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Zap, Globe, Lock, Loader2, ArrowUpRight, Check, CornerDownLeft, Sparkles, Github, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { generateGuestName } from '@/lib/utils';
import { useRoomStore } from '@/store/room-store';
import { useSocket } from '@/hooks/use-socket';
import { toast } from '@/hooks/use-toast';
import type { CreateRoomResponse } from '@syncroom/shared';
import { motion, AnimatePresence } from 'framer-motion';

export function LandingHero() {
  const router = useRouter();
  const [actionType, setActionType] = useState<'create' | 'join' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setMember, setRoomState } = useRoomStore();

  useSocket();

  const getDisplayName = () => name.trim() || generateGuestName();

  const handleCreateRoom = async () => {
    setLoading(true);
    const displayName = getDisplayName();
    try {
      const restResult = await apiFetch<CreateRoomResponse>('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: displayName }),
      });

      const socket = useRoomStore.getState().socket;
      if (!socket?.connected) {
        router.push(
          `/room/${restResult.code}?memberId=${restResult.memberId}&name=${encodeURIComponent(
            restResult.memberName
          )}`
        );
        return;
      }

      socket.emit('create-room', { name: displayName }, (response) => {
        if (response.success && response.room && response.memberId) {
          setMember(response.memberId, response.memberName ?? displayName);
          setRoomState({
            room: response.room,
            queue: response.queue ?? [],
            currentIndex: response.currentIndex ?? -1,
          });

          try {
            localStorage.setItem(
              `vynyl_room_${response.room.code.toUpperCase()}`,
              JSON.stringify({ memberId: response.memberId, name: response.memberName ?? displayName })
            );
          } catch (e) {
            console.error(e);
          }

          router.push(`/room/${response.room.code}`);
        } else {
          router.push(
            `/room/${restResult.code}?memberId=${restResult.memberId}&name=${encodeURIComponent(
              restResult.memberName
            )}`
          );
        }
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : '';
      const isNetworkError = errMessage.toLowerCase().includes('failed to fetch') || errMessage.toLowerCase().includes('networkerror');
      toast({
        title: isNetworkError ? 'Server Spin-up In Progress' : 'Failed to create room',
        description: isNetworkError
          ? 'The server is waking up (Render free tier can take up to 60 seconds to spin up). Please wait a moment and try again.'
          : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    const displayName = getDisplayName();

    if (code.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Room codes must be exactly 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const socket = useRoomStore.getState().socket;
      if (!socket?.connected) {
        router.push(`/room/${code}?name=${encodeURIComponent(displayName)}`);
        return;
      }

      socket.emit('join-room', { code, name: displayName }, (response) => {
        if (response.success && response.room && response.memberId) {
          setMember(response.memberId, response.memberName ?? displayName);
          setRoomState({
            room: response.room,
            queue: response.queue ?? [],
            currentIndex: response.currentIndex ?? -1,
          });

          try {
            localStorage.setItem(
              `vynyl_room_${response.room.code.toUpperCase()}`,
              JSON.stringify({ memberId: response.memberId, name: response.memberName ?? displayName })
            );
          } catch (e) {
            console.error(e);
          }

          router.push(`/room/${response.room.code}`);
        } else {
          toast({
            title: 'Room not found',
            description: 'Please double-check the code and try again.',
            variant: 'destructive',
          });
        }
        setLoading(false);
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : '';
      const isNetworkError = errMessage.toLowerCase().includes('failed to fetch') || errMessage.toLowerCase().includes('networkerror');
      toast({
        title: isNetworkError ? 'Server Spin-up In Progress' : 'Failed to join',
        description: isNetworkError
          ? 'The server is waking up (Render free tier can take up to 60 seconds to spin up). Please wait a moment and try again.'
          : 'Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6F3EE] text-[#1B1B1B] overflow-x-hidden font-satoshi flex flex-col justify-between">
      {/* 1. Main visual layout container (split view) */}
      <div className="flex-1 flex flex-col lg:flex-row relative min-h-screen">
        {/* Left Column: Headline, Actions, Bottom Panel */}
        <div className="w-full lg:w-[48%] px-6 sm:px-12 lg:pl-16 lg:pr-12 py-10 flex flex-col justify-between min-h-[85vh] lg:min-h-screen z-10">
          {/* Logo / Top Bar */}
          <div className="flex items-center justify-between w-full">
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

            <div className="flex items-center gap-3.5 lg:hidden">
              <span className="rounded-full bg-[#C7D1C0] px-3.5 py-1 text-[11px] font-bold text-[#1B1B1B] tracking-wider uppercase">
                ✦ 100% Free
              </span>
            </div>
          </div>

          {/* Core copy & Interactive Controls */}
          <div className="space-y-5 mt-8 md:mt-12 mb-auto max-w-lg">
            {/* Header text */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1B1B1B] font-canela leading-[1.15]">
                Listen to music,
                <br />
                <span className="relative inline-block mt-1 italic font-normal">
                  together.
                  {/* Underline brush SVG */}
                  <span className="absolute -bottom-2.5 left-0 right-0 h-1.5 bg-[#E07A5F] opacity-75 rounded-full" />
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#1B1B1B]/75 leading-relaxed font-satoshi pt-1">
                Create a room, invite your people, and jam in real time.
              </p>
            </div>

            {/* Action forms container */}
            <div className="pt-1">
              <AnimatePresence mode="wait">
                {actionType === null ? (
                  /* Initial landing view: Create a room / Join a room buttons */
                  <motion.div
                    key="initial"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    {/* Create Room Primary button */}
                    <button
                      onClick={() => setActionType('create')}
                      className="group flex items-center justify-center gap-2 rounded-2xl bg-[#1B1B1B] px-7 py-4 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-[2px] active:scale-98 hover:shadow-lg"
                    >
                      Create a room
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Join Room Secondary button */}
                    <button
                      onClick={() => setActionType('join')}
                      className="group flex items-center justify-center gap-2 rounded-2xl bg-[#EBE1D6] px-7 py-4 text-sm font-semibold text-[#1B1B1B] shadow-sm transition-all duration-200 hover:-translate-y-[2px] active:scale-98 hover:shadow-md hover:bg-[#C7D1C0]"
                    >
                      Join a room
                      <ArrowUpRight className="h-4 w-4 group-hover:translate-y-[-1px] group-hover:translate-x-[1px] transition-transform" />
                    </button>
                  </motion.div>
                ) : (
                  /* Expanded state: Name input + Action actions */
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-3 bg-[#EBE1D6]/40 p-4 rounded-2xl border border-[#EBE1D6] max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.03)]"
                  >
                    <div className="space-y-2.5">
                      {/* 1. Name Input Field */}
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] font-bold text-[#1B1B1B]/50 tracking-wider uppercase pl-1">
                          Your Name
                        </label>
                        <input
                          type="text"
                          placeholder="Your name (optional)"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-white border border-[#EBE1D6] text-sm text-[#1B1B1B] placeholder-[#1B1B1B]/40 focus:outline-none focus:border-[#8FB3A6] transition-all"
                          maxLength={32}
                          autoFocus
                        />
                      </div>

                      {/* 2. Room Code Input (Join Mode only) */}
                      {actionType === 'join' && (
                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-bold text-[#1B1B1B]/50 tracking-wider uppercase pl-1">
                            Room Code
                          </label>
                          <input
                            type="text"
                            placeholder="Enter 6-character code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            className="w-full px-4 py-2 rounded-xl bg-white border border-[#EBE1D6] text-sm text-[#1B1B1B] font-semibold placeholder-[#1B1B1B]/40 tracking-wider uppercase focus:outline-none focus:border-[#8FB3A6] transition-all"
                          />
                        </div>
                      )}
                    </div>

                    {/* Form control action buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        onClick={actionType === 'create' ? handleCreateRoom : handleJoinRoom}
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-xl bg-[#1B1B1B] hover:bg-[#1B1B1B]/90 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-[2px]"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {actionType === 'create' ? 'Create Room' : 'Join Room'}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => {
                          setActionType(null);
                          setJoinCode('');
                        }}
                        disabled={loading}
                        className="py-3.5 px-4 rounded-xl bg-transparent hover:bg-black/5 text-[#1B1B1B]/60 hover:text-[#1B1B1B] font-medium transition-all"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2x2 Grid of Feature Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 mt-6 border-t border-[#1B1B1B]/5">
              {/* Sync item */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/50 flex items-center justify-center border border-white/50">
                  <Zap className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1B1B1B] uppercase">
                    Real-time sync
                  </h4>
                  <p className="text-[10px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                    Everyone hears the exact same moment.
                  </p>
                </div>
              </div>

              {/* Device item */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/50 flex items-center justify-center border border-white/50">
                  <Globe className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1B1B1B] uppercase">
                    Works anywhere
                  </h4>
                  <p className="text-[10px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                    On any device. No installs.
                  </p>
                </div>
              </div>

              {/* Login item */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/50 flex items-center justify-center border border-white/50">
                  <Lock className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1B1B1B] uppercase">
                    No login
                  </h4>
                  <p className="text-[10px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                    Jump in instantly with just a name.
                  </p>
                </div>
              </div>

              {/* Totally Free item */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <div className="h-8 w-8 shrink-0 rounded-lg bg-white/50 flex items-center justify-center border border-white/50">
                  <Sparkles className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold tracking-wider text-[#1B1B1B] uppercase">
                    Totally Free
                  </h4>
                  <p className="text-[10px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                    100% free forever. No ads.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom spacer for layout alignment on desktop */}
          <div className="h-10 hidden lg:block" />
        </div>

        {/* Right Column: Hero Image (hidden on mobile) */}
        <div className="hidden lg:block lg:w-[52%] relative min-h-screen overflow-hidden select-none">
          <img
            src="/webpage_hero.png"
            alt="Warm Scandinavian vinyl record player setup"
            className="absolute inset-0 w-full h-full object-cover object-right select-none scale-102"
          />
          {/* Smooth blend transition gradient on the left edge */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#F6F3EE] via-[#F6F3EE]/60 to-transparent z-10 pointer-events-none" />

          {/* Top-Right Badges overlay inside hero pane */}
          <div className="absolute top-8 right-8 z-10 flex items-center gap-4">
            <span className="rounded-full bg-[#C7D1C0] px-4 py-1 text-[11px] font-bold text-[#1B1B1B] tracking-wider uppercase shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
              ✦ 100% Free
            </span>
            <span className="text-[11px] text-white font-semibold tracking-wide bg-charcoal/45 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10">
              No login required
            </span>
          </div>

          {/* Warm diagonal golden hour light shading mask */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-black/15 pointer-events-none" />
        </div>
      </div>

      {/* 2. Explanation Section (Visible when scrolling below the fold) */}
      <section className="w-full py-16 px-6 sm:px-12 lg:px-16 bg-[#F6F3EE] border-t border-[#1B1B1B]/5 z-10 relative">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Main concise crawlable card */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1B1B1B] font-canela">
              Listen to YouTube together with your friends.
            </h2>
            <p className="text-base sm:text-lg text-[#1B1B1B]/80 font-medium font-satoshi leading-relaxed">
              vynyl is a shared listening room where friends can play music together, build a queue, and listen in sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
            {/* Column 1: What is vynyl & How it works */}
            <div className="space-y-4 text-left">
              <h3 className="text-lg font-bold text-[#E07A5F] font-canela uppercase tracking-wider">
                What is vynyl?
              </h3>
              <p className="text-sm text-[#1B1B1B]/75 leading-relaxed font-satoshi">
                vynyl is a lightweight, login-free social music platform built on top of YouTube's massive library. It allows you to synchronize audio streams across multiple devices. When the host plays, pauses, or seeks a track, every listener hears the exact same moment in real-time.
              </p>
              <h3 className="text-lg font-bold text-[#E07A5F] font-canela uppercase tracking-wider pt-2">
                Learn More
              </h3>
              <p className="text-sm text-[#1B1B1B]/75 leading-relaxed font-satoshi">
                Want to dive deeper into our technology, architecture, and background story? Read the{' '}
                <a
                  href="/about"
                  className="text-[#E07A5F] hover:underline font-bold transition-all"
                >
                  About Vynyl
                </a>{' '}
                page.
              </p>
            </div>

            {/* Column 2: How to use step by step */}
            <div className="space-y-4 text-left">
              <h3 className="text-lg font-bold text-[#E07A5F] font-canela uppercase tracking-wider">
                How to use it
              </h3>
              <ol className="space-y-3.5 text-sm text-[#1B1B1B]/75 font-satoshi">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B1B] text-[10px] font-bold text-white">
                    1
                  </span>
                  <span>
                    <strong>Create a Room:</strong> Enter your name and click the create button on the home page.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B1B] text-[10px] font-bold text-white">
                    2
                  </span>
                  <span>
                    <strong>Invite Friends:</strong> Copy the unique 6-character room code and send it to your group.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B1B] text-[10px] font-bold text-white">
                    3
                  </span>
                  <span>
                    <strong>Search & Queue:</strong> Search for your favorite tracks and load them into the collaborative playlist.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B1B1B] text-[10px] font-bold text-white">
                    4
                  </span>
                  <span>
                    <strong>Listen in Sync:</strong> Sit back and enjoy. Every playback action is instantly mirrored for all members.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Scroll-triggered footer */}
      <LandingFooter />
    </div>
  );
}

function LandingFooter() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <footer
      className={`w-full py-10 px-6 sm:px-12 lg:px-16 border-t border-[#1B1B1B]/10 bg-[#EBE1D6]/70 transition-opacity duration-500 ease-in-out ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 text-[12px] leading-relaxed text-[#1B1B1B]/70 font-satoshi">
        <div className="max-w-xl space-y-3">
          <p>
            Audio is streamed through YouTube’s embedded player; all rights remain with the respective labels, composers and performers. Nothing is hosted here. Song credits are compiled from film soundtrack listings.
          </p>
          <p className="font-semibold text-[#1B1B1B]">
            Hold rights to something here and want it removed? Email{' '}
            <a
              href="mailto:11n44sourjeshmukherjee@gmail.com"
              className="text-[#E07A5F] hover:underline font-bold transition-all"
            >
              11n44sourjeshmukherjee@gmail.com
            </a>{' '}
            and it comes down.
          </p>
        </div>
        <div className="flex flex-col md:items-end justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Logo / Brand */}
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
          <div className="flex flex-col md:items-end gap-1.5">
            <p className="text-[11px] text-[#1B1B1B]/50 font-medium flex items-center gap-2.5">
              <span>&copy; {new Date().getFullYear()} vynyl. Built by <span className="text-[#1B1B1B]/80 font-bold">Sourjesh Mukherjee</span></span>
              <span className="inline-flex items-center gap-2 border-l border-black/10 pl-2.5">
                <a
                  href="https://github.com/sourjesh-git/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B1B1B]/60 hover:text-[#1B1B1B] transition-colors"
                  title="GitHub Profile"
                >
                  <Github className="h-4.5 w-4.5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/sourjesh-mukherjee-5ba657258/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1B1B1B]/60 hover:text-[#0077B5] transition-colors"
                  title="LinkedIn Profile"
                >
                  <Linkedin className="h-4.5 w-4.5" />
                </a>
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
