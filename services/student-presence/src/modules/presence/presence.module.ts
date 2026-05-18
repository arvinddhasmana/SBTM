import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { PresenceProcessor } from './presence.processor';
import { BoardingEvent } from './entities/boarding-event.entity';
import { PresenceNotificationLog } from './entities/presence-notification-log.entity';
import { TagsModule } from '../tags/tags.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BoardingEvent, PresenceNotificationLog]),
    BullModule.registerQueue({
      name: 'presence',
    }),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    TagsModule,
    RealtimeModule,
  ],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceProcessor],
  exports: [PresenceService],
})
export class PresenceModule {}
