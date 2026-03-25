import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Subject, Observable } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'alerts',
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
