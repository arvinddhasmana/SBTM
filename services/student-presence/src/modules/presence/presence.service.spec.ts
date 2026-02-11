
import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { PresenceEvent, EventType, EventSource } from './entities/presence-event.entity';
import { TagsService } from '../tags/tags.service';
import { WebsocketGateway } from '../realtime/websocket.gateway';

describe('PresenceService', () => {
    let service: PresenceService;

    const mockRepository = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation((event) => Promise.resolve({ id: 'uuid', ...event })),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        })),
    };

    const mockQueue = {
        add: jest.fn(),
    };

    const mockTagsService = {
        findByTagId: jest.fn(),
        findByStudentId: jest.fn(),
    };

    const mockGateway = {
        broadcastPresenceEvent: jest.fn(),
    };

    // Mock Redis
    const mockRedis = {
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PresenceService,
                {
                    provide: getRepositoryToken(PresenceEvent),
                    useValue: mockRepository,
                },
                {
                    provide: getQueueToken('presence'),
                    useValue: mockQueue,
                },
                {
                    provide: TagsService,
                    useValue: mockTagsService,
                },
                {
                    provide: WebsocketGateway,
                    useValue: mockGateway,
                },
            ],
        }).compile();

        service = module.get<PresenceService>(PresenceService);

        // Mock Redis instance
        (service as any).redis = mockRedis;

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should process BLE detection and create BOARD event', async () => {
        mockTagsService.findByTagId.mockResolvedValue({
            id: 'tag-1',
            studentId: 'stud-123',
            tagId: 'ble-xyz-789',
        });

        mockRedis.get.mockResolvedValue(null); // No existing state

        const dto = {
            schoolId: 'school-001',
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: '2025-12-14T20:00:00Z',
            detections: [
                { tagId: 'ble-xyz-789', signalStrength: -60 },
            ],
        };

        const result = await service.processDetections(dto);

        expect(result.status).toBe('processed');
        expect(result.eventsProcessed).toBe(1);
        expect(mockRepository.save).toHaveBeenCalled();
        expect(mockGateway.broadcastPresenceEvent).toHaveBeenCalled();
    });

    it('should filter out weak signals', async () => {
        mockTagsService.findByTagId.mockResolvedValue({
            id: 'tag-1',
            studentId: 'stud-123',
            tagId: 'ble-xyz-789',
        });

        const dto = {
            schoolId: 'school-001',
            vehicleId: 'bus-123',
            routeId: 'route-456',
            timestamp: '2025-12-14T20:00:00Z',
            detections: [
                { tagId: 'ble-xyz-789', signalStrength: -90 }, // Too weak
            ],
        };

        const result = await service.processDetections(dto);

        expect(result.eventsProcessed).toBe(0);
        expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle manual override', async () => {
        const dto = {
            schoolId: 'school-001',
            studentId: 'stud-123',
            vehicleId: 'bus-123',
            routeId: 'route-456',
            eventType: EventType.ALIGHT,
            timestamp: '2025-12-14T20:30:00Z',
        };

        const result = await service.manualOverride(dto);

        expect(result).toBeDefined();
        expect(mockRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                studentId: dto.studentId,
                source: EventSource.MANUAL,
            })
        );
    });

    it('should get route presence from cache', async () => {
        const cachedData = [
            {
                studentId: 'stud-123',
                status: 'BOARDED',
                lastSeen: '2025-12-14T20:00:00Z',
            },
        ];

        mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

        const result = await service.getRoutePresence('route-456', 'school-001');

        expect(result).toEqual(cachedData);
        expect(mockRedis.get).toHaveBeenCalledWith('route:school-001:route-456:students');
    });
});
