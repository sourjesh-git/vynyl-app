import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  JoinRoomAck,
  QueueItem,
  ServerToClientEvents,
} from '@syncroom/shared';
import { RoomService } from '../room/room.service';
import { QueueService } from '../queue/queue.service';
import { SyncService } from '../sync/sync.service';
import { PresenceService } from '../presence/presence.service';

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

  private readonly socketMembers = new Map<string, { code: string; memberId: string }>();

  constructor(
    private readonly roomService: RoomService,
    private readonly queueService: QueueService,
    private readonly syncService: SyncService,
    private readonly presenceService: PresenceService,
  ) {}

  handleConnection(_client: AppSocket) {}

  async handleDisconnect(client: AppSocket) {
    const info = this.socketMembers.get(client.id);
    if (!info) return;

    const { code, memberId } = info;
    this.socketMembers.delete(client.id);

    const room = await this.roomService.getRoom(code).catch(() => null);
    if (!room) return;

    const wasHost = room.hostId === memberId;
    if (wasHost) {
      this.roomService.startHostDisconnectTimeout(code, memberId, async () => {
        const currentRoom = await this.roomService.getRoom(code).catch(() => null);
        if (!currentRoom || currentRoom.hostId !== memberId) return;

        const updated = await this.roomService.removeMember(code, memberId);
        if (!updated) {
          this.server.to(code).emit('error', { message: 'Room closed' });
          return;
        }

        const newHost = updated.members.find((m) => m.isHost);
        if (newHost) {
          this.server.to(code).emit('host-changed', {
            hostId: newHost.id,
            member: newHost,
          });
        }
        this.server.to(code).emit('member-left', { memberId });
      });
    } else {
      const updated = await this.roomService.removeMember(code, memberId);
      await this.presenceService.removeMember(code, memberId);
      this.server.to(code).emit('member-left', { memberId });
      if (!updated) return;
    }
  }

  @SubscribeMessage('create-room')
  async handleCreateRoom(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { name: string },
  ): Promise<JoinRoomAck> {
    try {
      const result = await this.roomService.createRoom(data.name);
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

      return {
        success: true,
        room: result.room,
        memberId: result.memberId,
        memberName: result.memberName,
        queue: queueState.items,
        currentIndex: queueState.currentIndex,
      };
    } catch (err) {
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
    const playback = await this.syncService.play(data.code, data.positionMs);
    this.broadcastPlayback(data.code, playback);
  }

  @SubscribeMessage('pause')
  async handlePause(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; positionMs?: number },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    const playback = await this.syncService.pause(data.code, data.positionMs);
    this.broadcastPlayback(data.code, playback);
  }

  @SubscribeMessage('seek')
  async handleSeek(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string; positionMs: number },
  ) {
    if (!(await this.assertHost(client, data.code))) return;
    const playback = await this.syncService.seek(data.code, data.positionMs);
    this.broadcastPlayback(data.code, playback);
  }

  @SubscribeMessage('next-track')
  async handleNextTrack(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() data: { code: string },
  ) {
    if (!(await this.assertHost(client, data.code))) return;

    const { state, item } = await this.queueService.advanceQueue(data.code);
    this.server.to(data.code.toUpperCase()).emit('queue-updated', {
      items: state.items,
      currentIndex: state.currentIndex,
    });

    if (item) {
      const playback = await this.syncService.loadTrack(data.code, item);
      this.broadcastPlayback(data.code, playback);
    } else {
      const playback = await this.syncService.stop(data.code);
      this.broadcastPlayback(data.code, playback);
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

    const item = {
      ...data.item,
      addedBy: info.memberId,
    };

    const state = await this.queueService.addItem(data.code, item);
    const room = await this.roomService.getRoom(data.code);

    if (!room.playback.videoId && state.currentIndex >= 0) {
      const current = state.items[state.currentIndex];
      if (current && (await this.assertHost(client, data.code))) {
        const playback = await this.syncService.loadTrack(data.code, current);
        this.broadcastPlayback(data.code, playback);
      }
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
      client.emit('error', { message: 'Not in a room' });
      return false;
    }

    const room = await this.roomService.getRoom(code).catch(() => null);
    if (!room || !this.roomService.isHost(room, info.memberId)) {
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
