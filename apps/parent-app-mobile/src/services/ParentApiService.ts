import { ApiService } from './ApiService';
import { AuthService } from './AuthService';
import {
  Child,
  User,
  AuthResponse,
  BusLocationUpdate,
  Alert,
  NotificationPreferences,
  AbsenceReport,
  AbsenceReportResponse,
  Route,
} from '../types';

class ParentApiServiceClass {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await ApiService.post<AuthResponse>('/auth/login', {
      email,
      password,
    });

    // Store token and user data
    await AuthService.setToken(response.accessToken);
    await AuthService.setUser(response.user);

    return response;
  }

  /**
   * Get current parent's children.
   * The backend returns { id, name, schoolName, amRouteId, pmRouteId, amStopId, status, avatarUrl }.
   * We normalize to the Child shape the app expects.
   */
  async getChildren(): Promise<Child[]> {
    const raw = await ApiService.get<any[]>('/parent/children');
    if (!Array.isArray(raw)) return [];
    return raw.map((dto) => this.normalizeChild(dto));
  }

  private normalizeChild(dto: any): Child {
    const nameParts = String(dto.name ?? '')
      .trim()
      .split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    return {
      id: dto.id,
      studentId: dto.id,
      firstName,
      lastName,
      grade: '',
      schoolId: dto.schoolId ?? '',
      schoolName: dto.schoolName ?? '',
      amRouteId: dto.amRouteId ?? null,
      pmRouteId: dto.pmRouteId ?? null,
      status: dto.status ?? 'unknown',
      avatarUrl: dto.avatarUrl,
      stopId: dto.amStopId,
    };
  }

  /**
   * Get live location for a specific route.
   * Backend LiveLocationDto has position: { lat, lng } (nested) + etaToNextStopMinutes.
   * Normalize to flat BusLocationUpdate for the map screen.
   */
  async getLiveLocation(routeId: string): Promise<BusLocationUpdate | null> {
    try {
      const raw = await ApiService.get<any>(`/routes/${routeId}/live-location`);
      if (!raw || raw.active === false || !raw.position) return null;
      return {
        vehicleId: raw.vehicleId ?? '',
        routeId: raw.routeId ?? routeId,
        lat: raw.position.lat,
        lng: raw.position.lng,
        heading: raw.headingDeg ?? 0,
        speed: raw.speedKph ?? 0,
        accuracy: 0,
        timestamp: raw.lastUpdate ?? new Date().toISOString(),
        eta: raw.etaToNextStopMinutes != null ? raw.etaToNextStopMinutes * 60 : undefined,
      };
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw error;
    }
  }

  /**
   * Get route details (stops, polyline).
   * Backend returns stops with `address` (not `name`) and `location: "POINT(lng lat)"` string.
   * Normalize to Stop shape the map screen expects.
   */
  async getRouteDetails(routeId: string): Promise<Route> {
    const raw = await ApiService.get<any>(`/routes/${routeId}`);
    return {
      ...raw,
      stops: Array.isArray(raw.stops) ? raw.stops.map((s: any) => this.normalizeStop(s)) : [],
    };
  }

  private normalizeStop(s: any) {
    // Backend may return lat/lng directly (TypeORM entity) or as "POINT(lng lat)" string
    let lat: number = s.lat ?? 0;
    let lng: number = s.lng ?? 0;
    if (!s.lat && s.location && typeof s.location === 'string') {
      const m = s.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
      if (m) {
        lng = parseFloat(m[1]);
        lat = parseFloat(m[2]);
      }
    }
    return {
      id: s.id,
      name: s.name ?? s.stopName ?? s.address ?? '',
      sequence: s.sequence ?? s.sequenceOrder ?? 0,
      lat,
      lng,
      arrivalTime: s.arrivalTime,
      students: s.students,
    };
  }

  /**
   * Get active alerts for parent's routes.
   * Uses GET /alerts/parent-view/:routeId per route (PARENT role endpoint).
   */
  async getActiveAlerts(routeIds: string[]): Promise<Alert[]> {
    if (routeIds.length === 0) return [];
    const results = await Promise.allSettled(
      routeIds.map((id) => ApiService.get<Alert[]>(`/alerts/parent-view/${id}`)),
    );
    const alerts: Alert[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        alerts.push(...result.value);
      }
    }
    return alerts;
  }

  /**
   * Get alert history for this parent's routes.
   * Uses GET /alerts/parent-history (JWT carries childRouteIds).
   */
  async getAlertHistory(): Promise<Alert[]> {
    const raw = await ApiService.get<Alert[]>('/alerts/parent-history');
    return Array.isArray(raw) ? raw : [];
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return ApiService.get<NotificationPreferences>('/parent/notification-preferences');
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    preferences: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    return ApiService.put<NotificationPreferences>('/parent/notification-preferences', preferences);
  }

  /**
   * Report student absence
   */
  async reportAbsence(report: AbsenceReport): Promise<AbsenceReportResponse> {
    return ApiService.post<AbsenceReportResponse>('/parent/absence-reports', report);
  }

  /**
   * Register device token for push notifications (FCM)
   * Placeholder implementation until FCM is fully configured
   */
  async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      await ApiService.post('/parent/device-tokens', {
        token,
        platform,
      });
      console.log('Device token registered successfully');
    } catch (error) {
      console.warn('Device token registration failed (FCM not configured):', error);
      // Don't throw - this is expected until FCM is set up
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await ApiService.delete(`/parent/device-tokens/${token}`);
    } catch (error) {
      console.warn('Device token unregistration failed:', error);
    }
  }
}

export const ParentApiService = new ParentApiServiceClass();
