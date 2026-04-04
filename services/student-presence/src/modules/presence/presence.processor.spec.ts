import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { Job } from 'bullmq';
import { PresenceProcessor } from './presence.processor';
import {
  PresenceNotificationLog,
  PresenceNotificationStatus,
} from './entities/presence-notification-log.entity';
import { EventType, EventSource } from './entities/presence-event.entity';

describe('PresenceProcessor', () => {
  let processor: PresenceProcessor;

  const mockLogRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockNotificationsQueue = {
    add: jest.fn().mockResolvedValue({ id: 'notif-job-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceProcessor,
        {
          provide: getRepositoryToken(PresenceNotificationLog),
          useValue: mockLogRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getQueueToken('notifications'),
          useValue: mockNotificationsQueue,
        },
      ],
    }).compile();

    processor = module.get<PresenceProcessor>(PresenceProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should skip jobs that are not presence-event', async () => {
    const job = { id: 'job-1', name: 'other-event', data: {} } as Job;
    const result = await processor.process(job);
    expect(result).toEqual({ processed: true, notified: false });
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('should skip jobs missing required fields', async () => {
    const job = {
      id: 'job-2',
      name: 'presence-event',
      data: { routeId: 'route-001' }, // missing id, studentId, schoolId
    } as Job;
    const result = await processor.process(job);
    expect(result).toEqual({ processed: false, notified: false });
  });

  it('should look up parent and persist notification for BOARD event', async () => {
    mockDataSource.query.mockResolvedValueOnce([
      { parentId: 'parent-aaa', schoolId: 'school-001' },
    ]);

    const job = {
      id: 'job-3',
      name: 'presence-event',
      data: {
        id: 'event-123',
        studentId: 'stud-xyz',
        routeId: 'route-456',
        schoolId: 'school-001',
        vehicleId: 'bus-001',
        eventType: EventType.BOARD,
        source: EventSource.SMARTTAG,
        timestamp: new Date(),
      },
    } as Job;

    const result = await processor.process(job);

    expect(result).toEqual({ processed: true, notified: true });
    expect(mockLogRepo.save).toHaveBeenCalledTimes(1);
    expect(mockNotificationsQueue.add).toHaveBeenCalledWith(
      'notification-request',
      expect.objectContaining({
        eventType: 'BOARD',
        eventSourceId: 'event-123',
        recipientUserId: 'parent-aaa',
        studentId: 'stud-xyz',
        routeId: 'route-456',
        schoolId: 'school-001',
      }),
    );
    expect(mockLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        presenceEventId: 'event-123',
        studentId: 'stud-xyz',
        recipientUserId: 'parent-aaa',
        eventType: EventType.BOARD,
        status: PresenceNotificationStatus.PENDING,
      }),
    );
  });

  it('should persist notification for ALIGHT event', async () => {
    mockDataSource.query.mockResolvedValueOnce([
      { parentId: 'parent-bbb', schoolId: 'school-002' },
    ]);

    const job = {
      id: 'job-4',
      name: 'presence-event',
      data: {
        id: 'event-456',
        studentId: 'stud-abc',
        routeId: 'route-789',
        schoolId: 'school-002',
        vehicleId: 'bus-002',
        eventType: EventType.ALIGHT,
        source: EventSource.MANUAL,
        timestamp: new Date(),
      },
    } as Job;

    const result = await processor.process(job);

    expect(result).toEqual({ processed: true, notified: true });
    expect(mockLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: EventType.ALIGHT }),
    );
  });

  it('should fall back to students table when students_reference unavailable', async () => {
    mockDataSource.query
      .mockRejectedValueOnce(new Error('students_reference missing'))
      .mockResolvedValueOnce([{ parentId: 'parent-ccc', schoolId: 'school-001' }]);

    const job = {
      id: 'job-5',
      name: 'presence-event',
      data: {
        id: 'event-789',
        studentId: 'stud-001',
        routeId: 'route-001',
        schoolId: 'school-001',
        vehicleId: 'bus-003',
        eventType: EventType.BOARD,
        source: EventSource.SMARTTAG,
        timestamp: new Date(),
      },
    } as Job;

    const result = await processor.process(job);
    expect(result).toEqual({ processed: true, notified: true });
    expect(mockLogRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should return notified=false when no parent is found', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([]) // students_reference empty
      .mockResolvedValueOnce([]); // students table also empty

    const job = {
      id: 'job-6',
      name: 'presence-event',
      data: {
        id: 'event-000',
        studentId: 'stud-no-parent',
        routeId: 'route-001',
        schoolId: 'school-001',
        vehicleId: 'bus-001',
        eventType: EventType.BOARD,
        source: EventSource.SMARTTAG,
        timestamp: new Date(),
      },
    } as Job;

    const result = await processor.process(job);
    expect(result).toEqual({ processed: true, notified: false });
    expect(mockLogRepo.save).not.toHaveBeenCalled();
  });
});
