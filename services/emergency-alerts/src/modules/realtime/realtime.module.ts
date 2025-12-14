
import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SseController } from './sse.controller';

@Module({
    controllers: [SseController],
    providers: [WebsocketGateway],
    exports: [WebsocketGateway],
})
export class RealtimeModule { }
