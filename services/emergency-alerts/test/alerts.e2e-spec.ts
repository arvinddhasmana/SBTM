import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('AlertsController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let internalToken: string;

  beforeAll(async () => {
    // Override env for local testing against host-mapped ports if needed
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.DB_PORT || '5433';
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
    process.env.INTERNAL_SERVICE_SECRET = 'dev_internal_secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Generate valid internal service token
    internalToken = jwtService.sign(
      { sub: 'test-gateway', iss: 'sbtm-internal' },
      { secret: 'dev_internal_secret' },
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/emergency-events (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergency-events')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        schoolId: 'school-001',
        vehicleId: 'bus-123',
        routeId: 'route-456',
        driverId: 'driver-789',
        timestamp: new Date().toISOString(),
        lat: 45.42,
        lng: -75.69,
        eventType: 'PANIC_BUTTON',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('received');
        expect(res.body.alertId).toBeDefined();
      });
  });

  it('/api/v1/alerts/active (GET)', async () => {
    // Create one first (active by default)
    await request(app.getHttpServer())
      .post('/api/v1/emergency-events')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        schoolId: 'school-001',
        vehicleId: 'bus-123',
        routeId: 'route-456',
        driverId: 'driver-789',
        timestamp: new Date().toISOString(),
        lat: 45.42,
        lng: -75.69,
        eventType: 'PANIC_BUTTON',
      });

    return request(app.getHttpServer())
      .get('/api/v1/alerts/active')
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        // Active endpoint now returns ACTIVE, PENDING_CONFIRMATION, CONFIRMED, AUTO_ESCALATED
        const validStatuses = [
          'ACTIVE',
          'PENDING_CONFIRMATION',
          'CONFIRMED',
          'AUTO_ESCALATED',
        ];
        res.body.forEach((alert: any) => {
          expect(validStatuses).toContain(alert.status);
        });
      });
  });

  it('/api/v1/alerts (GET)', async () => {
    return request(app.getHttpServer())
      .get('/api/v1/alerts')
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('/api/v1/alerts/:alertId/resolve (PATCH)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/emergency-events')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        schoolId: 'school-001',
        vehicleId: 'bus-123',
        routeId: 'route-456',
        driverId: 'driver-789',
        timestamp: new Date().toISOString(),
        lat: 45.42,
        lng: -75.69,
        eventType: 'PANIC_BUTTON',
      });

    const alertId = createRes.body.alertId;

    return request(app.getHttpServer())
      .patch(`/api/v1/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${internalToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('RESOLVED');
      });
  });

  it('/api/v1/alerts/:alertId/resolve (PATCH) with notes', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/emergency-events')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        schoolId: 'school-001',
        vehicleId: 'bus-resolve',
        routeId: 'route-resolve',
        driverId: 'driver-001',
        timestamp: new Date().toISOString(),
        lat: 45.42,
        lng: -75.69,
        eventType: 'PANIC_BUTTON',
      });

    const alertId = createRes.body.alertId;

    return request(app.getHttpServer())
      .patch(`/api/v1/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        notes: 'Incident resolved on scene',
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('RESOLVED');
      });
  });

  it('/api/v1/alerts/:alertId/status-update (PATCH)', async () => {
    // Create a Tier 2 alert (starts as ACTIVE) for status update
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/emergency-events')
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        schoolId: 'school-001',
        vehicleId: 'bus-update',
        routeId: 'route-update',
        driverId: 'driver-001',
        timestamp: new Date().toISOString(),
        lat: 45.42,
        lng: -75.69,
        eventType: 'LATE_ARRIVAL',
      });

    const alertId = createRes.body.alertId;

    return request(app.getHttpServer())
      .patch(`/api/v1/alerts/${alertId}/status-update`)
      .set('Authorization', `Bearer ${internalToken}`)
      .send({
        notes: 'Bus has resumed normal route',
        actorUserId: 'admin-001',
        actorRole: 'SCHOOL_ADMIN',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.eventType).toBe('STATUS_UPDATE');
        expect(res.body.notes).toBe('Bus has resumed normal route');
      });
  });
});
