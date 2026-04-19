import axios from 'axios';
import type { Child, NotificationPreference } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export interface AuthLoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface LiveLocationResponse {
  /** false when the gateway has no active GPS location for this route (bus not yet running). */
  active?: boolean;
  routeId: string;
  vehicleId: string;
  lastUpdate: string;
  position: { lat: number; lng: number };
  etaToNextStopMinutes?: number;
  deviationFlag?: boolean;
  status?: 'normal' | 'delay' | 'emergency';
}

export interface ActiveAlert {
  id: string;
  routeId: string;
  vehicleId: string;
  eventType: string;
  description?: string;
  message: string;
  status?: 'ACTIVE' | 'RESOLVED';
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface AlertHistoryRecord {
  id: string;
  schoolId: string;
  vehicleId: string;
  routeId: string;
  driverId: string;
  timestamp: string;
  lat: number;
  lng: number;
  eventType: string;
  description?: string;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  alertId: string;
  recipientUserId: string;
  channel: string;
  status: 'SENT' | 'FAILED';
  timestamp: string;
}

export interface AlertAuditEntry {
  id: string;
  alertId: string;
  eventType: string;
  actorUserId: string | null;
  actorRole: string | null;
  notes: string | null;
  escalationLevel: string | null;
  eventTimestamp: string;
}

export interface AbsenceReportPayload {
  studentId: string;
  tripDate: string;
  routeType: 'AM' | 'PM' | 'BOTH';
  notes?: string;
}

export interface AbsenceRecord {
  id: string;
  studentId: string;
  guardianUserId: string;
  schoolId: string;
  tripDate: string;
  routeType: 'AM' | 'PM' | 'BOTH';
  notes?: string;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  sequence: number;
  address: string;
  location?: string; // WKT "POINT(lng lat)"
  lat?: number;
  lng?: number;
}

export interface RouteDetails {
  id: string;
  name: string;
  direction: string;
  vehicleId?: string;
  polyline?: string;
  stops: RouteStop[];
  schoolLat?: number;
  schoolLng?: number;
  schoolName?: string;
}

export const parentApi = {
  async login(email: string, password: string): Promise<AuthLoginResponse> {
    const response = await apiClient.post<AuthLoginResponse>('/api/v1/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout');
  },

  async getChildren(): Promise<Child[]> {
    const response = await apiClient.get<Child[]>('/api/v1/parent/children');
    return response.data;
  },

  async getLiveLocation(routeId: string): Promise<LiveLocationResponse> {
    const response = await apiClient.get<LiveLocationResponse>(
      `/api/v1/routes/${routeId}/live-location`,
    );
    return response.data;
  },

  async getActiveAlert(routeId: string): Promise<ActiveAlert | null> {
    const response = await apiClient.get<
      { alertActive: boolean; message: string } & Partial<ActiveAlert>
    >(`/api/v1/alerts/parent-view/${routeId}`);
    if (!response.data.alertActive) return null;
    return response.data as ActiveAlert;
  },

  async getAlertHistory(): Promise<AlertHistoryRecord[]> {
    const response = await apiClient.get<AlertHistoryRecord[]>('/api/v1/alerts/parent-history');
    return response.data;
  },

  async getAlertAuditTrail(alertId: string): Promise<AlertAuditEntry[]> {
    const response = await apiClient.get<AlertAuditEntry[]>(
      `/api/v1/alerts/${alertId}/audit-trail`,
    );
    return response.data;
  },

  async getNotifications(): Promise<NotificationRecord[]> {
    const response = await apiClient.get<NotificationRecord[]>('/api/v1/parent/notifications');
    return response.data;
  },

  async reportAbsence(payload: AbsenceReportPayload): Promise<AbsenceRecord> {
    const response = await apiClient.post<AbsenceRecord>('/api/v1/absences', payload);
    return response.data;
  },

  async cancelAbsence(absenceId: string): Promise<void> {
    await apiClient.delete(`/api/v1/absences/${absenceId}`);
  },

  async getNotificationPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get<NotificationPreference[]>(
      '/api/v1/notification-preferences',
    );
    return response.data;
  },

  async updateNotificationPreferences(prefs: NotificationPreference[]): Promise<void> {
    await apiClient.put('/api/v1/notification-preferences', { preferences: prefs });
  },

  async registerDeviceToken(token: string, platform: string): Promise<void> {
    await apiClient.post('/api/v1/device-tokens', { token, platform });
  },

  async getRouteDetails(routeId: string): Promise<RouteDetails> {
    const response = await apiClient.get<RouteDetails>(`/api/v1/routes/reference/${routeId}`);
    return response.data;
  },

  /**
   * Validates the current browser session against the API gateway.
   * Returns the server-side user profile including role, or null if the session
   * is invalid (401/403) or the network is unavailable.
   * Used by AuthContext on startup to detect a stale/mismatched session.
   */
  async getMe(): Promise<{ id: string; email: string; role: string } | null> {
    try {
      const response = await apiClient.get<{ id: string; email: string; role: string }>(
        '/api/v1/auth/me',
      );
      return response.data;
    } catch {
      return null;
    }
  },
};
