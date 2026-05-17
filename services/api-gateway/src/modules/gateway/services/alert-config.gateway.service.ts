import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

export interface EventTypeConfigDto {
  eventType: string;
  tier: string;
  description?: string;
  severity?: string;
  requiresLocation?: boolean;
  isActive?: boolean;
}

export interface EscalationConfigDto {
  id?: string;
  tier: string;
  confirmationTimeoutMs?: number;
  boardEscalationMs?: number;
  staEscalationMs?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface NotificationRoutingConfigDto {
  id?: string;
  tier: string;
  eventType?: string;
  recipientRole: string;
  notificationTiming: string;
  channels: string[];
  isMandatory: boolean;
  isActive?: boolean;
}

export interface WorkflowConfigDto {
  id?: string;
  actionName: string;
  allowedForTier: string;
  allowedForStatus: string;
  requiredRole: string;
  requiresNotes: boolean;
  statusTransition?: string;
  isActive?: boolean;
}

export interface ChangeRequestDto {
  id?: string;
  configType: string;
  changeDescription: string;
  requestedConfig: Record<string, any>;
  justification?: string;
  status?: string;
  requestorId?: string;
  requestorRole?: string;
  requestorEmail?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  requestedAt?: string;
  reviewedAt?: string;
}

export interface ConfigAuditLogDto {
  id?: string;
  configTable: string;
  configId: string;
  action: string;
  changedByUserId: string;
  changedByRole: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changeReason?: string;
  changedAt?: string;
}

@Injectable()
export class AlertConfigGatewayService {
  private readonly alertsServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.alertsServiceUrl =
      this.configService.getOrThrow<string>('ALERTS_SERVICE_URL');
  }

  // ============================================================================
  // Event Type Configuration
  // ============================================================================

