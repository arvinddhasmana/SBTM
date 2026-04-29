import type {
  EventTypeConfig,
  EscalationConfig,
  NotificationRoutingConfig,
  WorkflowConfig,
  ChangeRequest,
  ConfigAuditLog,
} from '../../types/alert-config';
import { apiClient } from './api-client';

export const alertConfigApi = {
  // ============================================================================
  // Event Type Configuration
  // ============================================================================

  async getAllEventTypeConfigs(): Promise<EventTypeConfig[]> {
    const response = await apiClient.get<EventTypeConfig[]>('/api/v1/alert-config/event-types');
    return response.data;
  },

  async getEventTypeConfig(eventType: string): Promise<EventTypeConfig> {
    const response = await apiClient.get<EventTypeConfig>(
      `/api/v1/alert-config/event-types/${eventType}`,
    );
    return response.data;
  },

  async createEventTypeConfig(dto: Partial<EventTypeConfig>): Promise<EventTypeConfig> {
    const response = await apiClient.post<EventTypeConfig>(
      '/api/v1/alert-config/event-types',
      dto,
    );
    return response.data;
  },

  async updateEventTypeConfig(
    eventType: string,
    dto: Partial<EventTypeConfig>,
  ): Promise<EventTypeConfig> {
    const response = await apiClient.put<EventTypeConfig>(
      `/api/v1/alert-config/event-types/${eventType}`,
      dto,
    );
    return response.data;
  },

  async deleteEventTypeConfig(eventType: string): Promise<void> {
    await apiClient.delete(`/api/v1/alert-config/event-types/${eventType}`);
  },

  // ============================================================================
  // Escalation Timing Configuration
  // ============================================================================

  async getAllEscalationConfigs(): Promise<EscalationConfig[]> {
    const response = await apiClient.get<EscalationConfig[]>(
      '/api/v1/alert-config/escalation-timing',
    );
    return response.data;
  },

  async getEscalationConfig(tier: string): Promise<EscalationConfig> {
    const response = await apiClient.get<EscalationConfig>(
      `/api/v1/alert-config/escalation-timing/${tier}`,
    );
    return response.data;
  },

  async createEscalationConfig(dto: Partial<EscalationConfig>): Promise<EscalationConfig> {
    const response = await apiClient.post<EscalationConfig>(
      '/api/v1/alert-config/escalation-timing',
      dto,
    );
    return response.data;
  },

  async updateEscalationConfig(
    tier: string,
    dto: Partial<EscalationConfig>,
  ): Promise<EscalationConfig> {
    const response = await apiClient.put<EscalationConfig>(
      `/api/v1/alert-config/escalation-timing/${tier}`,
      dto,
    );
    return response.data;
  },

  async deleteEscalationConfig(tier: string): Promise<void> {
    await apiClient.delete(`/api/v1/alert-config/escalation-timing/${tier}`);
  },

  // ============================================================================
  // Escalation Chain
  // ============================================================================

  async getEscalationChain(): Promise<any[]> {
    const response = await apiClient.get<any[]>('/api/v1/alert-config/escalation-chain');
    return response.data;
  },

  // ============================================================================
  // Notification Routing Configuration
  // ============================================================================

  async getAllNotificationRoutingConfigs(
    tier?: string,
    eventType?: string,
  ): Promise<NotificationRoutingConfig[]> {
    const params: any = {};
    if (tier) params.tier = tier;
    if (eventType) params.eventType = eventType;

    const response = await apiClient.get<NotificationRoutingConfig[]>(
      '/api/v1/alert-config/notification-routing',
      { params },
    );
    return response.data;
  },

  async getNotificationRoutingConfig(id: string): Promise<NotificationRoutingConfig> {
    const response = await apiClient.get<NotificationRoutingConfig>(
      `/api/v1/alert-config/notification-routing/${id}`,
    );
    return response.data;
  },

  async createNotificationRoutingConfig(
    dto: Partial<NotificationRoutingConfig>,
  ): Promise<NotificationRoutingConfig> {
    const response = await apiClient.post<NotificationRoutingConfig>(
      '/api/v1/alert-config/notification-routing',
      dto,
    );
    return response.data;
  },

  async updateNotificationRoutingConfig(
    id: string,
    dto: Partial<NotificationRoutingConfig>,
  ): Promise<NotificationRoutingConfig> {
    const response = await apiClient.put<NotificationRoutingConfig>(
      `/api/v1/alert-config/notification-routing/${id}`,
      dto,
    );
    return response.data;
  },

  async deleteNotificationRoutingConfig(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/alert-config/notification-routing/${id}`);
  },

  // ============================================================================
  // Workflow Configuration
  // ============================================================================

  async getAllWorkflowConfigs(tier?: string, status?: string): Promise<WorkflowConfig[]> {
    const params: any = {};
    if (tier) params.tier = tier;
    if (status) params.status = status;

    const response = await apiClient.get<WorkflowConfig[]>('/api/v1/alert-config/workflow', {
      params,
    });
    return response.data;
  },

  async getWorkflowConfig(id: string): Promise<WorkflowConfig> {
    const response = await apiClient.get<WorkflowConfig>(`/api/v1/alert-config/workflow/${id}`);
    return response.data;
  },

  async createWorkflowConfig(dto: Partial<WorkflowConfig>): Promise<WorkflowConfig> {
    const response = await apiClient.post<WorkflowConfig>('/api/v1/alert-config/workflow', dto);
    return response.data;
  },

  async updateWorkflowConfig(id: string, dto: Partial<WorkflowConfig>): Promise<WorkflowConfig> {
    const response = await apiClient.put<WorkflowConfig>(
      `/api/v1/alert-config/workflow/${id}`,
      dto,
    );
    return response.data;
  },

  async deleteWorkflowConfig(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/alert-config/workflow/${id}`);
  },

  // ============================================================================
  // Change Requests
  // ============================================================================

  async getAllChangeRequests(status?: string, requestorId?: string): Promise<ChangeRequest[]> {
    const params: any = {};
    if (status) params.status = status;
    if (requestorId) params.requestorId = requestorId;

    const response = await apiClient.get<ChangeRequest[]>(
      '/api/v1/alert-config/change-requests',
      { params },
    );
    return response.data;
  },

  async getChangeRequest(id: string): Promise<ChangeRequest> {
    const response = await apiClient.get<ChangeRequest>(
      `/api/v1/alert-config/change-requests/${id}`,
    );
    return response.data;
  },

  async createChangeRequest(dto: {
    configType: string;
    changeDescription: string;
    requestedConfig: Record<string, any>;
    justification?: string;
  }): Promise<ChangeRequest> {
    const response = await apiClient.post<ChangeRequest>(
      '/api/v1/alert-config/change-requests',
      dto,
    );
    return response.data;
  },

  async reviewChangeRequest(
    id: string,
    dto: { action: 'APPROVED' | 'REJECTED'; reviewNotes?: string },
  ): Promise<ChangeRequest> {
    const response = await apiClient.put<ChangeRequest>(
      `/api/v1/alert-config/change-requests/${id}/review`,
      dto,
    );
    return response.data;
  },

  // ============================================================================
  // Audit Log
  // ============================================================================

  async getConfigAuditLog(
    configType?: string,
    configKey?: string,
    limit?: number,
  ): Promise<ConfigAuditLog[]> {
    const params: any = {};
    if (configType) params.configType = configType;
    if (configKey) params.configKey = configKey;
    if (limit) params.limit = limit;

    const response = await apiClient.get<ConfigAuditLog[]>('/api/v1/alert-config/audit', {
      params,
    });
    return response.data;
  },

  // ============================================================================
  // Cache Management
  // ============================================================================

  async invalidateCache(): Promise<void> {
    await apiClient.post('/api/v1/alert-config/cache/invalidate', {});
  },

  async getCacheStatus(): Promise<any> {
    const response = await apiClient.get<any>('/api/v1/alert-config/cache/status');
    return response.data;
  },
};
