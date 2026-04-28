import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  // Distinct HTTP path so the cluster ingress can route this Socket.IO
  // endpoint to student-presence (the api-gateway owns the default
  // `/socket.io` path). Namespace is now `/presence` (the previous
  // `/ws/presence` namespace overlapped with the path).
  path: '/ws/presence',
  namespace: '/presence',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
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
    this.logger.log(
      `Broadcasting presence event: ${event.eventType} for student ${event.studentId}`,
    );

    this.server.emit('presence:updated', event);

    // Emit specific events based on type
    if (event.eventType === 'BOARD') {
      this.server.emit('student:boarded', event);
    } else if (event.eventType === 'ALIGHT') {
      this.server.emit('student:alighted', event);
    }
  }
}
