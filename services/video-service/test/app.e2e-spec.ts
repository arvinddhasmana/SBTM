import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { VideoEventType } from '../src/modules/video-events/entities/video-event.entity';

describe('VideoService (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        app.setGlobalPrefix('api/v1');

        await app.init();

        dataSource = moduleFixture.get<DataSource>(DataSource);
    });

    afterAll(async () => {
        await dataSource.destroy();
        await app.close();
    });

    describe('Health Check', () => {
        it('/api/v1/health (GET)', () => {
            return request(app.getHttpServer())
                .get('/api/v1/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'ok');
                    expect(res.body).toHaveProperty('service', 'video-service');
                });
        });
    });

    describe('Video Events', () => {
        let videoEventId: string;

        it('/api/v1/video-events (POST) - should create a video event', () => {
            return request(app.getHttpServer())
                .post('/api/v1/video-events')
                .send({
                    schoolId: 'school-e2e',
                    vehicleId: 'bus-123',
                    routeId: 'route-456',
                    driverId: 'driver-789',
                    timestamp: '2025-01-10T14:25:10Z',
                    eventType: VideoEventType.EMERGENCY,
                    durationSeconds: 20,
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('videoEventId');
                    expect(res.body).toHaveProperty('uploadUrl');
                    expect(res.body).toHaveProperty('thumbnailUploadUrl');
                    videoEventId = res.body.videoEventId;
                });
        });

        it('/api/v1/video-events (POST) - should reject invalid data', () => {
            return request(app.getHttpServer())
                .post('/api/v1/video-events')
                .send({
                    vehicleId: 'bus-123',
                    // Missing required fields
                })
                .expect(400);
        });

        it('/api/v1/video-events/:id/complete (POST) - should complete video upload', async () => {
            return request(app.getHttpServer())
                .post(`/api/v1/video-events/${videoEventId}/complete`)
                .send({
                    videoUrl: 'https://storage.example.com/video.mp4',
                    thumbnailUrl: 'https://storage.example.com/thumb.jpg',
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'READY');
                    expect(res.body).toHaveProperty('videoUrl');
                });
        });

        it('/api/v1/video-events (GET) - should list video events', () => {
            return request(app.getHttpServer())
                .get('/api/v1/video-events')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('data');
                    expect(res.body).toHaveProperty('meta');
                    expect(Array.isArray(res.body.data)).toBe(true);
                });
        });

        it('/api/v1/video-events (GET) - should filter by vehicleId', () => {
            return request(app.getHttpServer())
                .get('/api/v1/video-events?vehicleId=bus-123&schoolId=school-e2e')
                .expect(200)
                .expect((res) => {
                    expect(res.body.data.every((e) => e.vehicleId === 'bus-123')).toBe(
                        true,
                    );
                });
        });

        it('/api/v1/video-events/:id (GET) - should get a specific video event', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/video-events/${videoEventId}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id', videoEventId);
                    expect(res.body).toHaveProperty('playbackUrl');
                });
        });

        it('/api/v1/video-events/:id (GET) - should return 404 for non-existent event', () => {
            return request(app.getHttpServer())
                .get('/api/v1/video-events/00000000-0000-0000-0000-000000000000')
                .expect(404);
        });

        it('/api/v1/video-events/:id/failed (POST) - should mark event as failed', () => {
            return request(app.getHttpServer())
                .post(`/api/v1/video-events/${videoEventId}/failed`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'FAILED');
                });
        });

        it('/api/v1/video-events/:id/access-logs (GET) - should get access logs', () => {
            return request(app.getHttpServer())
                .get(`/api/v1/video-events/${videoEventId}/access-logs`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                });
        });

        it('/api/v1/video-events/:id (DELETE) - should delete video event', () => {
            return request(app.getHttpServer())
                .delete(`/api/v1/video-events/${videoEventId}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('message');
                });
        });
    });
});
