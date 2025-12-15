import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/ws/video-events',
})
export class VideoEventsGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(VideoEventsGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('subscribe')
    handleSubscribe(
        @MessageBody() data: { userId: string; role: string },
        @ConnectedSocket() client: Socket,
    ) {
        this.logger.log(
            `User ${data.userId} with role ${data.role} subscribed to video events`,
        );

        // Join room based on role
        if (data.role === 'ADMIN') {
            client.join('admins');
            this.logger.log(`Client ${client.id} joined admins room`);
        } else if (data.role === 'DRIVER') {
            client.join(`driver:${data.userId}`);
            this.logger.log(`Client ${client.id} joined driver room`);
        }

        return { success: true, message: 'Subscribed to video events' };
    }

    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(@ConnectedSocket() client: Socket) {
        this.logger.log(`Client ${client.id} unsubscribed`);
        client.rooms.forEach((room) => {
            if (room !== client.id) {
                client.leave(room);
            }
        });
        return { success: true, message: 'Unsubscribed from video events' };
    }

    // Method to broadcast new video event to admins
    notifyNewVideoEvent(videoEvent: any) {
        this.logger.log(`Broadcasting new video event: ${videoEvent.id}`);
        this.server.to('admins').emit('new-video-event', videoEvent);
    }

    // Method to notify specific driver about their video event
    notifyDriver(driverId: string, videoEvent: any) {
        this.logger.log(`Notifying driver ${driverId} about video event`);
        this.server.to(`driver:${driverId}`).emit('video-event-update', videoEvent);
    }

    // Method to broadcast video event status change
    notifyVideoEventStatusChange(videoEvent: any) {
        this.logger.log(`Broadcasting video event status change: ${videoEvent.id}`);
        this.server.to('admins').emit('video-event-status-change', videoEvent);
    }
}
