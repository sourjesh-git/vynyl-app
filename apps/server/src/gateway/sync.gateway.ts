import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  JoinRoomAck,
  QueueItem,
  RepeatMode,
  ServerToClientEvents,
} from '@syncroom/shared';
import { RoomService } from '../room/room.service';
import { QueueService } from '../queue/queue.service';
import { SyncService } from '../sync/sync.service';
import { PresenceService } from '../presence/presence.service';
import { SocketRateLimiterService } from '../common/rate-limiter/socket-rate-limiter.service';

interface SocketData {
  code?: string;
  memberId?: string;
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: SocketData;
};

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  private readonly logger = new Logger(SyncGateway.name);
  private readonly socketMembers = new Map<string, { code: string; memberId: string }>();

  constructor(
    private readonly roomService: RoomService,
    private readonly queueService: QueueService,
    private readonly syncService: SyncService,
    private readonly presenceService: PresenceService,
    private readonly socketRateLimiter: SocketRateLimiterService,
  ) {}

  handleConnection(client: AppSocket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: AppSocket) {
    const info = this.socketMembers.get(client.id);
    this.logger.log(`Client disconnected: ${client.id}${info ? ` (was in room ${info.code})` : ''}`);
    if (!info) return;

    const { code, memberId } = info;
    this.socketMembers.delete(client.id);

    const room = await this.roomService.getRoom(code).catch(() => null);
    if (!room) return;

    const wasHost = room.hostId === memberId;
    if (wasHost) {
      this.logger.log(`Host ${memberId} disconnected from room ${code}. Starting grace period timeout...`);
      this.roomService.startHostDisconnectTimeout(code, memberId, async () => {
        const currentRoom = await this.roomService.getRoom(code).catch(() => null);
        if (!currentRoom || currentRoom.hostId !== memberId) return;

        this.logger.log(`Host grace period expired. Removing host and transferring role in room ${code}`);
        const updated = await this.roomService.removeMember(code, memberId);
        if (!updated) {
          this.logger.log(`Room ${code} closed (no members left)`);
          this.server.to(code).emit('error', { message: 'Room closed' });
          return;
        }

        const newHost = updated.members.find((m) => m.isHost);
        if (newHost) {
          this.logger.log(`Room ${code}: Host role transferred to ${newHost.name} (${newHost.id})`);
          this.server.to(code).emit('host-changed', {
            hostId: newHost.id,
            member: newHost,
          });
        }
        this.server.to(code).emit('member-left', { memberId });
      });
    } else {
      this.logger.log(`Member ${memberId} disconnected from room ${code}`);
      const updated = await this.roomService.removeMember(code, memberId);
      await this.presenceService.removeMember(code, memberId);
      this.server.to(code).emit('member-left', { memberId });
      if (!updated) {
        this.logger.log(`Room ${code} closed (no members left)`);
      }
    }
  }

  @SubscribeMessage('create-room')
  async handleCreateRoom(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { name: string },
  ): Promise<JoinRoomAck> {
    try {
      if (await this.socketRateLimiter.isRateLimited(client.id, 'create-room', 3, 60)) {
        return { success: false, error: 'Too many room creations. Please slow down.' };
      }

      this.logger.log(`Creating room for user "${data.name}"`);
      const result = await this.roomService.createRoom(data.name);
      this.logger.log(`Room created: ${result.code} by host ${result.memberId}`);

      await this.joinSocketToRoom(client, result.code, result.memberId);
      const room = await this.roomService.getRoom(result.code);
      const queueState = await this.queueService.getQueue(result.code);

      client.emit('room-state', {
        room,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      });

      return {
        success: true,
        room,
        memberId: result.memberId,
        memberName: result.memberName,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      };
    } catch (err) {
      this.logger.error(`Failed to create room: ${err instanceof Error ? err.message : err}`);
      return { success: false, error: 'Failed to create room' };
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; name: string; memberId?: string },
  ): Promise<JoinRoomAck> {
    try {
      const code = data.code.toUpperCase();
      this.logger.log(`User "${data.name}" attempting to join room ${code} (existingId: ${data.memberId})`);
      const result = await this.roomService.joinRoom(code, data.name, data.memberId);
      await this.joinSocketToRoom(client, code, result.memberId);

      const hostMember = result.room.members.find((m) => m.id === result.room.hostId);
      if (hostMember) {
        this.roomService.clearHostDisconnectTimeout(code);
      }

      const queueState = await this.queueService.getQueue(code);

      client.emit('room-state', {
        room: result.room,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      });

      client.to(code).emit('member-joined', {
        member: result.room.members.find((m) => m.id === result.memberId)!,
      });

      this.logger.log(`User "${data.name}" joined room ${code} successfully (memberId: ${result.memberId})`);

      return {
        success: true,
        room: result.room,
        memberId: result.memberId,
        memberName: result.memberName,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      };
    } catch (err) {
      this.logger.warn(`Failed to join room ${data.code}: ${err instanceof Error ? err.message : err}`);
      return { success: false, error: 'Room not found' };
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string },
  ) {
    const code = data.code.toUpperCase();
    const info = this.socketMembers.get(client.id);
    if (!info) return;

    this.logger.log(`Member ${info.memberId} explicitly left room ${code}`);
    await this.roomService.removeMember(code, info.memberId);
    await this.presenceService.removeMember(code, info.memberId);
    client.leave(code);
    this.socketMembers.delete(client.id);
    this.server.to(code).emit('member-left', { memberId: info.memberId });
  }

  @SubscribeMessage('load-track')
  async handleLoadTrack(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; item: QueueItem },
  ) {
    if (!(await this.assertHost(client, data.code))) return;

    this.logger.log(`Room ${data.code.toUpperCase()}: Loading track "${data.item.title}"`);
    await this.queueService.setCurrentFromItem(data.code, data.item);
    const playback = await this.syncService.loadTrack(data.code, data.item);
    const queueState = await this.queueService.getQueue(data.code);

    this.broadcastPlayback(data.code, playback);
    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: queueState.items,
      currentIndex: queueState.currentIndex,
    });
  }

  @SubscribeMessage('play')
  async handlePlay(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; positionMs?: number },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    if (await this.socketRateLimiter.isRateLimited(client.id, 'playback-control', 10, 5)) {
      client.emit('error', { message: 'Too many playback actions. Please slow down.' });
      return;
    }

    this.logger.log(`Room ${data.code.toUpperCase()}: Play requested at position ${data.positionMs ?? 'current'}ms`);
    const playback = await this.syncService.play(data.code, data.positionMs);
    this.broadcastPlayback(data.code, playback);
  }

  @SubscribeMessage('pause')
  async handlePause(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; positionMs?: number },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    if (await this.socketRateLimiter.isRateLimited(client.id, 'playback-control', 10, 5)) {
      client.emit('error', { message: 'Too many playback actions. Please slow down.' });
      return;
    }

    this.logger.log(`Room ${data.code.toUpperCase()}: Pause requested at position ${data.positionMs ?? 'current'}ms`);
    const playback = await this.syncService.pause(data.code, data.positionMs);
    this.broadcastPlayback(data.code, playback);
  }

  @SubscribeMessage('seek')
  async handleSeek(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; positionMs: number },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    if (await this.socketRateLimiter.isRateLimited(client.id, 'playback-control', 10, 5)) {
      client.emit('error', { message: 'Too many playback actions. Please slow down.' });
      return;
    }

    this.logger.log(`Room ${data.code.toUpperCase()}: Seek requested to ${data.positionMs}ms`);
    const playback = await this.syncService.seek(data.code, data.positionMs);
    this.broadcastPlayback(data.code, playback);
  }

  @SubscribeMessage('next-track')
  async handleNextTrack(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string },
  ) {
    if (!(await this.assertHost(client, data.code))) return;

    this.logger.log(`Room ${data.code.toUpperCase()}: Advancing to next track`);
    const room = await this.roomService.getRoom(data.code).catch(() => null);
    const repeatMode = room?.playback?.repeatMode ?? 'off';
    const { state, item } = await this.queueService.advanceQueue(data.code, repeatMode);
    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });

    if (item) {
      this.logger.log(`Room ${data.code.toUpperCase()}: Next track is "${item.title}"`);
      const playback = await this.syncService.loadTrack(data.code, item);
      playback.repeatMode = repeatMode;
      this.broadcastPlayback(data.code, playback);
    } else {
      this.logger.log(`Room ${data.code.toUpperCase()}: Queue empty, stopping playback`);
      const playback = await this.syncService.stop(data.code);
      playback.repeatMode = repeatMode;
      this.broadcastPlayback(data.code, playback);
    }
  }

  @SubscribeMessage('playback-prev')
  async handlePlaybackPrev(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string },
  ) {
    if (!(await this.assertHost(client, data.code))) return;

    this.logger.log(`Room ${data.code.toUpperCase()}: Going back to previous track`);
    const { state, item } = await this.queueService.regressQueue(data.code);
    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });

    if (item) {
      this.logger.log(`Room ${data.code.toUpperCase()}: Previous track is "${item.title}"`);
      const playback = await this.syncService.loadTrack(data.code, item);
      this.broadcastPlayback(data.code, playback);
    } else {
      this.logger.log(`Room ${data.code.toUpperCase()}: No previous track available`);
    }
  }

  @SubscribeMessage('queue-add')
  async handleQueueAdd(
    @ConnectedSocket() client: AppSocket,
    @MessageBody()
    data: { code: string; item: Omit<QueueItem, 'id' | 'addedAt'> },
  ) {
    const info = this.socketMembers.get(client.id);
    if (!info) return;

    if (await this.socketRateLimiter.isRateLimited(client.id, 'queue-add', 10, 60)) {
      client.emit('error', { message: 'Too many tracks added. Please slow down.' });
      return;
    }

    this.logger.log(`Room ${data.code.toUpperCase()}: Member ${info.memberId} adding track "${data.item.title}" to queue`);
    const item = {
      ...data.item,
      addedBy: info.memberId,
    };

    const state = await this.queueService.addItem(data.code, item);
    const room = await this.roomService.getRoom(data.code);
    const isHostUser = this.roomService.isHost(room, info.memberId);

    if (!room.playback.videoId && state.currentIndex >= 0) {
      const current = state.items[state.currentIndex];
      if (current) {
        this.logger.log(`Room ${data.code.toUpperCase()}: Queue was empty, loading added track automatically`);
        const playback = await this.syncService.loadTrack(data.code, current);
        this.broadcastPlayback(data.code, playback);
      }
    }

    if (!isHostUser) {
      client.emit('info', { message: 'Track added to queue! Host controls playback start.' });
    }

    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });
  }

  @SubscribeMessage('queue-remove')
  async handleQueueRemove(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; itemId: string },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    this.logger.log(`Room ${data.code.toUpperCase()}: Removing item ${data.itemId} from queue`);
    const state = await this.queueService.removeItem(data.code, data.itemId);
    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });
  }

  @SubscribeMessage('queue-reorder')
  async handleQueueReorder(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; fromIndex: number; toIndex: number },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    this.logger.log(`Room ${data.code.toUpperCase()}: Reordering queue from ${data.fromIndex} to ${data.toIndex}`);
    const state = await this.queueService.reorderItem(
      data.code,
      data.fromIndex,
      data.toIndex,
    );
    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });
  }

  @SubscribeMessage('queue-shuffle')
  async handleQueueShuffle(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    const info = this.socketMembers.get(client.id);
    if (!info) return;

    this.logger.log(`Room ${data.code.toUpperCase()}: Shuffling upcoming queue items`);
    const state = await this.queueService.shuffleQueue(data.code);
    const room = await this.roomService.getRoom(data.code);
    const member = room.members.find((m) => m.id === info.memberId);
    const isHost = room.hostId === info.memberId;
    const name = isHost ? 'Host' : (member?.name ?? 'Someone');

    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });
    this.server.to(data.code.toUpperCase()).emit('queue-shuffled', {
      memberId: info.memberId,
      memberName: name,
    });
  }

  @SubscribeMessage('set-repeat')
  async handleSetRepeat(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; mode: RepeatMode },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    const info = this.socketMembers.get(client.id);
    if (!info) return;

    this.logger.log(`Room ${data.code.toUpperCase()}: Setting repeat mode to "${data.mode}"`);
    const room = await this.roomService.getRoom(data.code);
    const member = room.members.find((m) => m.id === info.memberId);
    const isHost = room.hostId === info.memberId;
    const name = isHost ? 'Host' : (member?.name ?? 'Someone');

    room.playback.repeatMode = data.mode;
    await this.roomService.saveRoom(room);
    this.broadcastPlayback(data.code, room.playback);

    this.server.to(data.code.toUpperCase()).emit('repeat-changed', {
      memberId: info.memberId,
      memberName: name,
      mode: data.mode,
    });
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; memberId: string; positionMs?: number },
  ) {
    await this.presenceService.heartbeat(data.code, data.memberId);

    const room = await this.roomService.getRoom(data.code).catch(() => null);
    if (!room) return;

    const info = this.socketMembers.get(client.id);
    if (!info || info.memberId !== room.hostId) return;

    const positionMs =
      data.positionMs ?? this.syncService.calculateCurrentPosition(room.playback);

    this.server.to(data.code.toUpperCase()).emit('sync', {
      positionMs,
      playing: room.playback.playing,
      startedAt: room.playback.playing ? Date.now() : null,
    });
  }

  private async joinSocketToRoom(
    client: AppSocket,
    code: string,
    memberId: string,
  ) {
    const upperCode = code.toUpperCase();
    client.data.code = upperCode;
    client.data.memberId = memberId;
    await client.join(upperCode);
    this.socketMembers.set(client.id, { code: upperCode, memberId });
    await this.presenceService.registerMember(upperCode, memberId);
  }

  private async assertHost(client: AppSocket, code: string): Promise<boolean> {
    const info = this.socketMembers.get(client.id);
    if (!info) {
      this.logger.warn(`Host assertion failed: client ${client.id} is not associated with any room`);
      client.emit('error', { message: 'Not in a room' });
      return false;
    }

    const room = await this.roomService.getRoom(code).catch(() => null);
    if (!room || !this.roomService.isHost(room, info.memberId)) {
      this.logger.warn(`Host assertion failed for member ${info.memberId} in room ${code}`);
      client.emit('error', { message: 'Only the host can control playback' });
      return false;
    }

    return true;
  }

  private broadcastPlayback(code: string, playback: import('@syncroom/shared').PlaybackState) {
    this.server.to(code.toUpperCase()).emit('playback-updated', { playback });
    this.server.to(code.toUpperCase()).emit('sync', {
      positionMs: playback.positionMs,
      playing: playback.playing,
      startedAt: playback.startedAt,
    });
  }
}
