'use client';

import { useEffect, useState } from 'react';
import { Radio, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { AppStatsResponse } from '@syncroom/shared';

const DEFAULT_ROOMS = 5;
const DEFAULT_LISTENERS = 10;

export function StatsTiles() {
  const [stats, setStats] = useState<AppStatsResponse>({
    activeRooms: DEFAULT_ROOMS,
    activeListeners: DEFAULT_LISTENERS,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const data = await apiFetch<AppStatsResponse>('/rooms/stats');
        if (isMounted && data) {
          setStats({
            activeRooms: Math.max(data.activeRooms ?? 0, DEFAULT_ROOMS),
            activeListeners: Math.max(data.activeListeners ?? 0, DEFAULT_LISTENERS),
          });
        }
      } catch (err) {
        // Fall back gracefully to default floor values
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayRooms = Math.max(stats.activeRooms, DEFAULT_ROOMS);
  const displayListeners = Math.max(stats.activeListeners, DEFAULT_LISTENERS);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {/* Active Rooms Tile */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/50 flex items-center justify-center border border-white/50">
          <Radio className="h-4 w-4 text-[#E07A5F]" />
        </div>
        <div>
          <h4 className="text-[11px] font-bold tracking-wider text-[#1B1B1B] uppercase">
            Active Rooms
          </h4>
          <p className="text-[12px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
            <span className="text-[#1B1B1B]">{displayRooms}</span>
          </p>
        </div>
      </div>

      {/* Active Listeners Tile */}
      <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/50 flex items-center justify-center border border-white/50">
          <Users className="h-4 w-4 text-[#E07A5F]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-[11px] font-bold tracking-wider text-[#1B1B1B] uppercase">
              Active Listeners
            </h4>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-[12px] text-[#1B1B1B]/60 leading-normal mt-0.5 font-medium">
            <span className="text-[#1B1B1B]">{displayListeners}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
