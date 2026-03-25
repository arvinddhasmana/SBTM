import { LocationService } from '../../src/services/locationService';
import prisma from '../../src/prisma';
import { gpsEventPublisher } from '../../src/services/gpsEventPublisher';

// Mock the prisma client default export
jest.mock('../../src/prisma', () => ({
    __esModule: true,
    default: {
        locationPoint: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

// Mock event publisher — verify it is called without touching Redis
jest.mock('../../src/services/gpsEventPublisher', () => ({
    gpsEventPublisher: {
        publishLocationUpdated: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock geofence service — prevent PostGIS calls in unit tests
jest.mock('../../src/services/geofenceService', () => ({
    GeofenceService: jest.fn().mockImplementation(() => ({
        checkDeviation: jest.fn().mockResolvedValue({ deviated: false, deviationMeters: null }),
    })),
}));

describe('Location Service (Unit)', () => {
    let service: LocationService;

    beforeEach(() => {
        service = new LocationService();
        jest.clearAllMocks();
    });

    it('should ingest location and call prisma.locationPoint.create', async () => {
        const data = {
            schoolId: 'school-001',
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: new Date().toISOString(),
            lat: 43.65,
            lng: -79.38
        };

        (prisma.locationPoint.create as jest.Mock).mockResolvedValue({ id: '123', ...data });

        await service.ingestLocation(data);

        expect(prisma.locationPoint.create).toHaveBeenCalledWith({
            data: {
                schoolId: data.schoolId,
                vehicleId: data.vehicleId,
                routeId: data.routeId,
                timestamp: expect.any(Date),
                lat: data.lat,
                lng: data.lng,
                speedKph: undefined,
                headingDeg: undefined,
                accuracyMeters: undefined,
            }
        });
    });

    it('should publish location.updated event after ingest', async () => {
        const data = {
            schoolId: 'school-001',
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: new Date().toISOString(),
            lat: 43.65,
            lng: -79.38,
            speedKph: 40,
        };
        (prisma.locationPoint.create as jest.Mock).mockResolvedValue({ id: '123' });

        await service.ingestLocation(data);

        // Allow fire-and-forget promises to settle
        await Promise.resolve();

        expect(gpsEventPublisher.publishLocationUpdated).toHaveBeenCalledWith(
            expect.objectContaining({
                vehicleId: data.vehicleId,
                routeId: data.routeId,
                schoolId: data.schoolId,
                lat: data.lat,
                lng: data.lng,
            }),
        );
    });

    it('should get latest location', async () => {
        const mockLoc = {
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: new Date(),
            lat: 10,
            lng: 20
        };
        (prisma.locationPoint.findFirst as jest.Mock).mockResolvedValue(mockLoc);

        const result = await service.getLatestLocation('route-456', 'school-001');

        expect(result).toBeTruthy();
        expect(result?.vehicleId).toBe('bus-123');
        expect(prisma.locationPoint.findFirst).toHaveBeenCalled();
    });

    it('should return null when no location exists for route', async () => {
        (prisma.locationPoint.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await service.getLatestLocation('route-unknown', 'school-001');
        expect(result).toBeNull();
    });
});
