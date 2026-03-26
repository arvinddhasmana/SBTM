import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/prisma';
import { makeServiceToken } from '../helpers/serviceToken';

const SERVICE_TOKEN = makeServiceToken();

// Mock event publisher so tests don't require a live Redis connection
jest.mock('../../src/services/gpsEventPublisher', () => ({
    gpsEventPublisher: {
        publishLocationUpdated: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock geofence service so tests don't require PostGIS
jest.mock('../../src/services/geofenceService', () => ({
    GeofenceService: jest.fn().mockImplementation(() => ({
        checkDeviation: jest.fn().mockResolvedValue({ deviated: false, deviationMeters: null }),
        upsert: jest.fn(),
        findByRoute: jest.fn().mockResolvedValue(null),
        getDeviationHistory: jest.fn().mockResolvedValue([]),
    })),
}));

describe('GPS Tracking Service API (Integration)', () => {

    beforeAll(async () => {
        // Clear database before tests
        await prisma.locationPoint.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should ingest a location point', async () => {
        const res = await request(app)
            .post('/api/v1/locations')
            .set('Authorization', `Bearer ${SERVICE_TOKEN}`)
            .send({
                schoolId: 'school-001',
                vehicleId: 'bus-123',
                routeId: 'route-456',
                timestamp: new Date().toISOString(),
                lat: 10.0,
                lng: 20.0
            });
        expect(res.status).toBe(200);

        // Verify it was stored
        const stored = await prisma.locationPoint.findFirst({
            where: { vehicleId: 'bus-123', schoolId: 'school-001' }
        });
        expect(stored).toBeTruthy();
    });

    it('should reject invalid coordinates', async () => {
        const res = await request(app)
            .post('/api/v1/locations')
            .set('Authorization', `Bearer ${SERVICE_TOKEN}`)
            .send({
                schoolId: 'school-001',
                vehicleId: 'bus-123',
                routeId: 'route-456',
                timestamp: new Date().toISOString(),
                lat: 999,   // invalid latitude
                lng: 20.0
            });
        expect(res.status).toBe(400);
    });

    it('should retrieve latest location', async () => {
        // Insert a fresh point
        await prisma.locationPoint.create({
            data: {
                schoolId: 'school-001',
                vehicleId: 'bus-123',
                routeId: 'route-456',
                timestamp: new Date(),
                lat: 15.0,
                lng: 25.0
            }
        });

        const res = await request(app)
            .get('/api/v1/routes/route-456/live-location?schoolId=school-001')
            .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.vehicleId).toBe('bus-123');
        expect(res.body.position.lat).toBe(15.0);
    });
});
