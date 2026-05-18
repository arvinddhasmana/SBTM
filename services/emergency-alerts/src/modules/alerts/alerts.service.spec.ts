import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Alert,
  AlertCategory,
  AlertScopeKind,
  AlertSeverity,
  AlertStatus,
} from './entities/alert.entity';
import { AlertAudit } from './entities/alert-audit.entity';
import { EmergencyEventType } from './event-types';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { AlertClassifierService } from './alert-classifier.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AlertsService', () => {
  let service: AlertsService;

  const mockAlertRepository = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest
      .fn()
      .mockImplementation((alert: Partial<Alert>) =>
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

  const mockAuditRepository = {
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

  const mockClassifier = {
    classify: jest.fn().mockReturnValue({
      category: AlertCategory.SAFETY,
      severity: AlertSeverity.CRITICAL,
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: mockAlertRepository,
        },
        {
          provide: getRepositoryToken(AlertAudit),
          useValue: mockAuditRepository,
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
      schoolId: '00000000-0000-0000-0000-000000000001',
      vehicleId: 'v-001',
      routeId: 'r-001',
      driverId: 'd-001',
      timestamp: new Date().toISOString(),
      lat: 45.4,
      lng: -75.7,
      eventType: EmergencyEventType.PANIC_BUTTON,
    };

    it('persists an active alert mapped from the v1 event payload', async () => {
      mockClassifier.classify.mockReturnValueOnce({
        category: AlertCategory.SAFETY,
        severity: AlertSeverity.CRITICAL,
      });

      const result = await service.create(baseDto);

      expect(result).toBeDefined();
      expect(mockAlertRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          staId: baseDto.schoolId,
          scopeKind: AlertScopeKind.ROUTE,
          scopeRef: baseDto.routeId,
          status: AlertStatus.ACTIVE,
          category: AlertCategory.SAFETY,
          severity: AlertSeverity.CRITICAL,
        }),
      );
      expect(mockAlertRepository.save).toHaveBeenCalled();
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
    });

    it('enqueues a single `emergency-event` job for fan-out (wire-compat)', async () => {
      await service.create(baseDto);

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'emergency-event',
        expect.objectContaining({
          alertId: 'uuid',
          routeId: baseDto.routeId,
          schoolId: baseDto.schoolId,
        }),
      );
    });

    it('writes a `created` audit row carrying v1 context (vehicle/driver/lat/lng)', async () => {
      await service.create(baseDto);

      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'created',
          payload: expect.objectContaining({
            eventType: baseDto.eventType,
            vehicleId: baseDto.vehicleId,
            driverId: baseDto.driverId,
            lat: baseDto.lat,
            lng: baseDto.lng,
          }),
        }),
      );
      expect(mockAuditRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirm()', () => {
    it('records a `confirmed` audit row without mutating alert status', async () => {
      const existing = {
        id: 'alert-001',
        status: AlertStatus.ACTIVE,
        scopeRef: 'r-001',
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existing);

      const result = await service.confirm(
        'alert-001',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result.status).toBe(AlertStatus.ACTIVE);
      expect(mockAlertRepository.save).not.toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-001',
          action: 'confirmed',
          actorUserId: 'admin-001',
        }),
      );
      expect(mockAuditRepository.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.confirm('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('falseAlarm()', () => {
    it('flips alert to CANCELLED and writes a `cancelled` audit row', async () => {
      const existing = {
        id: 'alert-002',
        status: AlertStatus.ACTIVE,
        scopeRef: 'r-001',
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existing);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existing,
        status: AlertStatus.CANCELLED,
      });

      const result = await service.falseAlarm(
        'alert-002',
        'admin-001',
        'SCHOOL_ADMIN',
        'Test false alarm',
      );

      expect(result.status).toBe(AlertStatus.CANCELLED);
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cancelled',
          payload: expect.objectContaining({
            reason: 'false_alarm',
            notes: 'Test false alarm',
          }),
        }),
      );
    });

    it('throws NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.falseAlarm('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('requestInfo()', () => {
    it('records an `info_requested` audit row without changing alert status', async () => {
      const existing = { id: 'alert-003', status: AlertStatus.ACTIVE };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existing);

      const result = await service.requestInfo(
        'alert-003',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result).toBeDefined();
      expect(mockAlertRepository.save).not.toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-003',
          action: 'info_requested',
        }),
      );
    });

    it('throws NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.requestInfo('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('resolve()', () => {
    it('flips an ACTIVE alert to RESOLVED and writes a `resolved` audit row', async () => {
      const existing = { id: 'alert-004', status: AlertStatus.ACTIVE };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existing);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existing,
        status: AlertStatus.RESOLVED,
      });

      const result = await service.resolve('alert-004');

      expect(result.status).toBe(AlertStatus.RESOLVED);
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'resolved' }),
      );
    });

    it('forwards notes, actorUserId, actorRole to the audit payload', async () => {
      const existing = { id: 'alert-005', status: AlertStatus.ACTIVE };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existing);
      mockAlertRepository.save.mockResolvedValueOnce({
        ...existing,
        status: AlertStatus.RESOLVED,
      });

      await service.resolve(
        'alert-005',
        'admin-001',
        'SCHOOL_ADMIN',
        'Incident resolved on scene',
      );

      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-005',
          actorUserId: 'admin-001',
          payload: expect.objectContaining({
            actorRole: 'SCHOOL_ADMIN',
            notes: 'Incident resolved on scene',
          }),
        }),
      );
    });

    it('throws NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.resolve('nonexistent-id')).rejects.toThrow(
        'Alert nonexistent-id not found',
      );
    });
  });

  describe('addStatusUpdate()', () => {
    it('adds a `status_update` audit row when alert is ACTIVE', async () => {
      const existing = {
        id: 'alert-006',
        status: AlertStatus.ACTIVE,
        scopeRef: 'r-001',
      };
      mockAlertRepository.findOneBy.mockResolvedValueOnce(existing);

      const result = await service.addStatusUpdate(
        'alert-006',
        'Police on scene',
        'admin-001',
        'SCHOOL_ADMIN',
      );

      expect(result).toBeDefined();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-006',
          action: 'status_update',
          actorUserId: 'admin-001',
          payload: expect.objectContaining({
            notes: 'Police on scene',
            actorRole: 'SCHOOL_ADMIN',
          }),
        }),
      );
      expect(mockGateway.broadcastAlert).toHaveBeenCalled();
    });

    it('throws NotFoundException when alert is not found', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.addStatusUpdate('nonexistent-id', 'notes'),
      ).rejects.toThrow('Alert nonexistent-id not found');
    });

    it('throws BadRequestException for RESOLVED alerts', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce({
        id: 'alert-009',
        status: AlertStatus.RESOLVED,
      });

      await expect(
        service.addStatusUpdate('alert-009', 'notes'),
      ).rejects.toThrow('Cannot add status update to alert in resolved state');
    });

    it('throws BadRequestException for CANCELLED alerts', async () => {
      mockAlertRepository.findOneBy.mockResolvedValueOnce({
        id: 'alert-010',
        status: AlertStatus.CANCELLED,
      });

      await expect(
        service.addStatusUpdate('alert-010', 'notes'),
      ).rejects.toThrow('Cannot add status update to alert in cancelled state');
    });
  });

  describe('getAuditLog()', () => {
    it('returns audit entries for the given alertId in chronological order', async () => {
      const mockEntries = [
        { id: 'entry-1', alertId: 'alert-001', action: 'created' },
        { id: 'entry-2', alertId: 'alert-001', action: 'confirmed' },
      ];
      mockAuditRepository.find.mockResolvedValueOnce(mockEntries);

      const result = await service.getAuditLog('alert-001');

      expect(result).toHaveLength(2);
      expect(mockAuditRepository.find).toHaveBeenCalledWith({
        where: { alertId: 'alert-001' },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('tenant isolation', () => {
    it('findAll() scopes query by staId', async () => {
      await service.findAll('sta-abc');

      expect(mockAlertRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { staId: 'sta-abc' } }),
      );
    });

    it('findAll() returns all alerts when no staId provided', async () => {
      await service.findAll();

      expect(mockAlertRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('findAllActive() scopes query by staId via query builder', async () => {
      await service.findAllActive('sta-xyz');

      expect(mockAlertRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findForRoute()', () => {
    it('returns alertActive=true for an ACTIVE alert scoped to the route', async () => {
      const active = {
        id: 'alert-active',
        category: AlertCategory.SAFETY,
        severity: AlertSeverity.CRITICAL,
        title: 'panic button on route route-1',
        body: null,
        scopeRef: 'route-1',
        status: AlertStatus.ACTIVE,
        createdAt: new Date('2026-04-18T10:00:00Z'),
      };
      mockAlertRepository.findOne.mockResolvedValueOnce(active);

      const result = await service.findForRoute('route-1');

      expect(result.alertActive).toBe(true);
      expect(result.id).toBe('alert-active');
      expect(result.category).toBe(AlertCategory.SAFETY);
      expect(result.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('returns alertActive=false when no active alerts exist', async () => {
      mockAlertRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.findForRoute('route-1');

      expect(result.alertActive).toBe(false);
      expect(result.message).toBe('No active alerts.');
    });
  });
});
