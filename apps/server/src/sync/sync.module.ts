import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
