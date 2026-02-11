import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { VideoEventsService } from '../src/modules/video-events/video-events.service';
import { VideoEventsModule } from '../src/modules/video-events/video-events.module';
import { StorageModule } from '../src/modules/storage/storage.module';
import { VideoEvent, VideoEventType, VideoEventStatus } from '../src/modules/video-events/entities/video-event.entity';
import { VideoAccessLog } from '../src/modules/video-events/entities/video-access-log.entity';

describe('VideoEventsService Integration Tests', () => {
    let service: VideoEventsService;
    let module: TestingModule;

    beforeAll(async () => {
        process.env.DB_TYPE = 'sqlite';
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [VideoEvent, VideoAccessLog],
                    synchronize: true,
                    dropSchema: true,
                }),
                VideoEventsModule,
                StorageModule,
            ],
        }).compile();

        service = module.get<VideoEventsService>(VideoEventsService);
    });

    afterAll(async () => {
        await module.close();
    });

    describe('Video Event Lifecycle', () => {
        let videoEventId: string;

        it('should create a video event', async () => {
            const createDto = {
                schoolId: 'school-integration-test',
                vehicleId: 'bus-integration-test',
                routeId: 'route-integration-test',
                driverId: 'driver-integration-test',
                timestamp: '2025-01-10T14:25:10Z',
                eventType: VideoEventType.EMERGENCY,
                durationSeconds: 20,
            };

            const result = await service.create(createDto);

            expect(result).toHaveProperty('videoEventId');
            expect(result).toHaveProperty('uploadUrl');
            expect(result).toHaveProperty('thumbnailUploadUrl');

            videoEventId = result.videoEventId;
        });

        it('should complete a video event', async () => {
            const completeDto = {
                videoUrl: 'https://storage.example.com/test-video.mp4',
                thumbnailUrl: 'https://storage.example.com/test-thumb.jpg',
            };

            const result = await service.complete(videoEventId, completeDto);

            expect(result.status).toBe(VideoEventStatus.READY);
            expect(result.videoUrl).toBe(completeDto.videoUrl);
            expect(result.thumbnailUrl).toBe(completeDto.thumbnailUrl);
        });

        it('should retrieve video event with playback URL', async () => {
            const result = await service.findOne(videoEventId);

            expect(result).toHaveProperty('id', videoEventId);
            expect(result).toHaveProperty('status', VideoEventStatus.READY);
            expect(result).toHaveProperty('playbackUrl');
        });

        it('should query video events with filters', async () => {
            const result = await service.findAll({
                schoolId: 'school-integration-test',
                vehicleId: 'bus-integration-test',
                page: '1',
                limit: '10',
            });

            expect(result.data).toHaveLength(1);
            expect(result.data[0].vehicleId).toBe('bus-integration-test');
            expect(result.meta.total).toBe(1);
        });

        it('should mark video event as failed', async () => {
            const result = await service.markAsFailed(videoEventId);

            expect(result.status).toBe(VideoEventStatus.FAILED);
        });

        it('should delete video event', async () => {
            const result = await service.delete(videoEventId);

            expect(result).toHaveProperty('message');

            // Verify deletion
            await expect(service.findOne(videoEventId)).rejects.toThrow();
        });
    });

    describe('Access Logging', () => {
        it('should log video access', async () => {
            // Create a new event
            const createDto = {
                schoolId: 'school-access-test',
                vehicleId: 'bus-access-test',
                routeId: 'route-access-test',
                driverId: 'driver-access-test',
                timestamp: '2025-01-10T14:25:10Z',
                eventType: VideoEventType.MANUAL,
                durationSeconds: 15,
            };

            const created = await service.create(createDto);

            // Complete the event
            await service.complete(created.videoEventId, {
                videoUrl: 'https://storage.example.com/access-test.mp4',
            });

            // Access the video (this should log access)
            await service.findOne(created.videoEventId, 'test-user-123', '127.0.0.1');

            // Get access logs
            const logs = await service.getAccessLogs(created.videoEventId);

            expect(logs).toHaveLength(1);
            expect(logs[0].userId).toBe('test-user-123');
            expect(logs[0].ipAddress).toBe('127.0.0.1');

            // Cleanup
            await service.delete(created.videoEventId);
        });
    });

    describe('Query Filters', () => {
        beforeAll(async () => {
            // Create multiple events for testing
            const events = [
                {
                    schoolId: 'school-a',
                    vehicleId: 'bus-001',
                    routeId: 'route-001',
                    driverId: 'driver-001',
                    timestamp: '2025-01-10T10:00:00Z',
                    eventType: VideoEventType.EMERGENCY,
                    durationSeconds: 20,
                },
                {
                    schoolId: 'school-a',
                    vehicleId: 'bus-002',
                    routeId: 'route-001',
                    driverId: 'driver-002',
                    timestamp: '2025-01-10T11:00:00Z',
                    eventType: VideoEventType.INCIDENT,
                    durationSeconds: 30,
                },
                {
                    schoolId: 'school-b',
                    vehicleId: 'bus-001',
                    routeId: 'route-002',
                    driverId: 'driver-001',
                    timestamp: '2025-01-10T12:00:00Z',
                    eventType: VideoEventType.MANUAL,
                    durationSeconds: 15,
                },
            ];

            for (const event of events) {
                await service.create(event);
            }
        });

        it('should filter by vehicleId', async () => {
            const result = await service.findAll({ vehicleId: 'bus-001' });
            expect(result.data.every((e) => e.vehicleId === 'bus-001')).toBe(true);
        });

        it('should filter by schoolId', async () => {
            const result = await service.findAll({ schoolId: 'school-a' });
            expect(result.data.every((e) => e.schoolId === 'school-a')).toBe(true);
        });

        it('should filter by routeId', async () => {
            const result = await service.findAll({ routeId: 'route-001' });
            expect(result.data.every((e) => e.routeId === 'route-001')).toBe(true);
        });

        it('should filter by eventType', async () => {
            const result = await service.findAll({
                eventType: VideoEventType.EMERGENCY,
            });
            expect(
                result.data.every((e) => e.eventType === VideoEventType.EMERGENCY),
            ).toBe(true);
        });

        it('should support pagination', async () => {
            const page1 = await service.findAll({ page: '1', limit: '2' });
            expect(page1.data).toHaveLength(2);
            expect(page1.meta.page).toBe(1);
            expect(page1.meta.limit).toBe(2);

            const page2 = await service.findAll({ page: '2', limit: '2' });
            expect(page2.meta.page).toBe(2);
        });
    });
});
