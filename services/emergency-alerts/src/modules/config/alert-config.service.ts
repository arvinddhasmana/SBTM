import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  AlertEventTypeConfig,
  AlertEscalationConfig,
  AlertEscalationChain,
  NotificationRoutingConfig,
  AlertWorkflowConfig,
  AlertConfigAudit,
  AlertConfigChangeRequest,
} from './entities';
import {
  EmergencyEventType,
  AlertTier,
} from '../alerts/entities/emergency-alert.entity';

export interface EscalationTiming {
  confirmationTimeoutMs: number | null;
  boardEscalationMs: number | null;
  ostaEscalationMs: number | null;
}

export interface EscalationStep {
  level: string;
  timeThresholdMs: number;
  channels: string[];
}

export interface NotificationRoute {
  recipientRole: string;
  timing: string;
  channels: string[];
  isMandatory: boolean;
}

export interface WorkflowAction {
  actionName: string;
  requiredRole: string;
  requiresNotes: boolean;
  statusTransition: string | null;
}

/**
 * AlertConfigService
 *
 * Provides cached access to alert configuration with automatic invalidation.
 * Implements Q9: Application-level caching for performance.
 * Implements Q10: Configuration changes take effect immediately via cache invalidation.
 */
@Injectable()
export class AlertConfigService implements OnModuleInit {
  private readonly logger = new Logger(AlertConfigService.name);

  // Cache maps
  private eventTypeCache = new Map<string, AlertTier>();
  private escalationConfigCache = new Map<string, EscalationTiming>();
  private escalationChainCache: EscalationStep[] = [];
  private notificationRoutingCache = new Map<string, NotificationRoute[]>();
  private workflowActionsCache = new Map<string, WorkflowAction[]>();

  private cacheInitialized = false;

  constructor(
    @InjectRepository(AlertEventTypeConfig)
    private eventTypeConfigRepo: Repository<AlertEventTypeConfig>,
    @InjectRepository(AlertEscalationConfig)
    private escalationConfigRepo: Repository<AlertEscalationConfig>,
    @InjectRepository(AlertEscalationChain)
    private escalationChainRepo: Repository<AlertEscalationChain>,
    @InjectRepository(NotificationRoutingConfig)
    private notificationRoutingRepo: Repository<NotificationRoutingConfig>,
    @InjectRepository(AlertWorkflowConfig)
    private workflowConfigRepo: Repository<AlertWorkflowConfig>,
    @InjectRepository(AlertConfigAudit)
    private configAuditRepo: Repository<AlertConfigAudit>,
    @InjectRepository(AlertConfigChangeRequest)
    private changeRequestRepo: Repository<AlertConfigChangeRequest>,
  ) {}

  async onModuleInit() {
    await this.initializeCache();
  }

  /**
   * Initialize all configuration caches
   */
  async initializeCache(): Promise<void> {
    this.logger.log('Initializing alert configuration cache...');

    try {
      await Promise.all([
        this.loadEventTypeCache(),
        this.loadEscalationConfigCache(),
        this.loadEscalationChainCache(),
        this.loadNotificationRoutingCache(),
        this.loadWorkflowActionsCache(),
      ]);

      this.cacheInitialized = true;
      this.logger.log('Alert configuration cache initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize configuration cache', error);
      // Don't re-throw — allow the service to start with an empty cache.
      // cacheInitialized remains false so per-method fallbacks will retry on
      // the first real request, after init-db has created the tables.
    }
  }

  /**
   * Get tier for an event type
   */
  async getEventTypeTier(eventType: string): Promise<AlertTier> {
    if (!this.cacheInitialized) {
      await this.loadEventTypeCache();
    }

    const tier = this.eventTypeCache.get(eventType);
    if (!tier) {
      // Fallback to database if not in cache
      const config = await this.eventTypeConfigRepo.findOne({
        where: { eventType, isActive: true },
      });

      if (!config) {
        this.logger.warn(
          `No configuration found for event type: ${eventType}, defaulting to TIER_2`,
        );
        return AlertTier.TIER_2;
      }

      const tierValue = config.tier as AlertTier;
      this.eventTypeCache.set(eventType, tierValue);
      return tierValue;
    }

    return tier;
  }

