import { Module } from '@nestjs/common';
import { SyncGateway } from './sync.gateway';
import { RoomModule } from '../room/room.module';
import { QueueModule } from '../queue/queue.module';
import { SyncModule } from '../sync/sync.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [RoomModule, QueueModule, SyncModule, PresenceModule],
  providers: [SyncGateway],
})
export class GatewayModule {}
