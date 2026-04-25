import { io, Socket } from 'socket.io-client';

type PresenceCallback = (event: any) => void;

class PresenceWebSocket {
  private socket: Socket | null = null;
  private callbacks: PresenceCallback[] = [];

  connect(url?: string): void {
    const wsUrl =
      url ||
      import.meta.env.VITE_PRESENCE_WS_URL ||
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL ||
      '';

    if (!wsUrl) {
      console.info(
        'Presence WebSocket: no VITE_API_URL/VITE_WS_URL set, skipping realtime connection.',
      );
      return;
    }

    if (this.socket?.connected) return;

    this.socket = io(`${wsUrl}/presence`, {
      // Must match server-side WebSocketGateway `path` in
      // services/student-presence/src/modules/realtime/websocket.gateway.ts.
      path: '/ws/presence',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 5000,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Presence WebSocket connected');
    });

    this.socket.on('presence:updated', (event) => {
      console.log('Presence update received:', event);
      this.callbacks.forEach((cb) => cb(event));
    });

    this.socket.on('disconnect', () => {
      console.log('Presence WebSocket disconnected');
    });

    let errorLogged = false;
    this.socket.on('connect_error', (error) => {
      if (!errorLogged) {
        console.warn(
          'Presence WebSocket unavailable (',
          error.message,
          ') \u2014 continuing without realtime presence.',
        );
        errorLogged = true;
      }
    });

    this.socket.io.on('reconnect_failed', () => {
      console.warn('Presence WebSocket: giving up after retry attempts.');
      this.socket?.disconnect();
      this.socket = null;
    });
  }

  subscribe(callback: PresenceCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
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
