import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/prisma';

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
            .send({
                vehicleId: 'bus-123',
                routeId: 'route-456',
                timestamp: new Date().toISOString(),
                lat: 10.0,
                lng: 20.0
            });
        expect(res.status).toBe(200);

        // Verify it was stored
        const stored = await prisma.locationPoint.findFirst({
            where: { vehicleId: 'bus-123' }
        });
        expect(stored).toBeTruthy();
    });

    it('should retrieve latest location', async () => {
        // Insert a fresh point
        await prisma.locationPoint.create({
            data: {
                vehicleId: 'bus-123',
                routeId: 'route-456',
                timestamp: new Date(),
                lat: 15.0,
                lng: 25.0
            }
        });

        const res = await request(app).get('/api/v1/routes/route-456/live-location');
        expect(res.status).toBe(200);
        expect(res.body.vehicleId).toBe('bus-123');
        expect(res.body.position.lat).toBe(15.0);
    });
});
