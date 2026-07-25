'use client';

import Image from 'next/image';
import { Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoomStore, useIsHost } from '@/store/room-store';
import { formatDuration } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function QueueSection({ isMobile = false }: { isMobile?: boolean }) {
  const queue = useRoomStore((s) => s.queue);
  const currentIndex = useRoomStore((s) => s.currentIndex);
  const room = useRoomStore((s) => s.room);
  const socket = useRoomStore((s) => s.socket);
  const memberId = useRoomStore((s) => s.memberId);
  const isHost = useIsHost();

  const removeItem = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room?.code || !socket || !isHost) return;
    socket.emit('queue-remove', { code: room.code, itemId });
  };

  const playItem = (index: number) => {
    if (!room?.code || !socket || !isHost) return;
    const item = queue[index];
    if (!item) return;
    socket.emit('load-track', { code: room.code, item });
  };

  const getAdderName = (addedBy: string) => {
    const adder = room?.members.find((m) => m.id === addedBy);
    return adder ? (adder.id === memberId ? 'You' : adder.name) : 'Host';
  };

  const renderQueueList = () => (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {queue.map((item, index) => {
          const isCurrent = index === currentIndex;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                mass: 0.8,
              }}
              onClick={() => playItem(index)}
              className={`flex items-center justify-between gap-3 rounded-2xl p-2.5 transition-all border group/queue-item cursor-pointer ${
                isCurrent
                  ? 'bg-white/60 border-white/80 shadow-sm'
                  : 'border-transparent hover:bg-white/20'
              }`}
            >
              {/* Left indicator: Soundwave lines or Index */}
              <div className="flex items-center justify-center shrink-0 w-6">
                {isCurrent ? (
                  /* Custom terracotta visualizer bars */
                  <div className="flex items-end gap-0.5 h-3.5">
                    <div className="w-[2.5px] bg-[#E07A5F] rounded-full animate-[pulse_0.8s_infinite_alternate]" style={{ height: '60%' }} />
                    <div className="w-[2.5px] bg-[#E07A5F] rounded-full animate-[pulse_0.6s_infinite_alternate_0.2s]" style={{ height: '100%' }} />
                    <div className="w-[2.5px] bg-[#E07A5F] rounded-full animate-[pulse_0.7s_infinite_alternate_0.1s]" style={{ height: '40%' }} />
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-[#1B1B1B]/40">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Album thumbnail */}
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/5 border border-black/5 shadow-sm">
                {item.thumbnail && (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    className="object-cover scale-101"
                    unoptimized
                  />
                )}
              </div>

              {/* Title & Artist details */}
              <div className="min-w-0 flex-1 text-left flex flex-col items-start gap-0.5">
                <p
                  className={`truncate text-sm font-semibold leading-tight w-full font-satoshi ${
                    isCurrent ? 'text-[#1B1B1B]' : 'text-[#1B1B1B]/90'
                  }`}
                >
                  {item.title}
                </p>
                <p className="truncate text-[10px] text-[#1B1B1B]/55 font-medium tracking-wide w-full font-satoshi">
                  {item.artist}
                  {item.addedBy && (
                    <span className="opacity-60">
                      {' '}· Added by {getAdderName(item.addedBy)}
                    </span>
                  )}
                </p>
              </div>

              {/* Right Side: Duration / Star Badge / Trash Icon */}
              <div className="flex items-center gap-2 shrink-0">
                {isCurrent ? (
                  <Star className="h-4 w-4 fill-[#E07A5F] text-[#E07A5F]" />
                ) : (
                  <span className="text-xs font-medium text-[#1B1B1B]/40 font-satoshi pr-1">
                    {formatDuration(item.duration)}
                  </span>
                )}

                {/* Trash button for Host */}
                {isHost && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl opacity-0 group-hover/queue-item:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-600 text-charcoal/40"
                    onClick={(e) => removeItem(item.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  // If rendering inside Mobile Tab view
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 py-4 bg-[#F6F3EE] rounded-3xl p-6 border border-[#EBE1D6]/60 text-[#1B1B1B]">
        <h3 className="text-xs font-bold text-[#1B1B1B]/50 tracking-widest uppercase flex items-center gap-2">
          Queue ({queue.length})
        </h3>
        {queue.length === 0 ? (
          <p className="text-xs text-[#1B1B1B]/40 text-center py-8 border border-dashed border-[#1B1B1B]/10 rounded-xl">
            Queue is empty. Search and add songs.
          </p>
        ) : (
          renderQueueList()
        )}
      </div>
    );
  }

  // Desktop Card View (Frosted Glass container matching the mockup)
  return (
    <div className="rounded-3xl bg-white/45 backdrop-blur-md border border-white/60 p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)] flex flex-col gap-4 text-[#1B1B1B] h-full">
      <div className="flex items-center justify-between pb-2 border-b border-black/5">
        <h3 className="text-xs font-bold text-[#1B1B1B]/50 tracking-widest uppercase flex items-center gap-2 font-satoshi">
          Queue
          <span className="bg-[#C7D1C0] text-[#1B1B1B] px-2 py-0.5 rounded-full text-[10px] font-bold">
            {queue.length}
          </span>
        </h3>
      </div>

      {queue.length === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center border border-dashed border-black/10 rounded-2xl bg-white/10">
          <p className="text-xs text-[#1B1B1B]/50 max-w-[200px] leading-relaxed">
            The queue is currently empty. Search for songs above and add them!
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 max-h-[460px]">
          {renderQueueList()}
        </div>
      )}

      <div className="pt-2 border-t border-black/5 mt-auto text-center">
        <span className="text-[11px] font-bold text-[#E07A5F] hover:text-[#E07A5F]/80 tracking-wider uppercase transition-colors inline-flex items-center gap-1 cursor-pointer">
          View full queue →
        </span>
      </div>
    </div>
  );
}
