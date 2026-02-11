import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { VideoEventsService } from './video-events.service';
import { VideoEvent, VideoEventStatus, VideoEventType } from './entities/video-event.entity';
import { VideoAccessLog } from './entities/video-access-log.entity';
import { StorageService } from '../storage/storage.service';

describe('VideoEventsService', () => {
    let service: VideoEventsService;
    let videoEventRepository: Repository<VideoEvent>;
    let videoAccessLogRepository: Repository<VideoAccessLog>;
    let storageService: StorageService;

    const mockVideoEvent = {
        id: 'test-id-123',
        schoolId: 'school-123',
        vehicleId: 'bus-123',
        routeId: 'route-456',
        driverId: 'driver-789',
        timestamp: new Date('2025-01-10T14:25:10Z'),
        eventType: VideoEventType.EMERGENCY,
        durationSeconds: 20,
        videoUrl: null,
        thumbnailUrl: null,
        status: VideoEventStatus.UPLOADING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockPresignedUrls = {
        uploadUrl: 'https://storage.example.com/presigned-upload',
        thumbnailUploadUrl: 'https://storage.example.com/presigned-thumb',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VideoEventsService,
                {
                    provide: getRepositoryToken(VideoEvent),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        findAndCount: jest.fn(),
                        remove: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(VideoAccessLog),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: StorageService,
                    useValue: {
                        generatePresignedUploadUrls: jest.fn(),
                        generatePresignedDownloadUrl: jest.fn(),
                        extractObjectKeyFromUrl: jest.fn(),
                        deleteObject: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<VideoEventsService>(VideoEventsService);
        videoEventRepository = module.get<Repository<VideoEvent>>(
            getRepositoryToken(VideoEvent),
        );
        videoAccessLogRepository = module.get<Repository<VideoAccessLog>>(
            getRepositoryToken(VideoAccessLog),
        );
        storageService = module.get<StorageService>(StorageService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a video event and return presigned URLs', async () => {
            const createDto = {
                schoolId: 'school-123',
                vehicleId: 'bus-123',
                routeId: 'route-456',
                driverId: 'driver-789',
                timestamp: '2025-01-10T14:25:10Z',
                eventType: VideoEventType.EMERGENCY,
                durationSeconds: 20,
            };

            jest.spyOn(videoEventRepository, 'create').mockReturnValue(mockVideoEvent as any);
            jest.spyOn(videoEventRepository, 'save').mockResolvedValue(mockVideoEvent as any);
            jest.spyOn(storageService, 'generatePresignedUploadUrls').mockResolvedValue(mockPresignedUrls);

            const result = await service.create(createDto);

            expect(result).toHaveProperty('videoEventId', mockVideoEvent.id);
            expect(result).toHaveProperty('uploadUrl', mockPresignedUrls.uploadUrl);
            expect(result).toHaveProperty('thumbnailUploadUrl', mockPresignedUrls.thumbnailUploadUrl);
            expect(videoEventRepository.create).toHaveBeenCalled();
            expect(videoEventRepository.save).toHaveBeenCalled();
            expect(storageService.generatePresignedUploadUrls).toHaveBeenCalledWith(mockVideoEvent.id);
        });
    });

    describe('complete', () => {
        it('should complete a video event upload', async () => {
            const completeDto = {
                videoUrl: 'https://storage.example.com/video.mp4',
                thumbnailUrl: 'https://storage.example.com/thumb.jpg',
            };

            const completedEvent = {
                ...mockVideoEvent,
                videoUrl: completeDto.videoUrl,
                thumbnailUrl: completeDto.thumbnailUrl,
                status: VideoEventStatus.READY,
            };

            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(mockVideoEvent as any);
            jest.spyOn(videoEventRepository, 'save').mockResolvedValue(completedEvent as any);

            const result = await service.complete(mockVideoEvent.id, completeDto);

            expect(result.status).toBe(VideoEventStatus.READY);
            expect(result.videoUrl).toBe(completeDto.videoUrl);
            expect(result.thumbnailUrl).toBe(completeDto.thumbnailUrl);
        });

        it('should throw NotFoundException if video event not found', async () => {
            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(null);

            await expect(
                service.complete('non-existent-id', {
                    videoUrl: 'https://example.com/video.mp4',
                }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAll', () => {
        it('should return paginated video events', async () => {
            const mockEvents = [mockVideoEvent];
            const total = 1;

            jest.spyOn(videoEventRepository, 'findAndCount').mockResolvedValue([mockEvents as any, total]);

            const result = await service.findAll({ page: '1', limit: '10' });

            expect(result.data).toEqual(mockEvents);
            expect(result.meta.total).toBe(total);
            expect(result.meta.page).toBe(1);
            expect(result.meta.limit).toBe(10);
        });

        it('should filter by vehicleId', async () => {
            const mockEvents = [mockVideoEvent];
            const total = 1;

            jest.spyOn(videoEventRepository, 'findAndCount').mockResolvedValue([mockEvents as any, total]);

            const result = await service.findAll({ vehicleId: 'bus-123' });

            expect(videoEventRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ vehicleId: 'bus-123' }),
                }),
            );
        });

        it('should filter by schoolId', async () => {
            const mockEvents = [mockVideoEvent];
            const total = 1;

            jest.spyOn(videoEventRepository, 'findAndCount').mockResolvedValue([mockEvents as any, total]);

            await service.findAll({ schoolId: 'school-123' });

            expect(videoEventRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ schoolId: 'school-123' }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a video event by id', async () => {
            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(mockVideoEvent as any);

            const result = await service.findOne(mockVideoEvent.id);

            expect(result).toEqual(mockVideoEvent);
        });

        it('should throw NotFoundException if video event not found', async () => {
            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(null);

            await expect(service.findOne('non-existent-id')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should generate playback URL for ready videos', async () => {
            const readyEvent = {
                ...mockVideoEvent,
                status: VideoEventStatus.READY,
                videoUrl: 'https://storage.example.com/video.mp4',
            };

            const playbackUrl = 'https://storage.example.com/presigned-playback';

            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(readyEvent as any);
            jest.spyOn(storageService, 'extractObjectKeyFromUrl').mockReturnValue('video.mp4');
            jest.spyOn(storageService, 'generatePresignedDownloadUrl').mockResolvedValue(playbackUrl);

            const result = await service.findOne(mockVideoEvent.id);

            expect(result).toHaveProperty('playbackUrl', playbackUrl);
        });
    });

    describe('markAsFailed', () => {
        it('should mark a video event as failed', async () => {
            const failedEvent = {
                ...mockVideoEvent,
                status: VideoEventStatus.FAILED,
            };

            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(mockVideoEvent as any);
            jest.spyOn(videoEventRepository, 'save').mockResolvedValue(failedEvent as any);

            const result = await service.markAsFailed(mockVideoEvent.id);

            expect(result.status).toBe(VideoEventStatus.FAILED);
        });
    });

    describe('delete', () => {
        it('should delete a video event and its files', async () => {
            const eventWithFiles = {
                ...mockVideoEvent,
                videoUrl: 'https://storage.example.com/video.mp4',
                thumbnailUrl: 'https://storage.example.com/thumb.jpg',
            };

            jest.spyOn(videoEventRepository, 'findOne').mockResolvedValue(eventWithFiles as any);
            jest.spyOn(storageService, 'extractObjectKeyFromUrl').mockReturnValue('key');
            jest.spyOn(storageService, 'deleteObject').mockResolvedValue(undefined);
            jest.spyOn(videoEventRepository, 'remove').mockResolvedValue(eventWithFiles as any);

            const result = await service.delete(mockVideoEvent.id);

            expect(result).toHaveProperty('message');
            expect(storageService.deleteObject).toHaveBeenCalledTimes(2);
            expect(videoEventRepository.remove).toHaveBeenCalled();
        });
    });

    describe('getAccessLogs', () => {
        it('should return access logs for a video event', async () => {
            const mockLogs = [
                {
                    id: 'log-1',
                    videoEventId: mockVideoEvent.id,
                    userId: 'user-1',
                    timestamp: new Date(),
                    ipAddress: '127.0.0.1',
                },
            ];

            jest.spyOn(videoAccessLogRepository, 'find').mockResolvedValue(mockLogs as any);

            const result = await service.getAccessLogs(mockVideoEvent.id);

            expect(result).toEqual(mockLogs);
            expect(videoAccessLogRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { videoEventId: mockVideoEvent.id },
                }),
            );
        });
    });
});
