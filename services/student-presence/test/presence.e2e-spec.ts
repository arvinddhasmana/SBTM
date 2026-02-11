
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { TagsModule } from './../src/modules/tags/tags.module';
import { PresenceModule } from './../src/modules/presence/presence.module';
import { StudentTag } from './../src/modules/tags/entities/student-tag.entity';
import { PresenceEvent } from './../src/modules/presence/entities/presence-event.entity';

describe('Student Presence Service (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true }),
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5433,
                    username: 'postgres',
                    password: 'mysecretpassword',
                    database: 'sbms',
                    entities: [StudentTag, PresenceEvent],
                    synchronize: true, // Auto-create tables for testing
                }),
                BullModule.forRoot({
                    connection: {
                        host: 'localhost',
                        port: 6379,
                    },
                }),
                TagsModule,
                PresenceModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Tag Registration', () => {
        it('/api/v1/student-tags (POST) - should register a new tag', () => {
            return request(app.getHttpServer())
                .post('/api/v1/student-tags')
                .send({
                    schoolId: 'school-001',
                    studentId: 'stud-e2e-001',
                    tagId: 'ble-e2e-001',
                    tagType: 'SMARTTAG',
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.status).toBe('registered');
                    expect(res.body.tagId).toBeDefined();
                });
        });

        it('/api/v1/student-tags (POST) - should reject duplicate tag', async () => {
            // First registration
            await request(app.getHttpServer())
                .post('/api/v1/student-tags')
                .send({
                    schoolId: 'school-001',
                    studentId: 'stud-e2e-002',
                    tagId: 'ble-e2e-dup',
                    tagType: 'SMARTTAG',
                });

            // Duplicate registration
            return request(app.getHttpServer())
                .post('/api/v1/student-tags')
                .send({
                    schoolId: 'school-001',
                    studentId: 'stud-e2e-003',
                    tagId: 'ble-e2e-dup',
                    tagType: 'SMARTTAG',
                })
                .expect(409); // Conflict
        });
    });

    describe('Presence Detection', () => {
        beforeAll(async () => {
            // Register a tag for testing
            await request(app.getHttpServer())
                .post('/api/v1/student-tags')
                .send({
                    schoolId: 'school-001',
                    studentId: 'stud-e2e-100',
                    tagId: 'ble-e2e-100',
                    tagType: 'SMARTTAG',
                });
        });

        it('/api/v1/presence-events (POST) - should process BLE detection', () => {
            return request(app.getHttpServer())
                .post('/api/v1/presence-events')
                .send({
                    schoolId: 'school-001',
                    vehicleId: 'bus-e2e-001',
                    routeId: 'route-e2e-001',
                    timestamp: new Date().toISOString(),
                    detections: [
                        { tagId: 'ble-e2e-100', signalStrength: -60 },
                    ],
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.status).toBe('processed');
                });
        });

        it('/api/v1/student-presence-events/manual (POST) - should accept manual override', () => {
            return request(app.getHttpServer())
                .post('/api/v1/student-presence-events/manual')
                .send({
                    schoolId: 'school-001',
                    studentId: 'stud-e2e-100',
                    vehicleId: 'bus-e2e-001',
                    routeId: 'route-e2e-001',
                    eventType: 'BOARD',
                    timestamp: new Date().toISOString(),
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body.status).toBe('recorded');
                    expect(res.body.presenceEventId).toBeDefined();
                });
        });

        it('/api/v1/routes/:routeId/students (GET) - should get route presence', async () => {
            // First, add a presence event
            await request(app.getHttpServer())
                .post('/api/v1/student-presence-events/manual')
                .send({
                    schoolId: 'school-001',
                    studentId: 'stud-e2e-100',
                    vehicleId: 'bus-e2e-001',
                    routeId: 'route-e2e-query',
                    eventType: 'BOARD',
                    timestamp: new Date().toISOString(),
                });

            // Wait a bit for cache update
            await new Promise(resolve => setTimeout(resolve, 100));

            return request(app.getHttpServer())
                .get('/api/v1/routes/route-e2e-query/students?schoolId=school-001')
                .expect(200)
                .expect((res) => {
                    expect(res.body.routeId).toBe('route-e2e-query');
                    expect(Array.isArray(res.body.students)).toBe(true);
                });
        });
    });

    describe('Health Check', () => {
        it('/health (GET)', () => {
            return request(app.getHttpServer())
                .get('/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe('ok');
                    expect(res.body.service).toBe('student-presence');
                });
        });
    });
});