  /**
   * Get escalation timing for a tier
   */
  async getEscalationTiming(tier: string): Promise<EscalationTiming> {
    if (!this.cacheInitialized) {
      await this.loadEscalationConfigCache();
    }

    const timing = this.escalationConfigCache.get(tier);
    if (!timing) {
      // Fallback to database
      const config = await this.escalationConfigRepo.findOne({
        where: { tier, isDefault: true, isActive: true },
      });

      if (!config) {
        // Return defaults if no configuration found
        this.logger.warn(
          `No escalation config found for ${tier}, using hardcoded defaults`,
        );
        return {
          confirmationTimeoutMs: tier === 'TIER_1' ? 120000 : null,
          boardEscalationMs: tier === 'TIER_1' ? 300000 : null,
          ostaEscalationMs: tier === 'TIER_1' ? 900000 : null,
        };
      }

      const timingValue = {
        confirmationTimeoutMs: config.confirmationTimeoutMs,
        boardEscalationMs: config.boardEscalationMs,
        ostaEscalationMs: config.ostaEscalationMs,
      };
      this.escalationConfigCache.set(tier, timingValue);
      return timingValue;
    }

    return timing;
  }

  /**
   * Get escalation chain
   */
  async getEscalationChain(): Promise<EscalationStep[]> {
    if (!this.cacheInitialized || this.escalationChainCache.length === 0) {
      await this.loadEscalationChainCache();
    }

    return this.escalationChainCache;
  }

  /**
   * Get notification routing for tier and optional event type
   */
  async getNotificationRouting(
    tier: string,
    eventType?: string,
  ): Promise<NotificationRoute[]> {
    if (!this.cacheInitialized) {
      await this.loadNotificationRoutingCache();
    }

    const cacheKey = eventType ? `${tier}:${eventType}` : tier;
    const routes = this.notificationRoutingCache.get(cacheKey);

    if (!routes) {
      // Fallback to database
      const configs = await this.notificationRoutingRepo.find({
        where: { tier, eventType: eventType ?? IsNull(), isActive: true },
      });

      const routeValues = configs.map((c) => ({
        recipientRole: c.recipientRole,
        timing: c.notificationTiming,
        channels: c.channels,
        isMandatory: c.isMandatory,
      }));

      this.notificationRoutingCache.set(cacheKey, routeValues);
      return routeValues;
    }

    return routes;
  }

  /**
   * Get workflow actions for tier and status
   */
  async getWorkflowActions(
    tier: string,
    status: string,
  ): Promise<WorkflowAction[]> {
    if (!this.cacheInitialized) {
      await this.loadWorkflowActionsCache();
    }

    const cacheKey = `${tier}:${status}`;
    const actions = this.workflowActionsCache.get(cacheKey);

    if (!actions) {
      // Fallback to database
      const configs = await this.workflowConfigRepo.find({
        where: {
          allowedForTier: tier,
          allowedForStatus: status,
          isActive: true,
        },
      });

      const actionValues = configs.map((c) => ({
        actionName: c.actionName,
        requiredRole: c.requiredRole,
        requiresNotes: c.requiresNotes,
        statusTransition: c.statusTransition,
      }));

      this.workflowActionsCache.set(cacheKey, actionValues);
      return actionValues;
    }

    return actions;
  }

  /**
   * Invalidate entire cache - called after configuration changes
   */
  async invalidateCache(): Promise<void> {
    this.logger.log('Invalidating alert configuration cache...');

    this.eventTypeCache.clear();
    this.escalationConfigCache.clear();
    this.escalationChainCache = [];
    this.notificationRoutingCache.clear();
    this.workflowActionsCache.clear();
    this.cacheInitialized = false;

    await this.initializeCache();
  }

  /**
   * Invalidate specific cache type
   */
  async invalidateCacheType(cacheType: string): Promise<void> {
    this.logger.log(`Invalidating ${cacheType} cache...`);

    switch (cacheType) {
      case 'eventType':
        this.eventTypeCache.clear();
        await this.loadEventTypeCache();
        break;
      case 'escalation':
        this.escalationConfigCache.clear();
        await this.loadEscalationConfigCache();
        break;
      case 'escalationChain':
        this.escalationChainCache = [];
        await this.loadEscalationChainCache();
        break;
      case 'notificationRouting':
        this.notificationRoutingCache.clear();
        await this.loadNotificationRoutingCache();
        break;
      case 'workflow':
        this.workflowActionsCache.clear();
        await this.loadWorkflowActionsCache();
        break;
      default:
        this.logger.warn(`Unknown cache type: ${cacheType}`);
    }
  }

