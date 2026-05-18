import { ApiService } from './ApiService';
import { AuthService } from './AuthService';
import {
  Child,
  User,
  AuthResponse,
  BusLocationUpdate,
  Alert,
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
      amRouteName: dto.amRouteName,
      pmRouteName: dto.pmRouteName,
      status: dto.status ?? 'unknown',
      avatarUrl: dto.avatarUrl,
      stopId: dto.amStopId ?? dto.stopId,
      amStopId: dto.amStopId,
      pmStopId: dto.pmStopId,
      stopName: dto.stopName,
      vehicleId: dto.vehicleId,
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
   * Get route details (stops, path).
   * Hits GET /routes/reference/:routeId which returns the v2 shape as
   * `path: [number, number][]` (lat/lon pairs). Path is mapped explicitly
   * to prevent silent fallback to stop-coordinate interpolation in MapScreen.
   */
  async getRouteDetails(routeId: string): Promise<Route> {
    const raw = await ApiService.get<any>(`/routes/reference/${routeId}`);
    return {
      ...raw,
      path: Array.isArray(raw.path) ? (raw.path as [number, number][]) : [],
      schoolName: raw.schoolName,
      schoolLat:
        typeof raw.schoolLat === 'number'
          ? raw.schoolLat
          : raw.schoolLat != null
            ? Number(raw.schoolLat)
            : undefined,
      schoolLng:
        typeof raw.schoolLng === 'number'
          ? raw.schoolLng
          : raw.schoolLng != null
            ? Number(raw.schoolLng)
            : undefined,
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
   *
   * NOTE: This endpoint returns a single `RouteAlertView` object per route
   * (not an array), shaped as `{ alertActive: boolean, routeId, message,
   * id?, vehicleId?, eventType?, status?, lat?, lng?, createdAt?, ... }`.
   * The web parent portal handles this by checking `alertActive` and
   * unwrapping to a flat alert object — we mirror that behavior here so
   * the mobile dashboard / map can highlight bus + child cards on Android.
   */
  async getActiveAlerts(routeIds: string[]): Promise<Alert[]> {
    if (routeIds.length === 0) return [];
    const results = await Promise.allSettled(
      routeIds.map((id) =>
        ApiService.get<any>(`/alerts/parent-view/${id}`).then((raw) => ({
          raw,
          requestedRouteId: id,
        })),
      ),
    );
    const alerts: Alert[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value?.raw) continue;
      const raw = result.value.raw;
      const requestedRouteId = result.value.requestedRouteId;
      // Backend may return either a single RouteAlertView object (current
      // contract) or, defensively, an array of alerts. Handle both.
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        if (!item || item.alertActive === false) continue;
        // Normalize RouteAlertView → Alert. Field IDs are kept for testIDs
        // and downstream filters (child route matching, map marker color).
        alerts.push({
          id: item.id ?? `route-${requestedRouteId}-${Date.now()}`,
          eventType: item.eventType ?? 'OTHER',
          vehicleId: item.vehicleId ?? '',
          routeId: item.routeId ?? requestedRouteId,
          driverId: item.driverId ?? '',
          status: item.status ?? 'ACTIVE',
          severity: item.severity ?? 'WARNING',
          description: item.description ?? item.message ?? '',
          lat: typeof item.lat === 'number' ? item.lat : undefined,
          lng: typeof item.lng === 'number' ? item.lng : undefined,
          timestamp: item.createdAt ?? item.timestamp ?? new Date().toISOString(),
          resolvedAt: item.resolvedAt,
          resolvedBy: item.resolvedBy,
          metadata: item.metadata,
        });
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
   * Get audit trail (timeline of events) for a specific alert.
   * Endpoint: GET /alerts/:id/audit-trail
   */
  async getAlertAuditTrail(alertId: string): Promise<import('../types').AlertAuditEntry[]> {
    try {
      const raw = await ApiService.get<any[]>(`/alerts/${alertId}/audit-trail`);
      if (!Array.isArray(raw)) return [];
      return raw.map((e) => ({
        id: String(e.id ?? `${alertId}-${e.eventTimestamp ?? e.createdAt ?? Math.random()}`),
        alertId: e.alertId ?? alertId,
        eventType: e.eventType ?? e.action ?? 'EVENT',
        eventTimestamp: e.eventTimestamp ?? e.createdAt ?? new Date().toISOString(),
        actorRole: e.actorRole ?? e.actor?.role,
        actorName: e.actorName ?? e.actor?.name,
        notes: e.notes ?? e.note ?? e.description,
        metadata: e.metadata,
      }));
    } catch (error) {
      console.warn('Failed to load audit trail:', error);
      return [];
    }
  }

  /**
   * Report student absence
   */
  async reportAbsence(report: AbsenceReport): Promise<AbsenceReportResponse> {
    return ApiService.post<AbsenceReportResponse>('/absences', report);
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
