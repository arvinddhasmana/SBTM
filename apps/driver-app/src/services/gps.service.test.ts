import { GPSService } from './gps.service';
import api from './api.service';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('./api.service', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
  })),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('./offline-queue.service', () => ({
  OfflineQueueService: {
    enqueue: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  watchPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

describe('GPSService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request permissions', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    await GPSService.requestPermissions();
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it('should throw error if permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    await expect(GPSService.requestPermissions()).rejects.toThrow(
      'Permission to access location was denied',
    );
  });

  it('should start tracking and send updates', async () => {
    const mockCallback = jest.fn();
    (Location.watchPositionAsync as jest.Mock).mockImplementation((options, cb) => {
      mockCallback.mockImplementation(cb);
      return Promise.resolve({ remove: jest.fn() });
    });

    await GPSService.startTracking('route-1', 'bus-1', 'driver-1');

    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: 6 }),
      expect.any(Function),
    );

    // Simulate a location update
    const mockLocation = {
      coords: {
        latitude: 10,
        longitude: 20,
        speed: 15, // m/s
        heading: 90,
        accuracy: 5,
      },
      timestamp: 1672531200000,
    };

    // Trigger the callback captured by the mock (simulating the watch event)
    // Since we can't easily access the callback passed to the mock in this structure without storing it,
    // we'll rely on the fact that we mocked the implementation to just call the cb if we wanted,
    // OR we can manually invoke it if we grab it from calls.

    const callback = (Location.watchPositionAsync as jest.Mock).mock.calls[0][1];
    await callback(mockLocation);

    expect(api.post).toHaveBeenCalledWith(
      '/routes/locations',
      expect.objectContaining({
        vehicleId: 'bus-1',
        routeId: 'route-1',
        lat: 10,
        lng: 20,
        speedKph: 54, // 15 * 3.6
      }),
    );
  });
});
