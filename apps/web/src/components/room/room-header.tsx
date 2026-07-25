'use client';

import { Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRoomStore } from '@/store/room-store';
import { toast } from '@/hooks/use-toast';

export function RoomHeader() {
  const room = useRoomStore((s) => s.room);
  const connected = useRoomStore((s) => s.connected);
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Room code copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold tracking-tight text-[#1B1B1B] font-satoshi lowercase">vynyl</span>
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
          <span className="font-mono text-sm tracking-widest">{room.code}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyCode}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          {room.members.length} connected
        </span>
      </div>
    </header>
  );
}
