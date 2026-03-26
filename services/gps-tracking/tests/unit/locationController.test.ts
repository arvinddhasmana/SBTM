import request from 'supertest';
import app from '../../src/app';
import { makeServiceToken } from '../helpers/serviceToken';

const SERVICE_TOKEN = makeServiceToken();

// Mock the LocationService class
jest.mock('../../src/services/locationService', () => {
    return {
        LocationService: jest.fn().mockImplementation(() => {
            return {
                ingestLocation: jest.fn().mockResolvedValue({}),
                getLatestLocation: jest.fn().mockImplementation((routeId) => {
                    if (routeId === 'route-456') {
                        return Promise.resolve({
                            vehicleId: 'bus-123',
                            routeId: 'route-456',
                            lastUpdate: new Date().toISOString(),
                            position: { lat: 10, lng: 20 }
                        });
                    }
                    return Promise.resolve(null);
                }),
                getRouteHistory: jest.fn().mockResolvedValue([])
            };
        })
    };
});

describe('Location Controller (Unit)', () => {
    it('POST /locations should return 200', async () => {
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
    });

    it('GET /live-location should return 200 and data', async () => {
        const res = await request(app)
            .get('/api/v1/routes/route-456/live-location?schoolId=school-001')
            .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
        expect(res.status).toBe(200);
        expect(res.body.vehicleId).toBe('bus-123');
    });

    it('GET /live-location should return 404 if not found', async () => {
        const res = await request(app)
            .get('/api/v1/routes/route-999/live-location?schoolId=school-001')
            .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
        expect(res.status).toBe(404);
    });
});
