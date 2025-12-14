import { LocationService } from '../../src/services/locationService';
import prisma from '../../src/prisma';

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

describe('Location Service (Unit)', () => {
    let service: LocationService;

    beforeEach(() => {
        service = new LocationService();
        jest.clearAllMocks();
    });

    it('should ingest location', async () => {
        const data = {
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: new Date().toISOString(),
            lat: 10,
            lng: 20
        };

        (prisma.locationPoint.create as jest.Mock).mockResolvedValue({ id: '123', ...data });

        await service.ingestLocation(data);

        expect(prisma.locationPoint.create).toHaveBeenCalledWith({
            data: {
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

    it('should get latest location', async () => {
        const mockLoc = {
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: new Date(),
            lat: 10,
            lng: 20
        };
        (prisma.locationPoint.findFirst as jest.Mock).mockResolvedValue(mockLoc);

        const result = await service.getLatestLocation('route-456');

        expect(result).toBeTruthy();
        expect(result?.vehicleId).toBe('bus-123');
        expect(prisma.locationPoint.findFirst).toHaveBeenCalled();
    });
});
