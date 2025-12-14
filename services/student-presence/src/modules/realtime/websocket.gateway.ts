
import {
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    namespace: '/ws/presence',
    cors: {
        origin: '*',
    },
})
export class WebsocketGateway {
    private readonly logger = new Logger(WebsocketGateway.name);

    @WebSocketServer()
    server: Server;

    broadcastPresenceEvent(event: {
        studentId: string;
        routeId: string;
        eventType: string;
        timestamp: string;
    }): void {
        this.logger.log(`Broadcasting presence event: ${event.eventType} for student ${event.studentId}`);

        this.server.emit('presence:updated', event);

        // Emit specific events based on type
        if (event.eventType === 'BOARD') {
            this.server.emit('student:boarded', event);
        } else if (event.eventType === 'ALIGHT') {
            this.server.emit('student:alighted', event);
        }
    }
}
