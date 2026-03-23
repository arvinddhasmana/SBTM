import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';

export type PresenceEventType = 'BOARD' | 'ALIGHT';

export interface PresenceEventDto {
    studentId: string;
    vehicleId: string;
    routeId: string;
    eventType: PresenceEventType;
    source: 'MANUAL';
    timestamp: string;
}

async function postEvent(endpoint: string, payload: unknown): Promise<void> {
    await api.post(endpoint, payload);
}

export const PresenceService = {
    sendPresenceEvent: async (dto: PresenceEventDto): Promise<void> => {
        try {
            await api.post('/student-presence-events', dto);
            // Flush any previously buffered presence events
            await OfflineQueueService.flush(postEvent);
        } catch (error) {
            console.error('Failed to send presence event, buffering for retry', error);
            await OfflineQueueService.enqueue('presence', '/student-presence-events', dto);
        }
    },
};
