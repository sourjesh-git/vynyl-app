'use client';

import Image from 'next/image';
import { Plus, X, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearch } from '@/hooks/use-search';
import { useRoomStore } from '@/store/room-store';
import { formatDuration, cn } from '@/lib/utils';
import type { SearchResult } from '@syncroom/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export function SearchSection({ isMobile = false }: { isMobile?: boolean }) {
  const searchQuery = useRoomStore((s) => s.searchQuery);
  const setSearchQuery = useRoomStore((s) => s.setSearchQuery);
  const room = useRoomStore((s) => s.room);
  const socket = useRoomStore((s) => s.socket);
  const memberId = useRoomStore((s) => s.memberId);

  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1);

  const { data: results, isLoading } = useSearch(searchQuery, true);

  // Reset active keyboard index when query or results change
  useEffect(() => {
    setActiveResultIndex(-1);
  }, [searchQuery, results]);

  // Window event listener for keyboard arrow navigation
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.id !== 'search-input') return;

      const itemsCount = results?.length ?? 0;
      if (itemsCount === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveResultIndex((prev) => {
          const next = prev + 1;
          return next >= itemsCount ? 0 : next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveResultIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? itemsCount - 1 : next;
        });
      } else if (e.key === 'Enter') {
        if (activeResultIndex >= 0 && results?.[activeResultIndex]) {
          e.preventDefault();
          addToQueue(results[activeResultIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, activeResultIndex, isMobile]);

  const addToQueue = (result: SearchResult) => {
    if (!room?.code || !socket || !memberId) return;

    const item = {
      videoId: result.videoId,
      title: result.title,
      artist: result.artist,
      thumbnail: result.thumbnail,
      duration: result.duration,
      addedBy: memberId,
    };

    // Optimistic UI update
    useRoomStore.getState().addQueueItemOptimistic(item);

    // Socket emit
    socket.emit('queue-add', {
      code: room.code,
      item,
    });

    // Mark as added temporarily for success-feedback animation
    setAddedItemIds((prev) => ({ ...prev, [result.videoId]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [result.videoId]: false }));
    }, 2000);
  };

  const renderSearchResults = () => {
    if (isLoading) {
      // Pulse Skeletons styled with soft charcoal background tints
      return (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl p-2 border border-black/5 bg-white/30 animate-pulse-slow"
            >
              <Skeleton className="h-11 w-11 rounded-xl bg-black/5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-black/5 rounded" />
                <Skeleton className="h-3 w-1/2 bg-black/5 rounded" />
              </div>
              <Skeleton className="h-8 w-8 bg-black/5 rounded-lg" />
            </div>
          ))}
        </div>
      );
    }

    if (searchQuery && results?.length === 0) {
      return (
        <div className="py-12 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-[#1B1B1B]/40 font-medium">No results found</p>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {results?.map((result, idx) => {
          const isAdded = addedItemIds[result.videoId];
          const isActive = idx === activeResultIndex;

          return (
            <motion.div
              ref={(el) => {
                if (isActive && el) {
                  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }}
              key={result.videoId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl p-2 transition-all border border-transparent hover:bg-white/50 group/search-item cursor-pointer",
                isActive && "bg-white/50"
              )}
              onClick={() => addToQueue(result)}
            >
              {/* Thumbnail */}
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-black/5 border border-black/5 shadow-sm">
                {result.thumbnail && (
                  <Image
                    src={result.thumbnail}
                    alt={result.title}
                    fill
                    className={cn(
                      "object-cover scale-100 transition-transform duration-300 group-hover/search-item:scale-108",
                      isActive && "scale-108"
                    )}
                    unoptimized
                  />
                )}
              </div>

              {/* Title & Artist */}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-[#1B1B1B] leading-tight font-satoshi">
                  {result.title}
                </p>
                <p className="truncate text-[10px] text-[#1B1B1B] font-medium tracking-wide mt-0.5 font-satoshi">
                  {result.artist} ·{' '}
                  <span>{formatDuration(result.duration)}</span>
                </p>
              </div>

              {/* Plus Button with success state feedback */}
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-8 w-8 rounded-xl shrink-0 border border-transparent transition-all duration-200 opacity-0 group-hover/search-item:opacity-100 focus-visible:opacity-100 focus:opacity-100",
                  isActive && "opacity-100",
                  isAdded
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600 opacity-100"
                    : "bg-black/5 hover:bg-[#E07A5F]/20 hover:border-[#E07A5F]/30 text-[#1B1B1B]/60 hover:text-[#E07A5F]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  addToQueue(result);
                }}
              >
                <AnimatePresence mode="wait">
                  {isAdded ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.8 }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="plus"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.8 }}
                    >
                      <Plus className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // If rendering inside Mobile search view
  if (isMobile) {
    return (
      <div className="space-y-4 px-4 py-4 bg-[#F6F3EE] rounded-3xl p-6 border border-[#EBE1D6]/60 text-[#1B1B1B]">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1B1B1B]/40" />
            <input
              type="text"
              placeholder="Search for songs, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-[#EBE1D6] text-sm text-[#1B1B1B] placeholder-[#1B1B1B]/40 focus:outline-none focus:border-[#E07A5F] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1B1B1B]/40 hover:text-[#1B1B1B]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          {searchQuery ? (
            renderSearchResults()
          ) : (
            <p className="text-xs text-[#1B1B1B]/30 text-center mt-12">
              Type 3 or more characters to find tracks
            </p>
          )}
        </div>
      </div>
    );
  }

  // Desktop View (rendered inside absolute dropdown card in room-page header)
  return (
    <div className="flex flex-col gap-1 text-[#1B1B1B]">
      {searchQuery.trim().length >= 3 ? (
        renderSearchResults()
      ) : (
        <p className="text-xs text-[#1B1B1B]/40 text-center py-6 font-medium font-satoshi">
          Type 3 or more characters to find tracks
        </p>
      )}
    </div>
  );
}
