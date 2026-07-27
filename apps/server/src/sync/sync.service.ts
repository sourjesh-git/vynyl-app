import { Injectable } from '@nestjs/common';
import { PlaybackState, QueueItem } from '@syncroom/shared';
import { RoomService } from '../room/room.service';

@Injectable()
export class SyncService {
  constructor(private readonly roomService: RoomService) {}

  async loadTrack(
    code: string,
    item: QueueItem,
  ): Promise<PlaybackState> {
    const room = await this.roomService.getRoom(code);
    room.playback = {
      videoId: item.videoId,
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnail,
      duration: item.duration,
      playing: true,
      positionMs: 0,
      startedAt: Date.now(),
      addedBy: item.addedBy,
    };
    await this.roomService.saveRoom(room);
    return room.playback;
  }

  async play(code: string, positionMs?: number): Promise<PlaybackState> {
    const room = await this.roomService.getRoom(code);
    const pos = positionMs ?? room.playback.positionMs;
    room.playback = {
      ...room.playback,
      playing: true,
      positionMs: pos,
      startedAt: Date.now(),
    };
    await this.roomService.saveRoom(room);
    return room.playback;
  }

  async pause(code: string, positionMs?: number): Promise<PlaybackState> {
    const room = await this.roomService.getRoom(code);
    let pos = room.playback.positionMs;
    if (positionMs !== undefined) {
      pos = positionMs;
    } else if (room.playback.playing && room.playback.startedAt) {
      pos = room.playback.positionMs + (Date.now() - room.playback.startedAt);
    }
    room.playback = {
      ...room.playback,
      playing: false,
      positionMs: pos,
      startedAt: null,
    };
    await this.roomService.saveRoom(room);
    return room.playback;
  }

  async seek(code: string, positionMs: number): Promise<PlaybackState> {
    const room = await this.roomService.getRoom(code);
    room.playback = {
      ...room.playback,
      positionMs,
      startedAt: room.playback.playing ? Date.now() : null,
    };
    await this.roomService.saveRoom(room);
    return room.playback;
  }

  async stop(code: string): Promise<PlaybackState> {
    const room = await this.roomService.getRoom(code);
    room.playback = {
      videoId: null,
      title: '',
      artist: '',
      thumbnail: '',
      duration: 0,
      playing: false,
      positionMs: 0,
      startedAt: null,
      addedBy: null,
    };
    await this.roomService.saveRoom(room);
    return room.playback;
  }

  calculateCurrentPosition(playback: PlaybackState): number {
    if (!playback.playing || playback.startedAt === null) {
      return playback.positionMs;
    }
    return playback.positionMs + (Date.now() - playback.startedAt);
  }
}