  /**
   * Log configuration change for audit
   */
  async logConfigChange(
    configTable: string,
    configId: string,
    action: string,
    changedByUserId: string,
    changedByRole: string,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
    changeReason?: string,
  ): Promise<void> {
    const audit = this.configAuditRepo.create({
      configTable,
      configId,
      action,
      changedByUserId,
      changedByRole,
      oldValues,
      newValues,
      changeReason,
    });

    await this.configAuditRepo.save(audit);
    this.logger.log(
      `Configuration change logged: ${configTable}/${configId} - ${action}`,
    );
  }

  // Private cache loading methods

  private async loadEventTypeCache(): Promise<void> {
    const configs = await this.eventTypeConfigRepo.find({
      where: { isActive: true },
    });

    configs.forEach((config) => {
      this.eventTypeCache.set(config.eventType, config.tier as AlertTier);
    });

    this.logger.log(
      `Loaded ${configs.length} event type configurations into cache`,
    );
  }

  private async loadEscalationConfigCache(): Promise<void> {
    const configs = await this.escalationConfigRepo.find({
      where: { isDefault: true, isActive: true },
    });

    configs.forEach((config) => {
      this.escalationConfigCache.set(config.tier, {
        confirmationTimeoutMs: config.confirmationTimeoutMs,
        boardEscalationMs: config.boardEscalationMs,
        ostaEscalationMs: config.ostaEscalationMs,
      });
    });

    this.logger.log(
      `Loaded ${configs.length} escalation configurations into cache`,
    );
  }

  private async loadEscalationChainCache(): Promise<void> {
    const chains = await this.escalationChainRepo.find({
      where: { configName: 'default-chain', isActive: true },
      order: { sequenceOrder: 'ASC' },
    });

    this.escalationChainCache = chains.map((chain) => ({
      level: chain.escalationLevel,
      timeThresholdMs: chain.timeThresholdMs,
      channels: chain.notificationChannels || [],
    }));

    this.logger.log(
      `Loaded ${chains.length} escalation chain steps into cache`,
    );
  }

  private async loadNotificationRoutingCache(): Promise<void> {
    const configs = await this.notificationRoutingRepo.find({
      where: { isActive: true },
    });

    // Group by tier and eventType
    configs.forEach((config) => {
      const cacheKey = config.eventType
        ? `${config.tier}:${config.eventType}`
        : config.tier;

      const existing = this.notificationRoutingCache.get(cacheKey) || [];
      existing.push({
        recipientRole: config.recipientRole,
        timing: config.notificationTiming,
        channels: config.channels,
        isMandatory: config.isMandatory,
      });

      this.notificationRoutingCache.set(cacheKey, existing);
    });

    this.logger.log(
      `Loaded ${configs.length} notification routing rules into cache`,
    );
  }

  private async loadWorkflowActionsCache(): Promise<void> {
    const configs = await this.workflowConfigRepo.find({
      where: { isActive: true },
    });

    // Group by tier and status
    configs.forEach((config) => {
      const cacheKey = `${config.allowedForTier}:${config.allowedForStatus}`;

      const existing = this.workflowActionsCache.get(cacheKey) || [];
      existing.push({
        actionName: config.actionName,
        requiredRole: config.requiredRole,
        requiresNotes: config.requiresNotes,
        statusTransition: config.statusTransition,
      });

      this.workflowActionsCache.set(cacheKey, existing);
    });

    this.logger.log(
      `Loaded ${configs.length} workflow action configurations into cache`,
    );
  }

  // ============================================================================
  // CRUD Methods for Event Type Configuration
  // ============================================================================

  async getAllEventTypeConfigs(): Promise<AlertEventTypeConfig[]> {
    return this.eventTypeConfigRepo.find({
      where: { isActive: true },
      order: { eventType: 'ASC' },
    });
  }

