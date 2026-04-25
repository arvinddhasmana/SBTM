import { io, Socket } from 'socket.io-client';
import type { Alert } from '../../types';

type AlertCallback = (alert: Alert) => void;

class AlertsWebSocket {
  private socket: Socket | null = null;
  private callbacks: AlertCallback[] = [];

  connect(url?: string): void {
    const wsUrl =
      url ||
      import.meta.env.VITE_ALERTS_WS_URL ||
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL ||
      '';

    if (!wsUrl) {
      console.info(
        'Alerts WebSocket: no VITE_API_URL/VITE_WS_URL set, skipping realtime connection.',
      );
      return;
    }

    if (this.socket?.connected) return;

    this.socket = io(`${wsUrl}/alerts`, {
      // Must match server-side WebSocketGateway `path` in
      // services/emergency-alerts/src/modules/realtime/websocket.gateway.ts.
      // The cluster ingress routes `/ws/alerts` to the emergency-alerts pod;
      // local dev routes it through Vite proxy to localhost:3002.
      path: '/ws/alerts',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      timeout: 5000,
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Alerts WebSocket connected');
    });

    this.socket.on('emergency-alert', (alert: Alert) => {
      this.callbacks.forEach((cb) => cb(alert));
    });

    this.socket.on('disconnect', () => {
      console.log('Alerts WebSocket disconnected');
    });

    let errorLogged = false;
    this.socket.on('connect_error', (error) => {
      if (!errorLogged) {
        console.warn(
          'Alerts WebSocket unavailable (',
          error.message,
          ') \u2014 continuing without realtime alerts.',
        );
        errorLogged = true;
      }
    });

    this.socket.io.on('reconnect_failed', () => {
      console.warn('Alerts WebSocket: giving up after retry attempts.');
      this.socket?.disconnect();
      this.socket = null;
    });
  }

  subscribe(callback: AlertCallback): () => void {
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

export const alertsWs = new AlertsWebSocket();
