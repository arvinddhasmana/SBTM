import type { Alert, AlertAuditEntry } from '../../types';
import { apiClient } from './api-client';

export const alertsApi = {
  async getActiveAlerts(): Promise<Alert[]> {
    const response = await apiClient.get<Alert[]>('/api/v1/alerts/active');
    return response.data;
  },

  async getAllAlerts(): Promise<Alert[]> {
    const response = await apiClient.get<Alert[]>('/api/v1/alerts');
    return response.data;
  },

  async getAlertById(id: string): Promise<Alert | undefined> {
    const response = await apiClient.get<Alert>(`/api/v1/alerts/${id}`);
    return response.data;
  },

  async resolveAlert(id: string): Promise<Alert> {
    const response = await apiClient.patch<Alert>(`/api/v1/alerts/${id}/resolve`);
    return response.data;
  },

  /**
   * School Admin confirms a Tier 1 alert, triggering parent notifications.
   * actorUserId sourced from authenticated session — never from user-controlled input.
   */
  async confirmAlert(id: string, actorUserId?: string, actorRole?: string): Promise<Alert> {
    const response = await apiClient.patch<Alert>(`/api/v1/alerts/${id}/confirm`, {
      actorUserId,
      actorRole,
    });
    return response.data;
  },

  /**
   * School Admin marks a Tier 1 alert as a false alarm.
   */
  async falseAlarmAlert(
    id: string,
    notes?: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<Alert> {
    const response = await apiClient.patch<Alert>(`/api/v1/alerts/${id}/false-alarm`, {
      actorUserId,
      actorRole,
      notes,
    });
    return response.data;
  },

  /**
   * School Admin requests more information about a Tier 1 alert.
   */
  async requestInfoAlert(id: string, actorUserId?: string, actorRole?: string): Promise<Alert> {
    const response = await apiClient.patch<Alert>(`/api/v1/alerts/${id}/request-info`, {
      actorUserId,
      actorRole,
    });
    return response.data;
  },

  /**
   * Retrieve the full audit trail for a given alert.
   * Returns IDs and event metadata only — no T4 PII.
   */
  async getAlertAuditLog(id: string): Promise<AlertAuditEntry[]> {
    const response = await apiClient.get<AlertAuditEntry[]>(`/api/v1/alerts/audit/${id}`);
    return response.data;
  },
};
