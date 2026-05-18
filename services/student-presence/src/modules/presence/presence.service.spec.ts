import { Test, TestingModule } from '@nestjs/testing';
import { PresenceService } from './presence.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import {
  BoardingEvent,
  BoardingEventKind,
  BoardingEventSource,
} from './entities/boarding-event.entity';
import { TagsService } from '../tags/tags.service';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { DataSource } from 'typeorm';

describe('PresenceService', () => {
  let service: PresenceService;
  const STUDENT_UUID = '11111111-1111-1111-1111-111111111111';
  const RUN_UUID = '22222222-2222-2222-2222-222222222222';

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((event) => Promise.resolve({ id: 'uuid', ...event })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockDataSource = {
    query: jest.fn(),
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

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        { provide: getRepositoryToken(BoardingEvent), useValue: mockRepository },
        { provide: getQueueToken('presence'), useValue: mockQueue },
        { provide: TagsService, useValue: mockTagsService },
        { provide: WebsocketGateway, useValue: mockGateway },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
    (service as any).redis = mockRedis;

    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process BLE detection and create BOARDED event', async () => {
    mockTagsService.findByTagId.mockResolvedValue({
      id: 'tag-1',
      studentId: 'stud-123',
      tagId: 'ble-xyz-789',
    });
    mockDataSource.query.mockResolvedValueOnce([{ id: STUDENT_UUID }]).mockResolvedValue([]);

    const dto = {
      schoolId: 'school-001',
      vehicleId: 'bus-123',
      routeId: 'route-456',
      runId: RUN_UUID,
      stopId: 'stop-1',
      timestamp: '2025-12-14T20:00:00Z',
      detections: [{ tagId: 'ble-xyz-789', signalStrength: -60 }],
    };

    const result = await service.processDetections(dto);

    expect(result.status).toBe('processed');
    expect(result.eventsProcessed).toBe(1);
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockGateway.broadcastPresenceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: STUDENT_UUID,
        routeId: 'route-456',
        runId: RUN_UUID,
        stopId: 'stop-1',
        eventKind: BoardingEventKind.BOARDED,
      }),
    );
  });

  it('should filter out weak signals', async () => {
    mockTagsService.findByTagId.mockResolvedValue({
      id: 'tag-1',
      studentId: 'stud-123',
      tagId: 'ble-xyz-789',
    });
    mockDataSource.query.mockResolvedValue([]);

    const dto = {
      schoolId: 'school-001',
      vehicleId: 'bus-123',
      routeId: 'route-456',
      runId: RUN_UUID,
      stopId: 'stop-1',
      timestamp: '2025-12-14T20:00:00Z',
      detections: [{ tagId: 'ble-xyz-789', signalStrength: -90 }],
    };

    const result = await service.processDetections(dto);

    expect(result.eventsProcessed).toBe(0);
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should handle manual override', async () => {
    mockDataSource.query.mockResolvedValue([{ id: STUDENT_UUID }]);

    const dto = {
      schoolId: 'school-001',
      studentId: 'stud-123',
      vehicleId: 'bus-123',
      routeId: 'route-456',
      runId: RUN_UUID,
      stopId: 'stop-1',
      eventKind: BoardingEventKind.ALIGHTED,
      timestamp: '2025-12-14T20:30:00Z',
    };

    const result = await service.manualOverride(dto);

    expect(result).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: STUDENT_UUID,
        runId: RUN_UUID,
        stopId: 'stop-1',
        eventKind: BoardingEventKind.ALIGHTED,
        source: BoardingEventSource.DRIVER_APP,
      }),
    );
  });

  it('should get route presence from cache', async () => {
    const cachedData = [
      {
        studentId: STUDENT_UUID,
        status: 'BOARDED',
        lastSeen: '2025-12-14T20:00:00Z',
      },
    ];

    mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

    const result = await service.getRoutePresence('route-456', 'school-001');

    expect(result).toEqual(cachedData);
    expect(mockRedis.get).toHaveBeenCalledWith('route:school-001:route-456:students');
  });

  it('should get global stats', async () => {
    (service as any).dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ count: '10' }]) // totalStudents
        .mockResolvedValueOnce([
          { eventKind: BoardingEventKind.BOARDED, count: '5' },
          { eventKind: BoardingEventKind.ALIGHTED, count: '3' },
        ]) // latestEvents
        .mockResolvedValueOnce([
          { routeId: 'R1', eventKind: BoardingEventKind.BOARDED, count: '2' },
        ]),
    };

    const result = await service.getStats('school-001');

    expect(result.totalStudents).toBe(10);
    expect(result.boarded).toBe(5);
    expect(result.alighted).toBe(3);
    expect(result.unknown).toBe(2);
    expect(result.byRoute).toHaveLength(1);
  });

  it('should get paginated events', async () => {
    (service as any).dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'ev1', eventKind: BoardingEventKind.BOARDED }])
        .mockResolvedValueOnce([{ count: '1' }]),
    };

    const query = { page: 1, limit: 10, schoolId: 'school-001' };
    const result = await service.getEvents(query);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });
});
