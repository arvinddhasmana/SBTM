import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';
import type { BleDetection } from '../types';

export type PresenceEventType = 'BOARD' | 'ALIGHT';

export interface PresenceEventDto {
    studentId: string;
    vehicleId: string;
    routeId: string;
    schoolId: string;
    eventType: PresenceEventType;
    source: 'MANUAL';
    timestamp: string;
}

export interface BlePresencePayload {
    schoolId: string;
    vehicleId: string;
    routeId: string;
    timestamp: string;
    detections: BleDetection[];
}

export interface ServerPresenceStudent {
    studentId: string;
    name?: string;
    status: 'BOARDED' | 'ALIGHTED' | 'UNKNOWN';
    lastSeen?: string;
}

const PRESENCE_ENDPOINT = '/student-presence-events';
const BLE_ENDPOINT = '/presence-events';

async function postEvent(endpoint: string, payload: unknown): Promise<void> {
    await api.post(endpoint, payload);
}

export const PresenceService = {
    sendPresenceEvent: async (dto: PresenceEventDto): Promise<{ presenceEventId?: string }> => {
        try {
            const response = await api.post<{ presenceEventId: string }>(PRESENCE_ENDPOINT, dto);
            // Flush any previously buffered presence events
            await OfflineQueueService.flush(postEvent);
            return response.data;
        } catch (error) {
            // Log event type and IDs only – no PII
            console.error('Failed to send presence event, buffering for retry', {
                routeId: dto.routeId,
                eventType: dto.eventType,
            });
            await OfflineQueueService.enqueue('presence', PRESENCE_ENDPOINT, dto);
            return {};
        }
    },

    sendBleDetections: async (payload: BlePresencePayload): Promise<void> => {
        try {
            await api.post(BLE_ENDPOINT, payload);
            await OfflineQueueService.flush(postEvent);
        } catch (error) {
            console.error('Failed to send BLE detections, buffering for retry', {
                routeId: payload.routeId,
                detectionCount: payload.detections.length,
            });
            await OfflineQueueService.enqueue('presence', BLE_ENDPOINT, payload);
        }
    },

    getRouteStudents: async (routeId: string): Promise<ServerPresenceStudent[]> => {
        const response = await api.get<{ students?: ServerPresenceStudent[] } | ServerPresenceStudent[]>(
            `/routes/${routeId}/students`,
        );
        const data = response.data;
        if (Array.isArray(data)) return data;
        return data.students ?? [];
    },
};
