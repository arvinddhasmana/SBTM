import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Subject, Observable } from 'rxjs';

@WebSocketGateway({
  // Distinct HTTP path so the cluster ingress can route this Socket.IO
  // endpoint to emergency-alerts (the api-gateway owns the default
  // `/socket.io` path).
  path: '/ws/alerts',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
  },
  namespace: '/alerts',
})
export class WebsocketGateway {
  @WebSocketServer()
  server: Server;

  private alertSubject = new Subject<any>();

  broadcastAlert(alert: any) {
    this.server.emit('emergency-alert', alert);
    this.alertSubject.next(alert);
  }

  getAlertStream(): Observable<any> {
    return this.alertSubject.asObservable();
  }
}
