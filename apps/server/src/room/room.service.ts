import { Injectable, NotFoundException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import {
  CreateRoomResponse,
  JoinRoomResponse,
  Member,
  PlaybackState,
  ROOM_TTL_SECONDS,
  Room,
} from '@syncroom/shared';
import { RedisService } from '../redis/redis.service';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);
const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

const emptyPlayback = (): PlaybackState => ({
  videoId: null,
  title: '',
  artist: '',
  thumbnail: '',
  duration: 0,
  playing: false,
  positionMs: 0,
  startedAt: null,
});

@Injectable()
export class RoomService {
  private readonly hostTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(private readonly redis: RedisService) {}

  private roomKey(code: string) {
    return `room:${code.toUpperCase()}`;
  }

  async createRoom(memberName: string): Promise<CreateRoomResponse> {
    const code = generateCode();
    const memberId = generateId();
    const member: Member = {
      id: memberId,
      name: memberName.trim() || 'Host',
      joinedAt: Date.now(),
      isHost: true,
    };

    const room: Room = {
      code,
      hostId: memberId,
      createdAt: Date.now(),
      members: [member],
      playback: emptyPlayback(),
    };

    await this.redis.set(this.roomKey(code), room, ROOM_TTL_SECONDS);
    return { code, memberId, memberName: member.name };
  }

  async getRoom(code: string): Promise<Room> {
    const room = await this.redis.get<Room>(this.roomKey(code));
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async saveRoom(room: Room): Promise<void> {
    await this.redis.set(this.roomKey(room.code), room, ROOM_TTL_SECONDS);
  }

  async joinRoom(code: string, memberName: string, existingMemberId?: string): Promise<JoinRoomResponse> {
    const room = await this.getRoom(code);

    if (existingMemberId) {
      const existing = room.members.find((m) => m.id === existingMemberId);
      if (existing) {
        return {
          room,
          memberId: existingMemberId,
          memberName: existing.name,
        };
      }
    }

    const memberId = generateId();
    const member: Member = {
      id: memberId,
      name: memberName.trim() || `Guest ${room.members.length + 1}`,
      joinedAt: Date.now(),
      isHost: false,
    };

    room.members.push(member);
    await this.saveRoom(room);

    return {
      room,
      memberId,
      memberName: member.name,
    };
  }

  async removeMember(code: string, memberId: string): Promise<Room | null> {
    const room = await this.redis.get<Room>(this.roomKey(code));
    if (!room) return null;

    room.members = room.members.filter((m) => m.id !== memberId);

    if (room.members.length === 0) {
      await this.deleteRoom(code);
      return null;
    }

    if (room.hostId === memberId) {
      await this.transferHost(room);
    } else {
      await this.saveRoom(room);
    }

    return room;
  }

  async transferHost(room: Room): Promise<Member> {
    const sorted = [...room.members].sort((a, b) => a.joinedAt - b.joinedAt);
    const newHost = sorted[0];
    room.hostId = newHost.id;
    room.members = room.members.map((m) => ({
      ...m,
      isHost: m.id === newHost.id,
    }));
    await this.saveRoom(room);
    return { ...newHost, isHost: true };
  }

  startHostDisconnectTimeout(
    code: string,
    hostId: string,
    onTimeout: () => Promise<void>,
  ): void {
    this.clearHostDisconnectTimeout(code);
    const timeout = setTimeout(async () => {
      const room = await this.redis.get<Room>(this.roomKey(code));
      if (room && room.hostId === hostId) {
        await onTimeout();
      }
    }, 60_000);
    this.hostTimeouts.set(code, timeout);
  }

  clearHostDisconnectTimeout(code: string): void {
    const timeout = this.hostTimeouts.get(code);
    if (timeout) {
      clearTimeout(timeout);
      this.hostTimeouts.delete(code);
    }
  }

  async deleteRoom(code: string): Promise<void> {
    this.clearHostDisconnectTimeout(code);
    await this.redis.del(this.roomKey(code));
    await this.redis.del(`queue:${code.toUpperCase()}`);
    await this.redis.del(`presence:${code.toUpperCase()}`);
  }

  isHost(room: Room, memberId: string): boolean {
    return room.hostId === memberId;
  }
}
