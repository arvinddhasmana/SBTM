
import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { WebsocketGateway } from './websocket.gateway';

@Controller('api/v1/alerts')
export class SseController {
    constructor(private readonly gateway: WebsocketGateway) { }

    @Sse('stream')
    stream(): Observable<MessageEvent> {
        return this.gateway.getAlertStream().pipe(
            map((alert) => ({
                data: alert,
            } as MessageEvent)),
        );
    }
}
