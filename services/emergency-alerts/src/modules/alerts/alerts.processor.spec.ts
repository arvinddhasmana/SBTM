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
import {
  EmergencyAlert,
  EmergencyAlertStatus,
} from './entities/emergency-alert.entity';
import { AlertAuditLog } from './entities/alert-audit-log.entity';
import { Job } from 'bullmq';

describe('AlertsProcessor', () => {
  let processor: AlertsProcessor;

  const mockLogRepo = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
  };

  const mockAlertsRepo = {
    findOneBy: jest.fn(),
    save: jest.fn().mockResolvedValue({ id: 'alert-uuid' }),
  };

  const mockAuditLogRepo = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockResolvedValue({ id: 'audit-uuid' }),
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
          provide: getRepositoryToken(EmergencyAlert),
          useValue: mockAlertsRepo,
        },
        {
          provide: getRepositoryToken(AlertAuditLog),
          useValue: mockAuditLogRepo,
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

  it('should skip unrecognised job names', async () => {
    const job = { id: 'job-1', name: 'unknown-job', data: {} } as Job;
    const result = await processor.process(job);
    expect(result).toEqual({ processed: true, recipientCount: 0 });
    expect(mockDataSource.query).not.toHaveBeenCalled();
  });

  // ── emergency-event ──────────────────────────────────────────────────────

  describe('emergency-event', () => {
    it('should skip jobs missing alertId or routeId', async () => {
      const job = {
        id: 'job-2',
        name: 'emergency-event',
        data: { schoolId: 'school-001' },
      } as Job;
      const result = await processor.process(job);
      expect(result).toEqual({ processed: false, recipientCount: 0 });
    });

    it('should fan-out to parents found via students table', async () => {
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

    it('should query students table for parents', async () => {
      mockDataSource.query.mockResolvedValueOnce([
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
      mockDataSource.query.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

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

    it('should return zero recipients gracefully when query fails', async () => {
      mockDataSource.query
        .mockRejectedValueOnce(new Error('database error'));

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

  // ── confirmation-timeout ─────────────────────────────────────────────────

  describe('confirmation-timeout', () => {
    it('should skip when alertId is missing', async () => {
      const job = {
        id: 'ct-1',
        name: 'confirmation-timeout',
        data: { routeId: 'r-1', schoolId: 'school-1' },
      } as Job;
      const result = await processor.process(job);
      expect(result).toEqual({ processed: false, recipientCount: 0 });
    });

    it('should skip when alert is not found in database', async () => {
      mockAlertsRepo.findOneBy.mockResolvedValueOnce(null);
      const job = {
        id: 'ct-2',
        name: 'confirmation-timeout',
        data: {
          alertId: 'missing-alert',
          routeId: 'r-1',
          schoolId: 'school-1',
          eventType: 'PANIC_BUTTON',
        },
      } as Job;
      const result = await processor.process(job);
      expect(result).toEqual({ processed: false, recipientCount: 0 });
    });

    it('should skip (state guard) when alert is already confirmed', async () => {
      mockAlertsRepo.findOneBy.mockResolvedValueOnce({
        id: 'alert-confirmed',
        status: EmergencyAlertStatus.CONFIRMED,
      });
      const job = {
        id: 'ct-3',
        name: 'confirmation-timeout',
        data: {
          alertId: 'alert-confirmed',
          routeId: 'r-1',
          schoolId: 'school-1',
          eventType: 'PANIC_BUTTON',
        },
      } as Job;
      const result = await processor.process(job);
      expect(result).toEqual({ processed: true, recipientCount: 0 });
      expect(mockAlertsRepo.save).not.toHaveBeenCalled();
    });

    it('should auto-escalate to parents when alert is still PENDING_CONFIRMATION', async () => {
      const alert = {
        id: 'alert-pending',
        status: EmergencyAlertStatus.PENDING_CONFIRMATION,
        routeId: 'r-1',
        schoolId: 'school-1',
      };
      mockAlertsRepo.findOneBy.mockResolvedValueOnce(alert);
      mockAlertsRepo.save.mockResolvedValueOnce({
        ...alert,
        status: EmergencyAlertStatus.AUTO_ESCALATED,
      });

      const job = {
        id: 'ct-4',
        name: 'confirmation-timeout',
        data: {
          alertId: 'alert-pending',
          routeId: 'r-1',
          schoolId: 'school-1',
          eventType: 'PANIC_BUTTON',
        },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 1 });
      expect(mockAlertsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: EmergencyAlertStatus.AUTO_ESCALATED,
        }),
      );
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
      expect(mockNotificationsQueue.add).toHaveBeenCalledWith(
        'notification-request',
        expect.objectContaining({ eventType: 'EMERGENCY_AUTO_ESCALATED' }),
      );
    });
  });

  // ── board-escalation ─────────────────────────────────────────────────────

  describe('board-escalation', () => {
    it('should skip (state guard) when alert is already resolved', async () => {
      mockAlertsRepo.findOneBy.mockResolvedValueOnce({
        id: 'alert-resolved',
        status: EmergencyAlertStatus.RESOLVED,
      });
      const job = {
        id: 'be-1',
        name: 'board-escalation',
        data: { alertId: 'alert-resolved', schoolId: 'school-1' },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 0 });
      expect(mockAlertsRepo.save).not.toHaveBeenCalled();
    });

    it('should escalate to Board Admin when alert is still PENDING_CONFIRMATION', async () => {
      const alert = {
        id: 'alert-pending-board',
        status: EmergencyAlertStatus.PENDING_CONFIRMATION,
      };
      mockAlertsRepo.findOneBy.mockResolvedValueOnce(alert);
      mockAlertsRepo.save.mockResolvedValueOnce(alert);

      const job = {
        id: 'be-2',
        name: 'board-escalation',
        data: { alertId: 'alert-pending-board', schoolId: 'school-1' },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 1 });
      expect(mockNotificationsQueue.add).toHaveBeenCalledWith(
        'notification-request',
        expect.objectContaining({ eventType: 'EMERGENCY_BOARD_ESCALATION' }),
      );
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
    });
  });

  // ── osta-escalation ──────────────────────────────────────────────────────

  describe('osta-escalation', () => {
    it('should skip (state guard) when alert is already false-alarmed', async () => {
      mockAlertsRepo.findOneBy.mockResolvedValueOnce({
        id: 'alert-false',
        status: EmergencyAlertStatus.FALSE_ALARM,
      });
      const job = {
        id: 'oe-1',
        name: 'osta-escalation',
        data: { alertId: 'alert-false', schoolId: 'school-1' },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 0 });
    });

    it('should escalate to OSTA Admin when alert is still PENDING_CONFIRMATION', async () => {
      const alert = {
        id: 'alert-pending-osta',
        status: EmergencyAlertStatus.PENDING_CONFIRMATION,
      };
      mockAlertsRepo.findOneBy.mockResolvedValueOnce(alert);
      mockAlertsRepo.save.mockResolvedValueOnce(alert);

      const job = {
        id: 'oe-2',
        name: 'osta-escalation',
        data: { alertId: 'alert-pending-osta', schoolId: 'school-1' },
      } as Job;

      const result = await processor.process(job);

      expect(result).toEqual({ processed: true, recipientCount: 1 });
      expect(mockNotificationsQueue.add).toHaveBeenCalledWith(
        'notification-request',
        expect.objectContaining({ eventType: 'EMERGENCY_OSTA_ESCALATION' }),
      );
      expect(mockAuditLogRepo.save).toHaveBeenCalled();
    });
  });
});
