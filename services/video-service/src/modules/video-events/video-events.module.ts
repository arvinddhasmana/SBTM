import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEventsController } from './video-events.controller';
import { VideoEventsService } from './video-events.service';
import { VideoEvent } from './entities/video-event.entity';
import { VideoAccessLog } from './entities/video-access-log.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([VideoEvent, VideoAccessLog]),
        StorageModule,
    ],
    controllers: [VideoEventsController],
    providers: [VideoEventsService],
    exports: [VideoEventsService],
})
export class VideoEventsModule { }
