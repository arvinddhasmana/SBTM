import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertConfigService } from './alert-config.service';
import {
  AlertEventTypeConfig,
  AlertEscalationConfig,
  AlertEscalationChain,
  NotificationRoutingConfig,
  AlertWorkflowConfig,
  AlertConfigAudit,
} from './entities';
import { AlertTier } from '../alerts/entities/emergency-alert.entity';

describe('AlertConfigService', () => {
  let service: AlertConfigService;
  let eventTypeRepo: jest.Mocked<Repository<AlertEventTypeConfig>>;
  let escalationConfigRepo: jest.Mocked<Repository<AlertEscalationConfig>>;
  let escalationChainRepo: jest.Mocked<Repository<AlertEscalationChain>>;
  let notificationRoutingRepo: jest.Mocked<
    Repository<NotificationRoutingConfig>
  >;
  let workflowConfigRepo: jest.Mocked<Repository<AlertWorkflowConfig>>;
  let configAuditRepo: jest.Mocked<Repository<AlertConfigAudit>>;

  const mockEventTypeConfig = {
    id: '1',
    eventType: 'PANIC_BUTTON',
    tier: 'TIER_1',
    displayName: 'Panic Button',
    requiresConfirmation: true,
    notifyParents: true,
    isActive: true,
  };

  const mockEscalationConfig = {
    id: '1',
    configName: 'tier1-default',
    tier: 'TIER_1',
    confirmationTimeoutMs: 120000,
    boardEscalationMs: 300000,
    staEscalationMs: 900000,
    isDefault: true,
    isActive: true,
  };

  const mockEscalationChain = [
    {
      id: '1',
      configName: 'default-chain',
      sequenceOrder: 0,
      escalationLevel: 'SCHOOL',
      timeThresholdMs: 0,
      notificationChannels: ['WEBSOCKET', 'PUSH'],
      isActive: true,
    },
    {
      id: '2',
      configName: 'default-chain',
      sequenceOrder: 1,
      escalationLevel: 'BOARD',
      timeThresholdMs: 300000,
      notificationChannels: ['WEBSOCKET', 'PUSH', 'SMS'],
      isActive: true,
    },
  ];

  beforeEach(async () => {
    const mockRepoFactory = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertConfigService,
        {
          provide: getRepositoryToken(AlertEventTypeConfig),
          useFactory: mockRepoFactory,
        },
        {
          provide: getRepositoryToken(AlertEscalationConfig),
          useFactory: mockRepoFactory,
        },
        {
          provide: getRepositoryToken(AlertEscalationChain),
          useFactory: mockRepoFactory,
        },
        {
          provide: getRepositoryToken(NotificationRoutingConfig),
          useFactory: mockRepoFactory,
        },
        {
          provide: getRepositoryToken(AlertWorkflowConfig),
          useFactory: mockRepoFactory,
        },
        {
          provide: getRepositoryToken(AlertConfigAudit),
          useFactory: mockRepoFactory,
        },
      ],
    }).compile();

    service = module.get<AlertConfigService>(AlertConfigService);
    eventTypeRepo = module.get(getRepositoryToken(AlertEventTypeConfig));
    escalationConfigRepo = module.get(
      getRepositoryToken(AlertEscalationConfig),
    );
    escalationChainRepo = module.get(getRepositoryToken(AlertEscalationChain));
    notificationRoutingRepo = module.get(
      getRepositoryToken(NotificationRoutingConfig),
    );
    workflowConfigRepo = module.get(getRepositoryToken(AlertWorkflowConfig));
    configAuditRepo = module.get(getRepositoryToken(AlertConfigAudit));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeCache', () => {
    it('should load all configuration caches successfully', async () => {
      eventTypeRepo.find.mockResolvedValue([mockEventTypeConfig] as any);
      escalationConfigRepo.find.mockResolvedValue([
        mockEscalationConfig,
      ] as any);
      escalationChainRepo.find.mockResolvedValue(mockEscalationChain as any);
      notificationRoutingRepo.find.mockResolvedValue([]);
      workflowConfigRepo.find.mockResolvedValue([]);

      await service.initializeCache();

      expect(eventTypeRepo.find).toHaveBeenCalled();
      expect(escalationConfigRepo.find).toHaveBeenCalled();
      expect(escalationChainRepo.find).toHaveBeenCalled();
      expect(notificationRoutingRepo.find).toHaveBeenCalled();
      expect(workflowConfigRepo.find).toHaveBeenCalled();
    });
  });

  describe('getEventTypeTier', () => {
    beforeEach(async () => {
      eventTypeRepo.find.mockResolvedValue([mockEventTypeConfig] as any);
      escalationConfigRepo.find.mockResolvedValue([]);
      escalationChainRepo.find.mockResolvedValue([]);
      notificationRoutingRepo.find.mockResolvedValue([]);
      workflowConfigRepo.find.mockResolvedValue([]);
      await service.initializeCache();
    });

    it('should return tier from cache', async () => {
      const tier = await service.getEventTypeTier('PANIC_BUTTON');
      expect(tier).toBe(AlertTier.TIER_1);
    });

    it('should fetch from database if not in cache', async () => {
      eventTypeRepo.findOne.mockResolvedValue({
        ...mockEventTypeConfig,
        eventType: 'CUSTOM_EVENT',
        tier: 'TIER_2',
      } as any);

      const tier = await service.getEventTypeTier('CUSTOM_EVENT');
      expect(tier).toBe(AlertTier.TIER_2);
      expect(eventTypeRepo.findOne).toHaveBeenCalledWith({
        where: { eventType: 'CUSTOM_EVENT', isActive: true },
      });
    });

    it('should return TIER_2 as default if no configuration found', async () => {
      eventTypeRepo.findOne.mockResolvedValue(null);

      const tier = await service.getEventTypeTier('UNKNOWN_EVENT');
      expect(tier).toBe(AlertTier.TIER_2);
    });
  });

  describe('getEscalationTiming', () => {
    beforeEach(async () => {
      eventTypeRepo.find.mockResolvedValue([]);
      escalationConfigRepo.find.mockResolvedValue([
        mockEscalationConfig,
      ] as any);
      escalationChainRepo.find.mockResolvedValue([]);
      notificationRoutingRepo.find.mockResolvedValue([]);
      workflowConfigRepo.find.mockResolvedValue([]);
      await service.initializeCache();
    });

    it('should return escalation timing from cache', async () => {
      const timing = await service.getEscalationTiming('TIER_1');
      expect(timing).toEqual({
        confirmationTimeoutMs: 120000,
        boardEscalationMs: 300000,
        staEscalationMs: 900000,
      });
    });

    it('should fetch from database if not in cache', async () => {
      escalationConfigRepo.findOne.mockResolvedValue({
        ...mockEscalationConfig,
        tier: 'TIER_2',
        confirmationTimeoutMs: null,
        boardEscalationMs: null,
        staEscalationMs: null,
      } as any);

      const timing = await service.getEscalationTiming('TIER_2');
      expect(timing.confirmationTimeoutMs).toBeNull();
    });
  });

  describe('getEscalationChain', () => {
    beforeEach(async () => {
      eventTypeRepo.find.mockResolvedValue([]);
      escalationConfigRepo.find.mockResolvedValue([]);
      escalationChainRepo.find.mockResolvedValue(mockEscalationChain as any);
      notificationRoutingRepo.find.mockResolvedValue([]);
      workflowConfigRepo.find.mockResolvedValue([]);
      await service.initializeCache();
    });

    it('should return escalation chain from cache', async () => {
      const chain = await service.getEscalationChain();
      expect(chain).toHaveLength(2);
      expect(chain[0].level).toBe('SCHOOL');
      expect(chain[1].level).toBe('BOARD');
    });
  });

  describe('invalidateCache', () => {
    it('should clear all caches and reinitialize', async () => {
      eventTypeRepo.find.mockResolvedValue([mockEventTypeConfig] as any);
      escalationConfigRepo.find.mockResolvedValue([
        mockEscalationConfig,
      ] as any);
      escalationChainRepo.find.mockResolvedValue(mockEscalationChain as any);
      notificationRoutingRepo.find.mockResolvedValue([]);
      workflowConfigRepo.find.mockResolvedValue([]);

      await service.invalidateCache();

      // Should have called find methods twice (initial load + after invalidation)
      expect(eventTypeRepo.find).toHaveBeenCalledTimes(2);
      expect(escalationConfigRepo.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('logConfigChange', () => {
    it('should create audit log entry', async () => {
      const auditEntry = {
        id: '1',
        configTable: 'alert_event_type_config',
        configId: '123',
        action: 'UPDATE',
        changedByUserId: 'user-1',
        changedByRole: 'SUPER_ADMIN',
        oldValues: { tier: 'TIER_2' },
        newValues: { tier: 'TIER_1' },
        changeReason: 'Security upgrade',
      };

      configAuditRepo.create.mockReturnValue(auditEntry as any);
      configAuditRepo.save.mockResolvedValue(auditEntry as any);

      await service.logConfigChange(
        'alert_event_type_config',
        '123',
        'UPDATE',
        'user-1',
        'SUPER_ADMIN',
        { tier: 'TIER_2' },
        { tier: 'TIER_1' },
        'Security upgrade',
      );

      expect(configAuditRepo.create).toHaveBeenCalled();
      expect(configAuditRepo.save).toHaveBeenCalledWith(auditEntry);
    });
  });
});
