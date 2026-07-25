'use client';

import { useState } from 'react';
import { Copy, Check, Users, UserPlus } from 'lucide-react';
import { useRoomStore } from '@/store/room-store';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/avatar';

export function MembersSection({ isMobile = false }: { isMobile?: boolean }) {
  const room = useRoomStore((s) => s.room);
  const memberId = useRoomStore((s) => s.memberId);
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    toast({
      title: 'Room code copied',
      description: `Share the code ${room.code} with your friends.`,
    });
    setTimeout(() => setCopied(false), 2000);
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
            className={`flex items-center justify-between rounded-xl p-2 transition-all border border-transparent ${isCurrent ? 'bg-[#1B1B1B]/5' : 'hover:bg-[#1B1B1B]/4'
              }`}
          >
            <div className="flex items-center gap-3">
              {/* DiceBear Avatar Component with deterministic seed */}
              <div className="relative">
                <Avatar userId={member.id} name={member.name} size="md" />
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-[#EBE1D6]" />
              </div>
              <div className="text-sm font-medium text-[#1B1B1B] flex items-center gap-1.5 font-satoshi">
                <span>{member.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isHost && (
                <span className="rounded-full bg-[#C7D1C0] px-2.5 py-0.5 text-[9px] font-bold text-[#1B1B1B] tracking-wider uppercase">
                  Host
                </span>
              )}
              {isCurrent && (
                <span className="rounded-full bg-black/5 border border-black/5 px-2.5 py-0.5 text-[9px] font-bold text-[#1B1B1B] tracking-wider uppercase">
                  You
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  // If rendering inside Mobile Tab
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 py-4 bg-[#F6F3EE] rounded-3xl p-6 border border-[#EBE1D6]/60 text-[#1B1B1B]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#1B1B1B]/50 tracking-widest uppercase flex items-center gap-2">
            <Users className="h-4 w-4 text-[#E07A5F]" /> People ({room.members.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="text-xs text-[#E07A5F] hover:text-[#E07A5F]/80 hover:bg-black/5"
          >
            Copy Code: {room.code}
          </Button>
        </div>
        {renderMembersList()}
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
        <div className="space-y-2 px-2">
          <span className="text-[10px] font-bold text-[#1B1B1B]/40 tracking-widest uppercase pl-0.5">
            Room Code
          </span>
          <div
            onClick={copyCode}
            className="group relative flex items-center justify-between rounded-xl bg-white border border-[#1B1B1B]/5 p-3 cursor-pointer hover:bg-white/90 transition-all duration-200 active:scale-98 shadow-sm"
          >
            <div className="space-y-0.5">
              <span className="font-mono text-base font-bold tracking-widest text-[#1B1B1B]">
                {room.code}
              </span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 hover:bg-black/8 transition-all">
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Copy className="h-3.5 w-3.5 text-[#1B1B1B]/60" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Copy Feedback Bubble (+1 / Copied) */}
            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: -26, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  className="absolute left-1/2 -translate-x-1/2 rounded-lg bg-[#E07A5F] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md border border-[#E07A5F]/20"
                >
                  Copied!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* People List */}
        <div className="space-y-3 px-2">
          <span className="text-[10px] font-bold text-[#1B1B1B]/40 tracking-widest uppercase pl-0.5">
            People ({room.members.length})
          </span>
          <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1">
            <AnimatePresence initial={false}>{renderMembersList()}</AnimatePresence>
          </div>
        </div>
      </div>

      {/* Invite Button at bottom */}
      <div className="px-2 mt-6">
        <Button
          onClick={copyCode}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1B1B1B] text-white hover:bg-[#1B1B1B]/90 transition-all font-medium py-4 text-xs tracking-wider uppercase shadow-md hover:-translate-y-[2px]"
        >
          <UserPlus className="h-4 w-4" /> Invite people
        </Button>
      </div>
    </div>
  );
}
