import { gpsEventPublisher } from '../../src/services/gpsEventPublisher';

// Mock ioredis and bullmq so no real Redis connection is opened during unit tests
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue(undefined),
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
});
