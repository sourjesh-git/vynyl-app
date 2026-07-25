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
            className="flex items-center justify-between rounded-xl py-2 px-1 transition-all border border-transparent hover:bg-black/5"
          >
            <div className="flex items-center gap-3">
              <Avatar userId={member.id} name={member.name} size="md" />
              <div className="text-sm font-medium text-[#1B1B1B] flex items-center gap-2 font-satoshi">
                <span>{isCurrent ? 'You' : member.name}</span>
                {isHost && (
                  <span className="rounded-full bg-[#82C3A6]/40 px-2.5 py-0.5 text-[9px] font-bold text-[#2D5A46] tracking-wider uppercase">
                    Host
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 pr-1">
              <span className="h-2 w-2 rounded-full bg-[#52B788]" />
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
          <h3 className="text-xs font-bold text-[#1B1B1B] tracking-widest uppercase flex items-center gap-2">
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
          <span className="text-[10px] font-bold text-[#1B1B1B] tracking-widest uppercase pl-0.5">
            Room Code
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-3xl font-medium tracking-wider text-[#1B1B1B]">
              {room.code}
            </span>
            <div className="relative">
              <button
                onClick={copyCode}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 hover:bg-black/10 active:scale-95 transition-all"
              >
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
                      <Copy className="h-3.5 w-3.5 text-[#1B1B1B]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              {/* Copy Feedback Bubble (+1 / Copied) */}
              <AnimatePresence>
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: -30, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    className="absolute left-1/2 -translate-x-1/2 rounded-lg bg-[#E07A5F] px-2.5 py-1 text-[11px] font-semibold text-white shadow-md border border-[#E07A5F]/20 whitespace-nowrap"
                  >
                    Copied!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* People List */}
        <div className="space-y-3 px-2">
          <span className="text-[10px] font-bold text-[#1B1B1B] tracking-widest uppercase pl-0.5">
            People &nbsp; {room.members.length}
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
          className="w-full flex items-center justify-center gap-2 rounded-full border border-[#1B1B1B]/15 bg-transparent text-[#1B1B1B] hover:bg-black/5 transition-all font-medium py-3 text-xs tracking-wider uppercase shadow-none"
        >
          Invite people <UserPlus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
