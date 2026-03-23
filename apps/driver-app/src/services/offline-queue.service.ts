import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@sbtm/offline_queue';
const MAX_QUEUE_SIZE = 500;
const MAX_RETRIES = 5;

export interface OfflineEvent {
    id: string;
    type: 'gps' | 'emergency' | 'presence';
    endpoint: string;
    payload: unknown;
    retries: number;
    createdAt: string;
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function readQueue(): Promise<OfflineEvent[]> {
    try {
        const raw = await AsyncStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('OfflineQueueService: failed to read queue', err);
        return [];
    }
}

async function writeQueue(queue: OfflineEvent[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export const OfflineQueueService = {
    async enqueue(type: OfflineEvent['type'], endpoint: string, payload: unknown): Promise<void> {
        const queue = await readQueue();
        const event: OfflineEvent = {
            id: generateId(),
            type,
            endpoint,
            payload,
            retries: 0,
            createdAt: new Date().toISOString(),
        };

        // Evict oldest entry if at capacity
        if (queue.length >= MAX_QUEUE_SIZE) {
            queue.shift();
        }

        queue.push(event);
        await writeQueue(queue);
    },

    async flush(poster: (endpoint: string, payload: unknown) => Promise<void>): Promise<void> {
        const queue = await readQueue();
        if (queue.length === 0) return;

        const remaining: OfflineEvent[] = [];

        for (const event of queue) {
            try {
                await poster(event.endpoint, event.payload);
                // Successfully sent – do not re-add to queue
            } catch (err) {
                console.error('OfflineQueueService: failed to post event', event.type, err);
                const updated = { ...event, retries: event.retries + 1 };
                if (updated.retries < MAX_RETRIES) {
                    remaining.push(updated);
                }
                // Drop after MAX_RETRIES
            }
        }

        await writeQueue(remaining);
    },

    async size(): Promise<number> {
        const queue = await readQueue();
        return queue.length;
    },

    async clear(): Promise<void> {
        await writeQueue([]);
    },
};
