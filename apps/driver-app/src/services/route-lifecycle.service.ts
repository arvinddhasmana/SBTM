import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';
import { RouteLifecycleEventType } from '../types';

export interface RouteLifecycleEventDto {
    routeId: string;
    vehicleId: string;
    driverId: string;
    eventType: RouteLifecycleEventType;
    timestamp: string;
    stopId?: string;
}

const LIFECYCLE_ENDPOINT = '/routes/lifecycle-events';

async function postEvent(endpoint: string, payload: unknown): Promise<void> {
    await api.post(endpoint, payload);
}

export const RouteLifecycleService = {
    recordEvent: async (dto: RouteLifecycleEventDto): Promise<void> => {
        try {
            await api.post(LIFECYCLE_ENDPOINT, dto);
        } catch {
            // Non-critical – buffer and retry; do not block the driver workflow
            console.warn('Route lifecycle event buffered for retry', {
                routeId: dto.routeId,
                eventType: dto.eventType,
            });
            await OfflineQueueService.enqueue('gps', LIFECYCLE_ENDPOINT, dto);
        }
    },

    startRoute: async (routeId: string, vehicleId: string, driverId: string): Promise<void> => {
        await RouteLifecycleService.recordEvent({
            routeId,
            vehicleId,
            driverId,
            eventType: RouteLifecycleEventType.ROUTE_STARTED,
            timestamp: new Date().toISOString(),
        });
    },

    completeRoute: async (routeId: string, vehicleId: string, driverId: string): Promise<void> => {
        // Flush offline queue before marking route complete so events arrive in order
        try {
            await OfflineQueueService.flush(postEvent);
        } catch {
            // Best-effort flush; don't block route completion
        }
        await RouteLifecycleService.recordEvent({
            routeId,
            vehicleId,
            driverId,
            eventType: RouteLifecycleEventType.ROUTE_COMPLETED,
            timestamp: new Date().toISOString(),
        });
    },
};
