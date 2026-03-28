import { io, Socket } from 'socket.io-client';

type PresenceCallback = (event: any) => void;

class PresenceWebSocket {
    private socket: Socket | null = null;
    private callbacks: PresenceCallback[] = [];

    connect(url?: string): void {
        const wsUrl = url || import.meta.env.VITE_WS_URL || 'http://localhost:3004';

        if (this.socket?.connected) return;

        this.socket = io(`${wsUrl}/ws/presence`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('Presence WebSocket connected');
        });

        this.socket.on('presence:updated', (event) => {
            console.log('Presence update received:', event);
            this.callbacks.forEach(cb => cb(event));
        });

        this.socket.on('disconnect', () => {
            console.log('Presence WebSocket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Presence WebSocket connection error:', error);
        });
    }

    subscribe(callback: PresenceCallback): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.callbacks = [];
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const presenceWs = new PresenceWebSocket();