  async getEventTypeConfig(eventType: string): Promise<AlertEventTypeConfig> {
    const config = await this.eventTypeConfigRepo.findOne({
      where: { eventType, isActive: true },
    });

    if (!config) {
      throw new NotFoundException(
        `Event type configuration not found: ${eventType}`,
      );
    }

    return config;
  }

  async createEventTypeConfig(
    dto: any,
    actorUserId?: string,
  ): Promise<AlertEventTypeConfig> {
    const existing = await this.eventTypeConfigRepo.findOne({
      where: { eventType: dto.eventType },
    });

    if (existing) {
      throw new BadRequestException(
        `Event type configuration already exists: ${dto.eventType}`,
      );
    }

    const config = this.eventTypeConfigRepo.create(
      dto as Partial<AlertEventTypeConfig>,
    );
    const saved = await this.eventTypeConfigRepo.save(config);

    await this.logConfigChange(
      'alert_event_type_config',
      saved.eventType,
      'CREATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      null,
      { ...dto },
    );

    await this.invalidateCacheType('eventType');
    return saved;
  }

  async updateEventTypeConfig(
    eventType: string,
    dto: any,
    actorUserId?: string,
  ): Promise<AlertEventTypeConfig> {
    const config = await this.eventTypeConfigRepo.findOne({
      where: { eventType },
    });

    if (!config) {
      throw new NotFoundException(
        `Event type configuration not found: ${eventType}`,
      );
    }

    const oldValues = { ...config };
    Object.assign(config, dto);
    const saved = await this.eventTypeConfigRepo.save(config);

    await this.logConfigChange(
      'alert_event_type_config',
      eventType,
      'UPDATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      oldValues,
      { ...dto },
    );

    await this.invalidateCacheType('eventType');
    return saved;
  }

  async deleteEventTypeConfig(
    eventType: string,
    actorUserId?: string,
  ): Promise<void> {
    const config = await this.eventTypeConfigRepo.findOne({
      where: { eventType },
    });

    if (!config) {
      throw new NotFoundException(
        `Event type configuration not found: ${eventType}`,
      );
    }

    // Soft delete by setting isActive to false
    config.isActive = false;
    await this.eventTypeConfigRepo.save(config);

    await this.logConfigChange(
      'alert_event_type_config',
      eventType,
      'DELETE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      { isActive: true },
      { isActive: false },
    );

    await this.invalidateCacheType('eventType');
  }

  // ============================================================================
  // CRUD Methods for Escalation Configuration
  // ============================================================================

  async getAllEscalationConfigs(): Promise<AlertEscalationConfig[]> {
    return this.escalationConfigRepo.find({
      where: { isActive: true },
      order: { tier: 'ASC' },
    });
  }

  async getEscalationConfig(tier: string): Promise<AlertEscalationConfig> {
    const config = await this.escalationConfigRepo.findOne({
      where: { tier, isDefault: true, isActive: true },
    });

    if (!config) {
      throw new NotFoundException(
        `Escalation configuration not found for tier: ${tier}`,
      );
    }

    return config;
  }

  async createEscalationConfig(
    dto: any,
    actorUserId?: string,
  ): Promise<AlertEscalationConfig> {
    const config = this.escalationConfigRepo.create(
      dto as Partial<AlertEscalationConfig>,
    );
    const saved = await this.escalationConfigRepo.save(config);

    await this.logConfigChange(
      'alert_escalation_config',
      saved.id,
      'CREATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      null,
      { ...dto },
    );

    await this.invalidateCacheType('escalation');
    return saved;
  }

  async updateEscalationConfig(
    tier: string,
    dto: any,
    actorUserId?: string,
  ): Promise<AlertEscalationConfig> {
    const config = await this.escalationConfigRepo.findOne({
      where: { tier, isDefault: true },
    });

    if (!config) {
      throw new NotFoundException(
        `Escalation configuration not found for tier: ${tier}`,
      );
    }

    const oldValues = { ...config };
    Object.assign(config, dto);
    const saved = await this.escalationConfigRepo.save(config);

    await this.logConfigChange(
      'alert_escalation_config',
      config.id,
      'UPDATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      oldValues,
      { ...dto },
    );

    await this.invalidateCacheType('escalation');
    return saved;
  }

