import type { StudentPresence } from '../../types';

type PresenceCallback = (presence: StudentPresence) => void;

class PresenceWebSocket {
    private ws: WebSocket | null = null;
    private callbacks: PresenceCallback[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    connect(url?: string): void {
        const wsUrl = url || import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/presence';

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Presence WebSocket connected');
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const presence: StudentPresence = JSON.parse(event.data);
                    this.callbacks.forEach(cb => cb(presence));
                } catch (error) {
                    console.error('Error parsing presence message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('Presence WebSocket closed');
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('Presence WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect to presence WebSocket:', error);
            this.attemptReconnect();
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            this.reconnectTimeout = setTimeout(() => {
                console.log(`Attempting to reconnect presence WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, delay);
        }
    }

    subscribe(callback: PresenceCallback): () => void {
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

export const presenceWs = new PresenceWebSocket();
