import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis/redis.module';
import { RoomModule } from './room/room.module';
import { QueueModule } from './queue/queue.module';
import { SearchModule } from './search/search.module';
import { SyncModule } from './sync/sync.module';
import { PresenceModule } from './presence/presence.module';
import { GatewayModule } from './gateway/gateway.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    RoomModule,
    QueueModule,
    SearchModule,
    SyncModule,
    PresenceModule,
    GatewayModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
