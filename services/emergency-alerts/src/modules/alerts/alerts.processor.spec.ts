import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { AlertsProcessor } from './alerts.processor';
import {
  AlertDelivery,
  AlertDeliveryStatus,
} from './entities/alert-delivery.entity';
import { AlertChannel } from './entities/alert-subscription.entity';
import { Job } from 'bullmq';

describe('AlertsProcessor', () => {
  let processor: AlertsProcessor;

  const mockDeliveriesRepo = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockResolvedValue({ id: 'delivery-uuid' }),
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
          provide: getRepositoryToken(AlertDelivery),
          useValue: mockDeliveriesRepo,
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

  it('returns a noop for unrecognised job names', async () => {
    const job = { id: 'job-1', name: 'unknown-job', data: {} } as Job;
    const result = await processor.process(job);
    expect(result).toEqual({ processed: true, recipientCount: 0 });
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  it('returns a noop for legacy escalation job names (no longer enqueued)', async () => {
    for (const name of [
      'confirmation-timeout',
      'board-escalation',
      'osta-escalation',
    ]) {
      const job = { id: `legacy-${name}`, name, data: {} } as Job;
      const result = await processor.process(job);
      expect(result).toEqual({ processed: true, recipientCount: 0 });
    }
    expect(mockDeliveriesRepo.save).not.toHaveBeenCalled();
    expect(mockNotificationsQueue.add).not.toHaveBeenCalled();
  });

  // ── emergency-event ──────────────────────────────────────────────────────

  describe('emergency-event', () => {
    it('skips jobs missing alertId or routeId', async () => {
      const job = {
        id: 'job-2',
        name: 'emergency-event',
        data: { schoolId: 'school-001' },
      } as Job;
      const result = await processor.process(job);
      expect(result).toEqual({ processed: false, recipientCount: 0 });
    });

    it('fans out to parents found via the students table and writes deliveries', async () => {
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
      expect(mockDeliveriesRepo.save).toHaveBeenCalledTimes(2);
      expect(mockNotificationsQueue.add).toHaveBeenCalledTimes(2);
      expect(mockDeliveriesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-123',
          channel: AlertChannel.PUSH,
          status: AlertDeliveryStatus.QUEUED,
        }),
      );
    });

    it('accepts staId as an alias for schoolId in the job payload', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        { parentId: 'parent-ccc', schoolId: 'school-002' },
      ]);

      const job = {
        id: 'job-4',
        name: 'emergency-event',
        data: {
          alertId: 'alert-789',
          routeId: 'route-001',
          staId: 'school-002',
        },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 1 });
      expect(mockDeliveriesRepo.save).toHaveBeenCalledTimes(1);
    });

    it('returns zero recipients when no parents are found', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

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
      expect(mockDeliveriesRepo.save).not.toHaveBeenCalled();
    });

    it('returns zero recipients gracefully when the students query fails', async () => {
      mockDataSource.query.mockRejectedValueOnce(new Error('database error'));

      const job = {
        id: 'job-6',
        name: 'emergency-event',
        data: { id: 'alert-err', routeId: 'route-err', schoolId: 'school-001' },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 0 });
      expect(mockDeliveriesRepo.save).not.toHaveBeenCalled();
    });
  });
});
