import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { RoomService } from './room.service';
import { QueueService } from '../queue/queue.service';

const createRoomSchema = z.object({
  name: z.string().min(1).max(32).optional(),
});

const joinRoomSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  memberId: z.string().optional(),
});

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly queueService: QueueService,
  ) {}

  @Post()
  async createRoom(@Body() body: unknown) {
    const parsed = createRoomSchema.parse(body);
    return this.roomService.createRoom(parsed.name ?? 'Host');
  }

  @Post(':code/join')
  async joinRoom(@Param('code') code: string, @Body() body: unknown) {
    const parsed = joinRoomSchema.parse(body);
    try {
      const result = await this.roomService.joinRoom(code, parsed.name ?? 'Guest', parsed.memberId);
      const queueState = await this.queueService.getQueue(code);
      return {
        ...result,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      };
    } catch {
      throw new NotFoundException('Room not found');
    }
  }

  @Get('stats')
  async getStats() {
    return this.roomService.getStats();
  }

  @Get(':code')
  async getRoom(@Param('code') code: string) {
    try {
      const room = await this.roomService.getRoom(code);
      const queueState = await this.queueService.getQueue(code);
      return {
        room,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      };
    } catch {
      throw new NotFoundException('Room not found');
    }
  }
}
