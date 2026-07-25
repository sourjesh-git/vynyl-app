'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Zap, Globe, Lock, Loader2, ArrowUpRight, Check, CornerDownLeft } from 'lucide-react';
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
          router.push(`/room/${response.room.code}`);
        } else {
          router.push(
            `/room/${restResult.code}?memberId=${restResult.memberId}&name=${encodeURIComponent(
              restResult.memberName
            )}`
          );
        }
      });
    } catch {
      toast({
        title: 'Failed to create room',
        description: 'Please try again.',
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
    } catch {
      toast({
        title: 'Failed to join',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F6F3EE] text-[#1B1B1B] overflow-x-hidden font-satoshi flex flex-col justify-between">
      {/* 1. Main visual layout container (split view) */}
      <div className="flex-1 flex flex-col md:flex-row relative min-h-screen">
        {/* Left Column: Headline, Actions, Bottom Panel */}
        <div className="w-full md:w-[48%] px-6 sm:px-12 md:pl-16 md:pr-12 py-10 flex flex-col justify-between min-h-[85vh] md:min-h-screen z-10">
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
              <span className="text-xl font-bold tracking-tight text-[#1B1B1B] font-satoshi lowercase">
                vynyl
              </span>
            </div>

            <div className="flex items-center gap-3.5 md:hidden">
              <span className="rounded-full bg-[#C7D1C0] px-3.5 py-1 text-[11px] font-bold text-[#1B1B1B] tracking-wider uppercase">
                ✦ 100% Free
              </span>
            </div>
          </div>

          {/* Core copy & Interactive Controls */}
          <div className="space-y-8 my-auto max-w-lg">
            {/* Header text */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1B1B1B] font-canela leading-[1.15]">
                Listen to music,
                <br />
                <span className="relative inline-block mt-1 italic font-normal">
                  together.
                  {/* Underline brush SVG */}
                  <span className="absolute -bottom-2.5 left-0 right-0 h-1.5 bg-[#E07A5F] opacity-75 rounded-full" />
                </span>
              </h1>
              <p className="text-sm sm:text-base text-[#1B1B1B]/75 leading-relaxed font-satoshi pt-3">
                Create a room, invite your people, and jam in real time.
              </p>
            </div>

            {/* Action forms container */}
            <div className="pt-2">
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
                    className="space-y-4 bg-[#EBE1D6]/40 p-5 rounded-2xl border border-[#EBE1D6] max-w-md shadow-[0_4px_24px_rgba(0,0,0,0.03)]"
                  >
                    <div className="space-y-3">
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
                          className="w-full px-4 py-3 rounded-xl bg-white border border-[#EBE1D6] text-sm text-[#1B1B1B] placeholder-[#1B1B1B]/40 focus:outline-none focus:border-[#8FB3A6] transition-all"
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
                            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EBE1D6] text-sm text-[#1B1B1B] font-semibold placeholder-[#1B1B1B]/40 tracking-wider uppercase focus:outline-none focus:border-[#8FB3A6] transition-all"
                          />
                        </div>
                      )}
                    </div>

                    {/* Form control action buttons */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <Button
                        onClick={actionType === 'create' ? handleCreateRoom : handleJoinRoom}
                        disabled={loading}
                        className="flex-1 py-5 rounded-xl bg-[#1B1B1B] hover:bg-[#1B1B1B]/90 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition-all hover:-translate-y-[2px]"
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
                        className="py-5 px-4 rounded-xl bg-transparent hover:bg-black/5 text-[#1B1B1B]/60 hover:text-[#1B1B1B] font-medium transition-all"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom spacer for layout alignment on desktop */}
          <div className="h-10 hidden md:block" />
        </div>

        {/* Right Column: Hero Image (hidden on mobile) */}
        <div className="hidden md:block md:w-[52%] relative min-h-screen overflow-hidden select-none">
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

      {/* ========================================================================= */}
      {/* 2. Overlaid Bottom Translucent Feature Grid */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-6 pb-10 md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2 z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-3xl bg-white/40 backdrop-blur-lg border border-white/60 p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          {/* Sync item */}
          <div className="flex items-center gap-4 px-2">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-white/50 flex items-center justify-center border border-white/50">
              <Zap className="h-4.5 w-4.5 text-[#E07A5F]" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase">
                Real-time sync
              </h4>
              <p className="text-[11px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                Everyone hears the exact same moment.
              </p>
            </div>
          </div>

          {/* Device item */}
          <div className="flex items-center gap-4 px-2 border-t md:border-t-0 md:border-x border-charcoal/5 py-4 md:py-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-white/50 flex items-center justify-center border border-white/50">
              <Globe className="h-4.5 w-4.5 text-[#E07A5F]" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase">
                Works anywhere
              </h4>
              <p className="text-[11px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                On any device. No installs.
              </p>
            </div>
          </div>

          {/* Login item */}
          <div className="flex items-center gap-4 px-2">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-white/50 flex items-center justify-center border border-white/50">
              <Lock className="h-4.5 w-4.5 text-[#E07A5F]" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider text-[#1B1B1B] uppercase">No login</h4>
              <p className="text-[11px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
                Jump in instantly with just a name.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
