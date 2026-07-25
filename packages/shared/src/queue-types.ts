export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  addedBy: string;
  addedAt: number;
}

export interface QueueState {
  currentIndex: number;
  items: QueueItem[];
}
