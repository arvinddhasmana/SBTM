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
      'http://localhost:3003';

    if (this.socket?.connected) return;

    this.socket = io(`${wsUrl}/alerts`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
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

    this.socket.on('connect_error', (error) => {
      console.error('Alerts WebSocket connection error:', error);
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