  async getAllEventTypeConfigs(): Promise<EventTypeConfigDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/event-types`;
    return this.httpClient.get<EventTypeConfigDto[]>(url);
  }

  async getEventTypeConfig(eventType: string): Promise<EventTypeConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/event-types/${eventType}`;
    return this.httpClient.get<EventTypeConfigDto>(url);
  }

  async createEventTypeConfig(
    dto: Partial<EventTypeConfigDto>,
    actorUserId?: string,
  ): Promise<EventTypeConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/event-types`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.post<EventTypeConfigDto>(url, dto, { params });
  }

  async updateEventTypeConfig(
    eventType: string,
    dto: Partial<EventTypeConfigDto>,
    actorUserId?: string,
  ): Promise<EventTypeConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/event-types/${eventType}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.put<EventTypeConfigDto>(url, dto, { params });
  }

  async deleteEventTypeConfig(
    eventType: string,
    actorUserId?: string,
  ): Promise<void> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/event-types/${eventType}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.delete(url, { params });
  }

  // ============================================================================
  // Escalation Timing Configuration
  // ============================================================================

  async getAllEscalationConfigs(): Promise<EscalationConfigDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/escalation-timing`;
    return this.httpClient.get<EscalationConfigDto[]>(url);
  }

  async getEscalationConfig(tier: string): Promise<EscalationConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/escalation-timing/${tier}`;
    return this.httpClient.get<EscalationConfigDto>(url);
  }

  async createEscalationConfig(
    dto: Partial<EscalationConfigDto>,
    actorUserId?: string,
  ): Promise<EscalationConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/escalation-timing`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.post<EscalationConfigDto>(url, dto, { params });
  }

  async updateEscalationConfig(
    tier: string,
    dto: Partial<EscalationConfigDto>,
    actorUserId?: string,
  ): Promise<EscalationConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/escalation-timing/${tier}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.put<EscalationConfigDto>(url, dto, { params });
  }

  async deleteEscalationConfig(
    tier: string,
    actorUserId?: string,
  ): Promise<void> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/escalation-timing/${tier}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.delete(url, { params });
  }

  // ============================================================================
  // Escalation Chain Configuration
  // ============================================================================

  async getEscalationChain(): Promise<any[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/escalation-chain`;
    return this.httpClient.get<any[]>(url);
  }

  // ============================================================================
  // Notification Routing Configuration
  // ============================================================================

  async getAllNotificationRoutingConfigs(
    tier?: string,
    eventType?: string,
  ): Promise<NotificationRoutingConfigDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/notification-routing`;
    const params: any = {};
    if (tier) params.tier = tier;
    if (eventType) params.eventType = eventType;
    return this.httpClient.get<NotificationRoutingConfigDto[]>(url, { params });
  }

  async getNotificationRoutingConfig(
    id: string,
  ): Promise<NotificationRoutingConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/notification-routing/${id}`;
    return this.httpClient.get<NotificationRoutingConfigDto>(url);
  }

  async createNotificationRoutingConfig(
    dto: Partial<NotificationRoutingConfigDto>,
    actorUserId?: string,
  ): Promise<NotificationRoutingConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/notification-routing`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.post<NotificationRoutingConfigDto>(url, dto, {
      params,
    });
  }

  async updateNotificationRoutingConfig(
    id: string,
    dto: Partial<NotificationRoutingConfigDto>,
    actorUserId?: string,
  ): Promise<NotificationRoutingConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/notification-routing/${id}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.put<NotificationRoutingConfigDto>(url, dto, {
      params,
    });
  }

  async deleteNotificationRoutingConfig(
    id: string,
    actorUserId?: string,
  ): Promise<void> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/notification-routing/${id}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.delete(url, { params });
  }

  // ============================================================================
  // Workflow Configuration
  // ============================================================================

  async getAllWorkflowConfigs(
    tier?: string,
    status?: string,
  ): Promise<WorkflowConfigDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/workflow`;
    const params: any = {};
    if (tier) params.tier = tier;
    if (status) params.status = status;
    return this.httpClient.get<WorkflowConfigDto[]>(url, { params });
  }

  async getWorkflowConfig(id: string): Promise<WorkflowConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/workflow/${id}`;
    return this.httpClient.get<WorkflowConfigDto>(url);
  }

  async createWorkflowConfig(
    dto: Partial<WorkflowConfigDto>,
    actorUserId?: string,
  ): Promise<WorkflowConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/workflow`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.post<WorkflowConfigDto>(url, dto, { params });
  }

  async updateWorkflowConfig(
    id: string,
    dto: Partial<WorkflowConfigDto>,
    actorUserId?: string,
  ): Promise<WorkflowConfigDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/workflow/${id}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.put<WorkflowConfigDto>(url, dto, { params });
  }

  async deleteWorkflowConfig(id: string, actorUserId?: string): Promise<void> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/workflow/${id}`;
    const params = actorUserId ? { actorUserId } : undefined;
    return this.httpClient.delete(url, { params });
  }

  // ============================================================================
  // Change Requests
  // ============================================================================

  async getAllChangeRequests(
    status?: string,
    requestorId?: string,
  ): Promise<ChangeRequestDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/change-requests`;
    const params: any = {};
    if (status) params.status = status;
    if (requestorId) params.requestorId = requestorId;
    return this.httpClient.get<ChangeRequestDto[]>(url, { params });
  }

  async getChangeRequest(id: string): Promise<ChangeRequestDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/change-requests/${id}`;
    return this.httpClient.get<ChangeRequestDto>(url);
  }

  async createChangeRequest(
    dto: {
      configType: string;
      changeDescription: string;
      requestedConfig: Record<string, any>;
      justification?: string;
    },
    requestorId: string,
    requestorRole: string,
    requestorEmail?: string,
  ): Promise<ChangeRequestDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/change-requests`;
    const params: any = { requestorId, requestorRole };
    if (requestorEmail) params.requestorEmail = requestorEmail;
    return this.httpClient.post<ChangeRequestDto>(url, dto, { params });
  }

  async reviewChangeRequest(
    id: string,
    dto: { action: 'APPROVED' | 'REJECTED'; reviewNotes?: string },
    reviewerId: string,
  ): Promise<ChangeRequestDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/change-requests/${id}/review`;
    const params = { reviewerId };
    return this.httpClient.put<ChangeRequestDto>(url, dto, { params });
  }

  // ============================================================================
  // Audit Log
  // ============================================================================

  async getConfigAuditLog(
    configType?: string,
    configKey?: string,
    limit?: number,
  ): Promise<ConfigAuditLogDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/audit`;
    const params: any = {};
    if (configType) params.configType = configType;
    if (configKey) params.configKey = configKey;
    if (limit) params.limit = limit;
    return this.httpClient.get<ConfigAuditLogDto[]>(url, { params });
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  async invalidateCache(): Promise<void> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/cache/invalidate`;
    return this.httpClient.post(url, {});
  }

  async getCacheStatus(): Promise<any> {
    const url = `${this.alertsServiceUrl}/api/v1/alert-config/cache/status`;
    return this.httpClient.get<any>(url);
  }
}
