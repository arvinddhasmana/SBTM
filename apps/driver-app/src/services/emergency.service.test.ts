import { EmergencyService } from './emergency.service';
import api from './api.service';
import { OfflineQueueService } from './offline-queue.service';

jest.mock('./api.service', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

jest.mock('./offline-queue.service', () => ({
  OfflineQueueService: {
    enqueue: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('EmergencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- triggerPanic ---

  it('should send a panic event to the API', async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await EmergencyService.triggerPanic('bus-1', 'route-1', { lat: 45.0, lng: -75.0 }, 'driver-1');

    expect(api.post).toHaveBeenCalledWith(
      '/emergency-events',
      expect.objectContaining({
        vehicleId: 'bus-1',
        routeId: 'route-1',
        eventType: 'PANIC_BUTTON',
        lat: 45.0,
        lng: -75.0,
        driverId: 'driver-1',
      }),
    );
  });

  it('should flush offline queue after successful panic event', async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await EmergencyService.triggerPanic('bus-1', 'route-1', { lat: 45.0, lng: -75.0 });

    expect(OfflineQueueService.flush).toHaveBeenCalled();
  });

  it('should enqueue the event when API call fails for panic', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    await EmergencyService.triggerPanic('bus-1', 'route-1', { lat: 45.0, lng: -75.0 });

    expect(OfflineQueueService.enqueue).toHaveBeenCalledWith(
      'emergency',
      '/emergency-events',
      expect.objectContaining({
        vehicleId: 'bus-1',
        eventType: 'PANIC_BUTTON',
      }),
    );
  });

  // --- reportIncident ---

  it('should send an incident report to the API', async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await EmergencyService.reportIncident(
      'bus-1',
      'route-1',
      { lat: 45.0, lng: -75.0 },
      'Minor accident',
      'driver-1',
    );

    expect(api.post).toHaveBeenCalledWith(
      '/emergency-events',
      expect.objectContaining({
        eventType: 'INCIDENT',
        description: 'Minor accident',
        driverId: 'driver-1',
      }),
    );
  });

  it('should enqueue the incident when API call fails', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Offline'));

    await EmergencyService.reportIncident(
      'bus-1',
      'route-1',
      { lat: 45.0, lng: -75.0 },
      'Mechanical issue',
    );

    expect(OfflineQueueService.enqueue).toHaveBeenCalledWith(
      'emergency',
      '/emergency-events',
      expect.objectContaining({
        eventType: 'INCIDENT',
        description: 'Mechanical issue',
      }),
    );
  });

  // --- flushOfflineQueue ---

  it('should flush the offline queue on demand', async () => {
    await EmergencyService.flushOfflineQueue();

    expect(OfflineQueueService.flush).toHaveBeenCalled();
  });

  it('should include timestamp in emergency events', async () => {
    (api.post as jest.Mock).mockResolvedValue({});

    await EmergencyService.triggerPanic('bus-1', 'route-1', { lat: 0, lng: 0 });

    const payload = (api.post as jest.Mock).mock.calls[0][1];
    expect(payload.timestamp).toBeDefined();
    // Validate it's a valid ISO date string
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  });
});
