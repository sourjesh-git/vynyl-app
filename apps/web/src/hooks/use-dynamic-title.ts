import { useEffect } from 'react';
import { useRoomStore } from '@/store/room-store';

export function useDynamicTitle() {
  const playback = useRoomStore((s) => s.playback);
  const queue = useRoomStore((s) => s.queue);
  const currentIndex = useRoomStore((s) => s.currentIndex);

  useEffect(() => {
    const currentItem = queue[currentIndex];
    const title = playback?.title || currentItem?.title;
    const isPlaying = playback?.playing;

    if (title && isPlaying) {
      document.title = `► ${title} ✦ vynyl`;
    } else if (title && !isPlaying) {
      document.title = `II ${title} ✦ vynyl`;
    } else {
      document.title = 'vynyl — Listen Together ✦';
    }

    return () => {
      document.title = 'vynyl — Listen Together ✦';
    };
  }, [playback?.title, playback?.playing, queue, currentIndex]);
}