  async deleteEscalationConfig(
    tier: string,
    actorUserId?: string,
  ): Promise<void> {
    const config = await this.escalationConfigRepo.findOne({
      where: { tier, isDefault: true },
    });

    if (!config) {
      throw new NotFoundException(
        `Escalation configuration not found for tier: ${tier}`,
      );
    }

    config.isActive = false;
    await this.escalationConfigRepo.save(config);

    await this.logConfigChange(
      'alert_escalation_config',
      config.id,
      'DELETE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      { isActive: true },
      { isActive: false },
    );

    await this.invalidateCacheType('escalation');
  }

  // ============================================================================
  // CRUD Methods for Notification Routing Configuration
  // ============================================================================

  async getAllNotificationRoutingConfigs(
    tier?: string,
    eventType?: string,
  ): Promise<NotificationRoutingConfig[]> {
    const where: any = { isActive: true };
    if (tier) where.tier = tier;
    if (eventType) where.eventType = eventType;

    return this.notificationRoutingRepo.find({
      where,
      order: { tier: 'ASC', recipientRole: 'ASC' },
    });
  }

  async getNotificationRoutingConfigById(
    id: string,
  ): Promise<NotificationRoutingConfig> {
    const config = await this.notificationRoutingRepo.findOne({
      where: { id, isActive: true },
    });

    if (!config) {
      throw new NotFoundException(
        `Notification routing configuration not found: ${id}`,
      );
    }

    return config;
  }

  async createNotificationRoutingConfig(
    dto: any,
    actorUserId?: string,
  ): Promise<NotificationRoutingConfig> {
    const config = this.notificationRoutingRepo.create(
      dto as Partial<NotificationRoutingConfig>,
    );
    const saved = await this.notificationRoutingRepo.save(config);

    await this.logConfigChange(
      'notification_routing_config',
      saved.id,
      'CREATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      null,
      { ...dto },
    );

    await this.invalidateCacheType('notificationRouting');
    return saved;
  }

