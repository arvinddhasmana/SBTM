import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsModule } from './../src/modules/alerts/alerts.module';
import { EmergencyAlert } from './../src/modules/alerts/entities/emergency-alert.entity';
import { AlertNotificationLog } from './../src/modules/alerts/entities/alert-notification-log.entity';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

describe('AlertsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DB_HOST = process.env.DB_HOST || 'postgres';
    process.env.DB_PORT = process.env.DB_PORT || '5432';
    process.env.REDIS_HOST = process.env.REDIS_HOST || 'redis';
    process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT, 10),
          username: 'postgres',
          password: 'mysecretpassword',
          database: 'sbms',
          entities: [EmergencyAlert, AlertNotificationLog],
          synchronize: true, // Auto-create tables
        }),
        BullModule.forRoot({
          connection: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT, 10),
          },
        }),
        AlertsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/emergency-events (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/emergency-events')
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
    await request(app.getHttpServer()).post('/api/v1/emergency-events').send({
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
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].status).toBe('ACTIVE');
      });
  });
});
