import { gpsEventPublisher } from '../../src/services/gpsEventPublisher';

// Mock ioredis and bullmq so no real Redis connection is opened during unit tests
const mockPublish = jest.fn().mockResolvedValue(1);
const mockQuit = jest.fn().mockResolvedValue(undefined);

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: mockQuit,
    publish: mockPublish,
  }));
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('GpsEventPublisher (Unit)', () => {
  afterEach(async () => {
    // Reset singleton state between tests
    await gpsEventPublisher.close();
  });

  it('should publish a location.updated event successfully', async () => {
    await expect(
      gpsEventPublisher.publishLocationUpdated({
        vehicleId: 'vehicle-001',
        routeId: 'route-001',
        schoolId: 'school-001',
        lat: 43.6532,
        lng: -79.3832,
        speedKph: 40,
        timestamp: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
  });

  it('should publish a route.deviation event successfully', async () => {
    await expect(
      gpsEventPublisher.publishRouteDeviation({
        vehicleId: 'vehicle-001',
        routeId: 'route-001',
        schoolId: 'school-001',
        lat: 43.7,
        lng: -79.5,
        deviationMeters: 450,
        threshold: 300,
        timestamp: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
  });

  it('should not throw when Redis publish fails', async () => {
    const { Queue } = require('bullmq');
    (Queue as jest.Mock).mockImplementationOnce(() => ({
      add: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
      close: jest.fn().mockResolvedValue(undefined),
    }));

    // Re-initialise the publisher after close() reset state
    // The publisher should swallow the error gracefully
    await expect(
      gpsEventPublisher.publishLocationUpdated({
        vehicleId: 'vehicle-002',
        routeId: 'route-002',
        schoolId: 'school-001',
        lat: 43.6,
        lng: -79.4,
        timestamp: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
  });

  it('should publish to Redis Pub/Sub channel gps:location-updated', async () => {
    const payload = {
      vehicleId: 'vehicle-003',
      routeId: 'route-003',
      schoolId: 'school-001',
      lat: 45.42,
      lng: -75.69,
      speedKph: 40,
      timestamp: '2026-04-08T08:00:00.000Z',
    };

    await gpsEventPublisher.publishLocationUpdated(payload);

    expect(mockPublish).toHaveBeenCalledWith('gps:location-updated', JSON.stringify(payload));
  });

  it('should not throw when Redis Pub/Sub publish fails', async () => {
    mockPublish.mockRejectedValueOnce(new Error('Pub/Sub failure'));

    await expect(
      gpsEventPublisher.publishLocationUpdated({
        vehicleId: 'vehicle-004',
        routeId: 'route-004',
        schoolId: 'school-001',
        lat: 45.43,
        lng: -75.7,
        timestamp: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined(); // must not throw
  });
});
