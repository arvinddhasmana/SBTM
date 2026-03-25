import { GeofenceService } from '../../src/services/geofenceService';
import prisma from '../../src/prisma';
import { gpsEventPublisher } from '../../src/services/gpsEventPublisher';

// Mock prisma client
jest.mock('../../src/prisma', () => ({
    __esModule: true,
    default: {
        routeGeofence: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            upsert: jest.fn(),
        },
        routeDeviationEvent: {
            create: jest.fn(),
        },
        $queryRaw: jest.fn(),
    },
}));

// Mock the event publisher so no real Redis calls are made
jest.mock('../../src/services/gpsEventPublisher', () => ({
    gpsEventPublisher: {
        publishRouteDeviation: jest.fn().mockResolvedValue(undefined),
    },
}));

describe('GeofenceService (Unit)', () => {
    let service: GeofenceService;

    beforeEach(() => {
        service = new GeofenceService();
        jest.clearAllMocks();
    });

    describe('upsert', () => {
        it('should create a new geofence config', async () => {
            const mockRecord = {
                id: 'geo-001',
                schoolId: 'school-001',
                routeId: 'route-001',
                corridorRadiusMeters: 200,
                stopProximityMeters: 50,
                deviationThresholdMeters: 300,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            (prisma.routeGeofence.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.routeGeofence.upsert as jest.Mock).mockResolvedValue(mockRecord);

            const result = await service.upsert({
                schoolId: 'school-001',
                routeId: 'route-001',
                corridorRadiusMeters: 200,
            });

            expect(result.routeId).toBe('route-001');
            expect(result.schoolId).toBe('school-001');
            expect(prisma.routeGeofence.upsert).toHaveBeenCalled();
        });

        it('should throw when schoolId does not match existing record (tenant isolation)', async () => {
            (prisma.routeGeofence.findUnique as jest.Mock).mockResolvedValue({
                id: 'geo-001',
                schoolId: 'other-school',
                routeId: 'route-001',
            });

            await expect(
                service.upsert({ schoolId: 'school-001', routeId: 'route-001' }),
            ).rejects.toThrow('tenant isolation violation');
        });
    });

    describe('checkDeviation', () => {
        const params = {
            vehicleId: 'vehicle-001',
            routeId: 'route-001',
            schoolId: 'school-001',
            lat: 43.7,
            lng: -79.5,
            timestamp: new Date().toISOString(),
        };

        it('should return deviated=false when no geofence is configured', async () => {
            (prisma.routeGeofence.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await service.checkDeviation(params);

            expect(result.deviated).toBe(false);
            expect(result.deviationMeters).toBeNull();
        });

        it('should return deviated=false when vehicle is within threshold', async () => {
            (prisma.routeGeofence.findFirst as jest.Mock).mockResolvedValue({
                id: 'geo-001',
                deviationThresholdMeters: 300,
                routeId: 'route-001',
                schoolId: 'school-001',
            });
            // Simulate PostGIS returning 50m — within 300m threshold
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ min_dist: 50 }]);

            const result = await service.checkDeviation(params);

            expect(result.deviated).toBe(false);
            expect(result.deviationMeters).toBe(50);
            expect(prisma.routeDeviationEvent.create).not.toHaveBeenCalled();
        });

        it('should return deviated=true and persist event when vehicle exceeds threshold', async () => {
            (prisma.routeGeofence.findFirst as jest.Mock).mockResolvedValue({
                id: 'geo-001',
                deviationThresholdMeters: 300,
                routeId: 'route-001',
                schoolId: 'school-001',
            });
            // Simulate PostGIS returning 500m — beyond 300m threshold
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ min_dist: 500 }]);
            (prisma.routeDeviationEvent.create as jest.Mock).mockResolvedValue({ id: 'dev-001' });

            const result = await service.checkDeviation(params);

            expect(result.deviated).toBe(true);
            expect(result.deviationMeters).toBe(500);
            expect(prisma.routeDeviationEvent.create).toHaveBeenCalled();
            expect(gpsEventPublisher.publishRouteDeviation).toHaveBeenCalled();
        });

        it('should return deviated=false when PostGIS returns no history rows', async () => {
            (prisma.routeGeofence.findFirst as jest.Mock).mockResolvedValue({
                id: 'geo-001',
                deviationThresholdMeters: 300,
                routeId: 'route-001',
                schoolId: 'school-001',
            });
            (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ min_dist: null }]);

            const result = await service.checkDeviation(params);

            expect(result.deviated).toBe(false);
        });
    });
});
