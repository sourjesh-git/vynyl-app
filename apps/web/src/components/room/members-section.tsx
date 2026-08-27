'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Users, UserPlus } from 'lucide-react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/avatar';
import { cn } from '@/lib/utils';

function formatEventTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  return `${diffMins}m`;
}

export function MembersSection({ isMobile = false }: { isMobile?: boolean }) {
  const room = useRoomStore((s) => s.room);
  const memberId = useRoomStore((s) => s.memberId);
  const events = useRoomStore((s) => s.events);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  // Auto-refresh event timestamps every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const activityContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activityContainerRef.current) {
      activityContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [events]);

  if (!room) return null;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Render members list
  const renderMembersList = () => (
    <div className="space-y-2.5">
      {room.members.map((member) => {
        const isCurrent = member.id === memberId;
        const isHost = member.isHost;

        return (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center justify-between rounded-xl py-2 px-1.5 transition-all border border-transparent hover:bg-black/5"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar userId={member.id} name={member.name} size="md" />
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-semibold text-[#1B1B1B] truncate font-satoshi leading-tight">
                  {member.name}
                </span>
                {(isCurrent || isHost) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isCurrent && (
                      <span className="text-[10px] text-[#1B1B1B]/40 font-medium font-satoshi">
                        You
                      </span>
                    )}
                    {isCurrent && isHost && (
                      <span className="text-[10px] text-[#1B1B1B]/30 font-satoshi">·</span>
                    )}
                    {isHost && (
                      <span className="rounded-full bg-[#82C3A6]/20 px-1.5 py-[1px] text-[8px] font-bold text-[#2D5A46] tracking-wider uppercase">
                        Host
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 pl-3">
              <span className="h-2 w-2 rounded-full bg-[#52B788]" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderActivityFeed = () => {
    if (events.length === 0) {
      return (
        <div className="py-6 text-center">
          <p className="text-[10px] text-[#1B1B1B]/40 font-medium font-satoshi">No activity yet</p>
        </div>
      );
    }

    return (
      <div
        ref={activityContainerRef}
        className="max-h-[220px] overflow-y-auto pr-1 space-y-2 scrollbar-none"
      >
        <AnimatePresence initial={false}>
          {events.map((event, idx) => {
            const opacityVal = Math.max(0.25, 1 - idx * 0.15);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: opacityVal, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-center justify-between py-1 text-xs"
              >
                <div className="flex items-center gap-2 font-satoshi font-medium min-w-0">
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0 animate-pulse",
                    event.type === 'join' && "bg-[#52B788]",
                    event.type === 'leave' && "bg-red-400",
                    event.type === 'queue-add' && "bg-orange-400",
                    event.type === 'shuffle' && "bg-purple-500",
                    event.type === 'repeat' && "bg-blue-500"
                  )} />
                  <span className="text-[#1B1B1B]/75 truncate">{event.text}</span>
                </div>
                <span className="text-[10px] text-[#1B1B1B]/40 font-mono pl-2 shrink-0 select-none">
                  {formatEventTime(event.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  // If rendering inside Mobile Tab
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 py-4 bg-[#F6F3EE] rounded-3xl p-6 border border-[#EBE1D6]/60 text-[#1B1B1B]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1B1B1B]/80 font-satoshi flex items-center gap-2">
            <Users className="h-4 w-4 text-[#E07A5F]" /> People ({room.members.length})
          </h3>
          <button
            onClick={copyCode}
            className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-black/5 hover:bg-black/10 active:scale-95 transition-all text-xs font-medium font-satoshi text-[#1B1B1B]"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5 text-emerald-700 font-semibold"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <span className="text-[#1B1B1B]/60 mr-1">Code: {room.code}</span>
                  <Copy className="h-3.5 w-3.5 text-[#1B1B1B]/70" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
        {renderMembersList()}

        <div className="space-y-3 pt-4 border-t border-black/5">
          <h3 className="text-xs font-bold text-[#1B1B1B]/80 font-satoshi pl-0.5">
            Activity
          </h3>
          {renderActivityFeed()}
        </div>
      </div>
    );
  }

  // Desktop Left Sidebar View (Warm Sand background, clean minimal items)
  return (
    <div className="flex h-full flex-col justify-between py-6 px-4 bg-[#EBE1D6] text-[#1B1B1B] border-r border-[#1B1B1B]/5">
      <div className="space-y-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 px-2">
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

        {/* Room Code Area */}
        <div className="flex items-center gap-3 px-2">
          <span className="font-mono text-2xl font-semibold tracking-wider text-[#1B1B1B]">
            {room.code}
          </span>
          <button
            onClick={copyCode}
            className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-black/5 hover:bg-black/10 active:scale-95 transition-all text-xs font-medium font-satoshi text-[#1B1B1B]"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-1.5 text-emerald-700 font-semibold"
                >
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied</span>
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Copy className="h-3.5 w-3.5 text-[#1B1B1B]/70" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* People List */}
        <div className="space-y-3 px-2">
          <span className="text-xs font-bold text-[#1B1B1B]/80 font-satoshi pl-0.5">
            People ({room.members.length})
          </span>
          <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1 scrollbar-none">
            <AnimatePresence initial={false}>{renderMembersList()}</AnimatePresence>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-3 px-2 pt-4 border-t border-[#1B1B1B]/5">
          <span className="text-xs font-bold text-[#1B1B1B]/80 font-satoshi pl-0.5">
            Activity
          </span>
          {renderActivityFeed()}
        </div>
      </div>

      {/* Invite Button at bottom */}
      <div className="px-2 mt-6">
        <Button
          onClick={copyCode}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-[#1B1B1B]/15 bg-transparent text-[#1B1B1B] hover:bg-black/5 transition-all font-medium py-3 text-xs tracking-wider uppercase shadow-none"
        >
          Invite people <UserPlus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
