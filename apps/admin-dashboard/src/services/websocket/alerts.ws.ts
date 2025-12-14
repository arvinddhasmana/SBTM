import type { Alert } from '../../types';

type AlertCallback = (alert: Alert) => void;

class AlertsWebSocket {
    private ws: WebSocket | null = null;
    private callbacks: AlertCallback[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    connect(url?: string): void {
        const wsUrl = url || import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/alerts';

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Alerts WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const alert: Alert = JSON.parse(event.data);
                    this.callbacks.forEach(cb => cb(alert));
                } catch (error) {
                    console.error('Error parsing alert message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('Alerts WebSocket closed');
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('Alerts WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect to alerts WebSocket:', error);
            this.attemptReconnect();
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            this.reconnectTimeout = setTimeout(() => {
                console.log(`Attempting to reconnect alerts WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, delay);
        }
    }

    subscribe(callback: AlertCallback): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    disconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.callbacks = [];
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

export const alertsWs = new AlertsWebSocket();
