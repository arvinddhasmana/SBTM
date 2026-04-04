import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { AlertsProcessor } from './alerts.processor';
import {
  AlertNotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/alert-notification-log.entity';
import { Job } from 'bullmq';

describe('AlertsProcessor', () => {
  let processor: AlertsProcessor;

  const mockLogRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
    createQueryBuilder: jest.fn(),
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
        AlertsProcessor,
        {
          provide: getRepositoryToken(AlertNotificationLog),
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

    processor = module.get<AlertsProcessor>(AlertsProcessor);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should skip jobs that are not emergency-event', async () => {
    const job = { id: 'job-1', name: 'other-event', data: {} } as Job;
    const result = await processor.process(job);
    expect(result).toEqual({ processed: true, recipientCount: 0 });
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('should skip jobs missing alertId or routeId', async () => {
    const job = {
      id: 'job-2',
      name: 'emergency-event',
      data: { schoolId: 'school-001' },
    } as Job;
    const result = await processor.process(job);
    expect(result).toEqual({ processed: false, recipientCount: 0 });
  });

  it('should fan-out to parents found via students_reference', async () => {
    mockDataSource.query.mockResolvedValueOnce([
      { parentId: 'parent-aaa', schoolId: 'school-001' },
      { parentId: 'parent-bbb', schoolId: 'school-001' },
    ]);

    const job = {
      id: 'job-3',
      name: 'emergency-event',
      data: { id: 'alert-123', routeId: 'route-456', schoolId: 'school-001' },
    } as Job;

    const result = await processor.process(job);

    expect(result).toEqual({ processed: true, recipientCount: 2 });
    expect(mockLogRepo.save).toHaveBeenCalledTimes(2);
    expect(mockNotificationsQueue.add).toHaveBeenCalledTimes(2);
    expect(mockLogRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        alertId: 'alert-123',
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.PENDING,
      }),
    );
  });

  it('should fall back to students table when students_reference is unavailable', async () => {
    // First query throws (students_reference unavailable)
    mockDataSource.query
      .mockRejectedValueOnce(
        new Error('relation "students_reference" does not exist'),
      )
      .mockResolvedValueOnce([
        { parentId: 'parent-ccc', schoolId: 'school-002' },
      ]);

    const job = {
      id: 'job-4',
      name: 'emergency-event',
      data: { id: 'alert-789', routeId: 'route-001', schoolId: 'school-002' },
    } as Job;

    const result = await processor.process(job);

    expect(result).toEqual({ processed: true, recipientCount: 1 });
    expect(mockLogRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should return zero recipients when no parents are found', async () => {
    mockDataSource.query
      .mockResolvedValueOnce([]) // students_reference returns empty
      .mockResolvedValueOnce([]); // students table also returns empty

    const job = {
      id: 'job-5',
      name: 'emergency-event',
      data: {
        id: 'alert-000',
        routeId: 'route-no-students',
        schoolId: 'school-001',
      },
    } as Job;

    const result = await processor.process(job);

    expect(result).toEqual({ processed: true, recipientCount: 0 });
    expect(mockLogRepo.save).not.toHaveBeenCalled();
  });

  it('should return zero recipients gracefully when both lookups fail', async () => {
    mockDataSource.query
      .mockRejectedValueOnce(new Error('students_reference missing'))
      .mockRejectedValueOnce(new Error('students missing'));

    const job = {
      id: 'job-6',
      name: 'emergency-event',
      data: { id: 'alert-err', routeId: 'route-err', schoolId: 'school-001' },
    } as Job;

    const result = await processor.process(job);

    expect(result).toEqual({ processed: true, recipientCount: 0 });
    expect(mockLogRepo.save).not.toHaveBeenCalled();
  });
});
