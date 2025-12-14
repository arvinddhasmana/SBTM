
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { PresenceProcessor } from './presence.processor';
import { PresenceEvent } from './entities/presence-event.entity';
import { TagsModule } from '../tags/tags.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PresenceEvent]),
        BullModule.registerQueue({
            name: 'presence',
        }),
        TagsModule,
        RealtimeModule,
    ],
    controllers: [PresenceController],
    providers: [PresenceService, PresenceProcessor],
    exports: [PresenceService],
})
export class PresenceModule { }
