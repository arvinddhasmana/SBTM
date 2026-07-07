import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';
import type { BleDetection } from '../types';
import type { LogPresenceEventRequest, ProcessDetectionsRequest } from '../types/presence.types';

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
  sendPresenceEvent: async (
    dto: LogPresenceEventRequest,
  ): Promise<{ presenceEventId?: string }> => {
    try {
      const response = await api.post<{ presenceEventId: string }>(PRESENCE_ENDPOINT, dto);
      await OfflineQueueService.flush(postEvent);
      return response.data;
    } catch (error: unknown) {
      // Surface backend validation/network detail so the buffered failure mode
      // is actually diagnosable. Common cause: empty runId / stopId carried
      // over from a stale persisted activeRoute — driver should re-login.
      const ax = error as { response?: { status?: number; data?: unknown }; message?: string };
      console.error('Failed to send presence event, buffering for retry', {
        routeId: dto.routeId,
        runId: dto.runId,
        stopId: dto.stopId,
        eventKind: dto.eventKind,
        status: ax.response?.status,
        serverError: ax.response?.data,
        message: ax.message,
      });
      await OfflineQueueService.enqueue('presence', PRESENCE_ENDPOINT, dto);
      return {};
    }
  },

  sendBleDetections: async (payload: ProcessDetectionsRequest): Promise<void> => {
    try {
      await api.post(BLE_ENDPOINT, payload);
      await OfflineQueueService.flush(postEvent);
    } catch {
      console.error('Failed to send BLE detections, buffering for retry', {
        routeId: payload.routeId,
        detectionCount: payload.detections.length,
      });
      await OfflineQueueService.enqueue('presence', BLE_ENDPOINT, payload);
    }
  },

  getRouteStudents: async (routeId: string): Promise<ServerPresenceStudent[]> => {
    const response = await api.get<
      { students?: ServerPresenceStudent[] } | ServerPresenceStudent[]
    >(`/routes/${routeId}/students`);
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data.students ?? [];
  },
};

// Re-export BleDetection for convenience (used in BLE hooks that import from this module)
export type { BleDetection };
