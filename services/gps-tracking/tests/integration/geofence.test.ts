import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/prisma';
import { makeServiceToken } from '../helpers/serviceToken';

const SERVICE_TOKEN = makeServiceToken();

// Mock the geofence service — integration tests focus on HTTP contract,
// not on PostGIS queries which require a live database
jest.mock('../../src/services/geofenceService', () => {
    return {
        GeofenceService: jest.fn().mockImplementation(() => ({
            upsert: jest.fn().mockResolvedValue({
                id: 'geo-001',
                schoolId: 'school-001',
                routeId: 'route-001',
                corridorRadiusMeters: 200,
                stopProximityMeters: 50,
                deviationThresholdMeters: 300,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }),
            findByRoute: jest.fn().mockResolvedValue({
                id: 'geo-001',
                schoolId: 'school-001',
                routeId: 'route-001',
                corridorRadiusMeters: 200,
                stopProximityMeters: 50,
                deviationThresholdMeters: 300,
            }),
            getDeviationHistory: jest.fn().mockResolvedValue([]),
            checkDeviation: jest.fn().mockResolvedValue({ deviated: false, deviationMeters: null }),
        })),
    };
});

describe('Geofence API (Integration)', () => {
    describe('PUT /api/v1/geofences', () => {
        it('should create a geofence config and return 200', async () => {
            const res = await request(app)
                .put('/api/v1/geofences')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`)
                .send({
                    schoolId: 'school-001',
                    routeId: 'route-001',
                    corridorRadiusMeters: 200,
                    stopProximityMeters: 50,
                    deviationThresholdMeters: 300,
                });

            expect(res.status).toBe(200);
            expect(res.body.routeId).toBe('route-001');
            expect(res.body.schoolId).toBe('school-001');
        });

        it('should return 400 for missing required fields', async () => {
            const res = await request(app)
                .put('/api/v1/geofences')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`)
                .send({ routeId: 'route-001' }); // missing schoolId

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/routes/:routeId/geofence', () => {
        it('should return 200 and geofence config when it exists', async () => {
            const res = await request(app)
                .get('/api/v1/routes/route-001/geofence?schoolId=school-001')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body.routeId).toBe('route-001');
        });

        it('should return 400 when schoolId query param is missing', async () => {
            const res = await request(app)
                .get('/api/v1/routes/route-001/geofence')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/routes/:routeId/deviations', () => {
        it('should return 200 and empty array when no deviations', async () => {
            const res = await request(app)
                .get('/api/v1/routes/route-001/deviations?schoolId=school-001')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return 400 for invalid limit value', async () => {
            const res = await request(app)
                .get('/api/v1/routes/route-001/deviations?schoolId=school-001&limit=999')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`);

            expect(res.status).toBe(400);
        });

        it('should return 400 when schoolId is missing', async () => {
            const res = await request(app)
                .get('/api/v1/routes/route-001/deviations')
                .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
            expect(res.status).toBe(400);
        });
    });
});
