import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  EmergencyAlert,
  AlertTier,
  EmergencyAlertStatus,
  EmergencyEventType,
} from './entities/emergency-alert.entity';
import { AlertAuditLog } from './entities/alert-audit-log.entity';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertClassifierService } from './alert-classifier.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AlertsService', () => {
  let service: AlertsService;

  const mockAlertRepository = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest
      .fn()
      .mockImplementation((alert: Partial<EmergencyAlert>) =>
        Promise.resolve({ id: 'uuid', ...alert }),
      ),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockAuditLogRepository = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockResolvedValue({ id: 'audit-uuid' }),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-uuid' }),
  };

  const mockGateway = {
    broadcastAlert: jest.fn(),
  };

  const mockNotifications = {
    sendPushNotification: jest.fn(),
    logNotificationAttempt: jest.fn().mockResolvedValue({ id: 'log-uuid' }),
  };

  const mockClassifier = {
    classify: jest.fn(),
    isTier1: jest.fn(),
    isTier2: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(EmergencyAlert),
          useValue: mockAlertRepository,
        },
        {
          provide: getRepositoryToken(AlertAuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: getQueueToken('alerts'),
          useValue: mockQueue,
        },
        {
          provide: WebsocketGateway,
          useValue: mockGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifications,
        },
        {
          provide: AlertClassifierService,
          useValue: mockClassifier,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    const baseDto = {
      schoolId: 'school-001',
      vehicleId: 'v-001',
      routeId: 'r-001',
      driverId: 'd-001',
      timestamp: new Date().toISOString(),
      lat: 45.4,
      lng: -75.7,
      eventType: EmergencyEventType.PANIC_BUTTON,
    };

    it('should create a Tier 1 alert with PENDING_CONFIRMATION status and schedule escalation jobs', async () => {
      mockClassifier.classify.mockReturnValue(AlertTier.TIER_1);

      const result = await service.create(baseDto);

      expect(result).toBeDefined();
      expect(mockAlertRepository.save).toHaveBeenCalled();
      // Should add 3 delayed escalation jobs, not 'emergency-event'
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'confirmation-timeout',
        expect.objectContaining({ alertId: 'uuid' }),
        expect.objectContaining({ delay: 120_000 }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'board-escalation',
        expect.objectContaining({ alertId: 'uuid' }),
        expect.objectContaining({ delay: 300_000 }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'osta-escalation',
        expect.objectContaining({ alertId: 'uuid' }),
        expect.objectContaining({ delay: 900_000 }),
      );
      // Admin WebSocket broadcast always fires
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
      // No parent notification for Tier 1 — held for confirmation
      expect(mockNotifications.logNotificationAttempt).not.toHaveBeenCalled();
      // Audit log written (CREATED + PENDING_CONFIRMATION = 2 saves)
      expect(mockAuditLogRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should create a Tier 2 alert with ACTIVE status and no parent queue job', async () => {
      mockClassifier.classify.mockReturnValue(AlertTier.TIER_2);
      const dto = { ...baseDto, eventType: EmergencyEventType.ROUTE_DEVIATION };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockAlertRepository.save).toHaveBeenCalled();
      // No queue jobs for Tier 2
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockNotifications.logNotificationAttempt).not.toHaveBeenCalled();
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
      // Only CREATED audit event
      expect(mockAuditLogRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create a Tier 3 alert and immediately fan out to parents', async () => {
      mockClassifier.classify.mockReturnValue(AlertTier.TIER_3);
      const dto = { ...baseDto, eventType: EmergencyEventType.OTHER };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'emergency-event',
        expect.anything(),
      );
      expect(mockNotifications.logNotificationAttempt).toHaveBeenCalled();
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
    });
  });

  describe('confirm()', () => {
    it('should confirm an alert and trigger parent notification', async () => {
      const existingAlert = {
        id: 'alert-001',
        status: EmergencyAlertStatus.PENDING_CONFIRMATION,
        routeId: 'r-001',
        schoolId: 'school-001',
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existingAlert,
        status: EmergencyAlertStatus.CONFIRMED,
        confirmedBy: 'admin-001',
        confirmedAt: new Date(),
      });

      const result = await service.confirm(
        'alert-001',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result.status).toBe(EmergencyAlertStatus.CONFIRMED);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'emergency-event',
        expect.anything(),
      );
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.confirm('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('falseAlarm()', () => {
    it('should mark alert as FALSE_ALARM and suppress notification', async () => {
      const existingAlert = {
        id: 'alert-002',
        status: EmergencyAlertStatus.PENDING_CONFIRMATION,
        routeId: 'r-001',
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existingAlert,
        status: EmergencyAlertStatus.FALSE_ALARM,
      });

      const result = await service.falseAlarm(
        'alert-002',
        'admin-001',
        'SCHOOL_ADMIN',
        'Test false alarm',
      );

      expect(result.status).toBe(EmergencyAlertStatus.FALSE_ALARM);
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.falseAlarm('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('requestInfo()', () => {
    it('should log INFO_REQUESTED audit event without changing alert status', async () => {
      const existingAlert = {
        id: 'alert-003',
        status: EmergencyAlertStatus.PENDING_CONFIRMATION,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);

      const result = await service.requestInfo(
        'alert-003',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result).toBeDefined();
      // Status unchanged — no save on the alert
      expect(mockAlertRepository.save).not.toHaveBeenCalled();
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.requestInfo('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('resolve()', () => {
    it('should resolve an alert and log RESOLVED audit event', async () => {
      const existingAlert = {
        id: 'alert-004',
        status: EmergencyAlertStatus.ACTIVE,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existingAlert,
        status: EmergencyAlertStatus.RESOLVED,
      });

      const result = await service.resolve('alert-004');

      expect(result.status).toBe(EmergencyAlertStatus.RESOLVED);
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should forward notes, actorUserId, actorRole to audit log', async () => {
      const existingAlert = {
        id: 'alert-005',
        status: EmergencyAlertStatus.CONFIRMED,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existingAlert,
        status: EmergencyAlertStatus.RESOLVED,
      });

      await service.resolve(
        'alert-005',
        'admin-001',
        'SCHOOL_ADMIN',
        'Incident resolved on scene',
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-005',
          actorUserId: 'admin-001',
          actorRole: 'SCHOOL_ADMIN',
          notes: 'Incident resolved on scene',
        }),
      );
    });

    it('should throw NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.resolve('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('addStatusUpdate()', () => {
    it('should add a status update to a CONFIRMED alert', async () => {
      const existingAlert = {
        id: 'alert-006',
        status: EmergencyAlertStatus.CONFIRMED,
        routeId: 'r-001',
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);

      const result = await service.addStatusUpdate(
        'alert-006',
        'Police on scene',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result).toBeDefined();
      expect(mockAuditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-006',
          notes: 'Police on scene',
          actorUserId: 'admin-001',
          actorRole: 'SCHOOL_ADMIN',
        }),
      );
      expect(mockGateway.broadcastAlert).toHaveBeenCalledWith(existingAlert);
    });

    it('should add a status update to an ACTIVE alert', async () => {
      const existingAlert = {
        id: 'alert-007',
        status: EmergencyAlertStatus.ACTIVE,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);

      const result = await service.addStatusUpdate(
        'alert-007',
        'Investigating situation',
      );

      expect(result).toBeDefined();
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should add a status update to an AUTO_ESCALATED alert', async () => {
      const existingAlert = {
        id: 'alert-008',
        status: EmergencyAlertStatus.AUTO_ESCALATED,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);

      const result = await service.addStatusUpdate(
        'alert-008',
        'Board admin reviewing',
      );

      expect(result).toBeDefined();
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.addStatusUpdate('nonexistent-id', 'notes'),
      ).rejects.toThrow('Alert nonexistent-id not found');
    });

    it('should throw BadRequestException for RESOLVED alerts', async () => {
      const existingAlert = {
        id: 'alert-009',
        status: EmergencyAlertStatus.RESOLVED,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);

      await expect(
        service.addStatusUpdate('alert-009', 'notes'),
      ).rejects.toThrow('Cannot add status update to alert in RESOLVED state');
    });

    it('should throw BadRequestException for FALSE_ALARM alerts', async () => {
      const existingAlert = {
        id: 'alert-010',
        status: EmergencyAlertStatus.FALSE_ALARM,
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existingAlert);

      await expect(
        service.addStatusUpdate('alert-010', 'notes'),
      ).rejects.toThrow(
        'Cannot add status update to alert in FALSE_ALARM state',
      );
    });
  });

  describe('getAuditLog()', () => {
    it('should return audit entries for the given alertId', async () => {
      const mockEntries = [
        { id: 'entry-1', alertId: 'alert-001', eventType: 'CREATED' },
        { id: 'entry-2', alertId: 'alert-001', eventType: 'CONFIRMED' },
      ];
      mockAuditLogRepository.find.mockResolvedValueOnce(mockEntries);

      const result = await service.getAuditLog('alert-001');

      expect(result).toHaveLength(2);
      expect(mockAuditLogRepository.find).toHaveBeenCalledWith({
        where: { alertId: 'alert-001' },
        order: { eventTimestamp: 'ASC' },
      });
    });
  });

  describe('tenant isolation', () => {
    it('findAll() scopes query by schoolId', async () => {
      await service.findAll('school-abc');

      expect(mockAlertRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: 'school-abc' } }),
      );
    });

    it('findAll() returns all alerts when no schoolId provided', async () => {
      await service.findAll();

      expect(mockAlertRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('findAllActive() scopes query by schoolId via query builder', async () => {
      await service.findAllActive('school-xyz');

      expect(mockAlertRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
