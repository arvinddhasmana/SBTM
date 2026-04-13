import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';

async function postEvent(endpoint: string, payload: unknown): Promise<void> {
  await api.post(endpoint, payload);
}

export const EmergencyService = {
  triggerPanic: async (
    vehicleId: string,
    routeId: string,
    location: { lat: number; lng: number },
    driverId?: string,
  ) => {
    const body = {
      vehicleId,
      routeId,
      eventType: 'PANIC_BUTTON',
      timestamp: new Date().toISOString(),
      lat: location.lat,
      lng: location.lng,
      driverId,
    };

    try {
      await api.post('/emergency-events', body);
      console.log('Emergency event sent');
      // Flush any previously buffered emergency events now that we're online
      await OfflineQueueService.flush(postEvent);
    } catch (error) {
      console.error('Failed to send emergency event, buffering for retry', error);
      await OfflineQueueService.enqueue('emergency', '/emergency-events', body);
    }
  },

  /** Flush buffered emergency events. Call when network connectivity is restored. */
  flushOfflineQueue: async () => {
    await OfflineQueueService.flush(postEvent);
  },
};
