import { Module } from '@nestjs/common';
import { VideoEventsGateway } from './websocket.gateway';

@Module({
    providers: [VideoEventsGateway],
    exports: [VideoEventsGateway],
})
export class RealtimeModule { }