  async updateNotificationRoutingConfig(
    id: string,
    dto: any,
    actorUserId?: string,
  ): Promise<NotificationRoutingConfig> {
    const config = await this.notificationRoutingRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `Notification routing configuration not found: ${id}`,
      );
    }

    const oldValues = { ...config };
    Object.assign(config, dto);
    const saved = await this.notificationRoutingRepo.save(config);

    await this.logConfigChange(
      'notification_routing_config',
      id,
      'UPDATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      oldValues,
      { ...dto },
    );

    await this.invalidateCacheType('notificationRouting');
    return saved;
  }

  async deleteNotificationRoutingConfig(
    id: string,
    actorUserId?: string,
  ): Promise<void> {
    const config = await this.notificationRoutingRepo.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `Notification routing configuration not found: ${id}`,
      );
    }

    config.isActive = false;
    await this.notificationRoutingRepo.save(config);

    await this.logConfigChange(
      'notification_routing_config',
      id,
      'DELETE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      { isActive: true },
      { isActive: false },
    );

    await this.invalidateCacheType('notificationRouting');
  }

  // ============================================================================
  // CRUD Methods for Workflow Configuration
  // ============================================================================

  async getAllWorkflowConfigs(
    tier?: string,
    status?: string,
  ): Promise<AlertWorkflowConfig[]> {
    const where: any = { isActive: true };
    if (tier) where.allowedForTier = tier;
    if (status) where.allowedForStatus = status;

    return this.workflowConfigRepo.find({
      where,
      order: { allowedForTier: 'ASC', actionName: 'ASC' },
    });
  }

  async getWorkflowConfigById(id: string): Promise<AlertWorkflowConfig> {
    const config = await this.workflowConfigRepo.findOne({
      where: { id, isActive: true },
    });

    if (!config) {
      throw new NotFoundException(`Workflow configuration not found: ${id}`);
    }

    return config;
  }

  async createWorkflowConfig(
    dto: any,
    actorUserId?: string,
  ): Promise<AlertWorkflowConfig> {
    const config = this.workflowConfigRepo.create(
      dto as Partial<AlertWorkflowConfig>,
    );
    const saved = await this.workflowConfigRepo.save(config);

    await this.logConfigChange(
      'alert_workflow_config',
      saved.id,
      'CREATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      null,
      { ...dto },
    );

    await this.invalidateCacheType('workflow');
    return saved;
  }

  async updateWorkflowConfig(
    id: string,
    dto: any,
    actorUserId?: string,
  ): Promise<AlertWorkflowConfig> {
    const config = await this.workflowConfigRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Workflow configuration not found: ${id}`);
    }

    const oldValues = { ...config };
    Object.assign(config, dto);
    const saved = await this.workflowConfigRepo.save(config);

    await this.logConfigChange(
      'alert_workflow_config',
      id,
      'UPDATE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      oldValues,
      { ...dto },
    );

    await this.invalidateCacheType('workflow');
    return saved;
  }

  async deleteWorkflowConfig(id: string, actorUserId?: string): Promise<void> {
    const config = await this.workflowConfigRepo.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException(`Workflow configuration not found: ${id}`);
    }

    config.isActive = false;
    await this.workflowConfigRepo.save(config);

    await this.logConfigChange(
      'alert_workflow_config',
      id,
      'DELETE',
      actorUserId || 'system',
      'SUPER_ADMIN',
      { isActive: true },
      { isActive: false },
    );

    await this.invalidateCacheType('workflow');
  }

  // ============================================================================
  // Change Request Methods
  // ============================================================================

  async getChangeRequests(
    status?: string,
    requestorId?: string,
  ): Promise<AlertConfigChangeRequest[]> {
    const where: any = {};
    if (status) where.status = status;
    if (requestorId) where.requestorId = requestorId;

    return this.changeRequestRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getChangeRequest(id: string): Promise<AlertConfigChangeRequest> {
    const request = await this.changeRequestRepo.findOne({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Change request not found: ${id}`);
    }

    return request;
  }

  async createChangeRequest(
    dto: any,
    requestorId: string,
    requestorRole: string,
    requestorEmail?: string,
  ): Promise<AlertConfigChangeRequest> {
    // requestorEmail is accepted by the API for future email notifications but is not
    // persisted (no column on entity). Intentionally unused here.
    void requestorEmail;
    const request = this.changeRequestRepo.create({
      ...(dto as Partial<AlertConfigChangeRequest>),
      requestedByUserId: requestorId,
      requestedByRole: requestorRole,
      status: 'PENDING',
    });

    const saved = await this.changeRequestRepo.save(request);

    // TODO: Send email notification to Super Admins
    this.logger.log(
      `Change request created: ${saved.id} by ${requestorId} (${requestorRole})`,
    );

    return saved;
  }

  async reviewChangeRequest(
    id: string,
    dto: { action: 'APPROVED' | 'REJECTED'; reviewNotes?: string },
    reviewerId: string,
  ): Promise<AlertConfigChangeRequest> {
    const request = await this.changeRequestRepo.findOne({ where: { id } });

    if (!request) {
      throw new NotFoundException(`Change request not found: ${id}`);
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Change request is not pending: ${request.status}`,
      );
    }

    request.status = dto.action;
    request.reviewedByUserId = reviewerId;
    request.reviewedAt = new Date();
    request.reviewNotes = dto.reviewNotes ?? null;

    const saved = await this.changeRequestRepo.save(request);

    // TODO: Send email notification to requestor
    this.logger.log(
      `Change request ${dto.action.toLowerCase()}: ${id} by ${reviewerId}`,
    );

    return saved;
  }

  // ============================================================================
  // Audit Log Methods
  // ============================================================================

  async getConfigAuditLog(
    configType?: string,
    configKey?: string,
    limit: number = 100,
  ): Promise<AlertConfigAudit[]> {
    const where: any = {};
    if (configType) where.configTable = configType;
    if (configKey) where.configId = configKey;

    return this.configAuditRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ============================================================================
  // Cache Status Method
  // ============================================================================

  async getCacheStatus(): Promise<any> {
    return {
      initialized: this.cacheInitialized,
      eventTypeCount: this.eventTypeCache.size,
      escalationConfigCount: this.escalationConfigCache.size,
      escalationChainSteps: this.escalationChainCache.length,
      notificationRoutingCount: this.notificationRoutingCache.size,
      workflowActionsCount: this.workflowActionsCache.size,
    };
  }
}
