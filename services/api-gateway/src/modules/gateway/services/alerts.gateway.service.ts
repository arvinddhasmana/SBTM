import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { RlsContextService } from '../../../common/services/rls-context.service';

// ---------------------------------------------------------------------------
// DTOs — wire shape sent to the admin / parent dashboard (v1 legacy format).
// The emergency-alerts service now uses a refactored v2 schema; the mapping
// functions below translate v2 → v1 so all existing frontend code keeps working.
// ---------------------------------------------------------------------------

export interface AlertDto {
  id: string;
  schoolId?: string;
  routeId: string;
  vehicleId: string;
  timestamp: string;
  createdAt?: string;
  eventType: string;
  description?: string;
  status:
    | 'ACTIVE'
    | 'RESOLVED'
    | 'PENDING_CONFIRMATION'
    | 'CONFIRMED'
    | 'AUTO_ESCALATED'
    | 'FALSE_ALARM';
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3';
  confirmedBy?: string;
  confirmedAt?: string;
  escalationLevel?: 'SCHOOL' | 'BOARD' | 'STA';
}

export interface AlertAuditDto {
  id: string;
  alertId: string;
  eventType: string;
  actorUserId: string | null;
  actorRole: string | null;
  notes: string | null;
  escalationLevel: string | null;
  eventTimestamp: string;
}

export interface CreateEmergencyEventDto {
  vehicleId: string;
  routeId: string;
  driverId: string;
  schoolId: string;
  staId?: string;
  timestamp: string;
  lat: number;
  lng: number;
  eventType: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// v2 → v1 mapping constants
// ---------------------------------------------------------------------------

const CATEGORY_TO_EVENT_TYPE: Record<string, string> = {
  safety: 'PANIC_BUTTON',
  route_deviation: 'ROUTE_DEVIATION',
  route_cancelled: 'ROUTE_DIVERSION',
  route_delayed: 'LATE_ARRIVAL',
  weather: 'OTHER',
  general: 'OTHER',
};

const SEVERITY_TO_TIER: Record<string, 'TIER_1' | 'TIER_2' | 'TIER_3'> = {
  critical: 'TIER_1',
  warning: 'TIER_2',
  info: 'TIER_3',
};

const STATUS_MAP: Record<string, AlertDto['status']> = {
  active: 'ACTIVE',
  resolved: 'RESOLVED',
  draft: 'PENDING_CONFIRMATION',
  cancelled: 'FALSE_ALARM',
  expired: 'RESOLVED',
};

const ACTION_TO_EVENT_TYPE: Record<string, string> = {
  created: 'CREATED',
  resolved: 'RESOLVED',
  confirmed: 'CONFIRMED',
  cancelled: 'FALSE_ALARM',
  info_requested: 'INFO_REQUESTED',
  status_update: 'STATUS_UPDATE',
};

@Injectable()
export class AlertsGatewayService {
  private readonly alertsServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly rlsContext: RlsContextService,
  ) {
    this.alertsServiceUrl =
      this.configService.getOrThrow<string>('ALERTS_SERVICE_URL');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async getAllAlerts(schoolId?: string): Promise<AlertDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts`;
    const params = schoolId ? { schoolId } : undefined;
    const raw = await this.httpClient.get<any[]>(url, { params });
    return raw.map((a) => this.mapToAlertDto(a));
  }

  async getActiveAlerts(schoolId?: string): Promise<AlertDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/active`;
    const params = schoolId ? { schoolId } : undefined;
    const raw = await this.httpClient.get<any[]>(url, { params });
    return raw.map((a) => this.mapToAlertDto(a));
  }

  async resolveAlert(
    id: string,
    body: {
      notes?: string;
      actorUserId?: string;
      actorRole?: string;
    } = {},
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/resolve`;
    const raw = await this.httpClient.patch<any>(url, body);
    return this.mapToAlertDto(raw);
  }

  async getAlertsForRoute(routeId: string): Promise<any> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/parent-view/${routeId}`;
    const raw = await this.httpClient.get<any>(url);
    if (!raw || !raw.alertActive) {
      return { alertActive: false, message: 'No active alert' };
    }
    return {
      ...this.mapToAlertDto(raw),
      alertActive: true,
      message: raw.message ?? raw.title ?? raw.body ?? '',
      routeName: raw.routeName,
    };
  }

  async getAlertById(id: string): Promise<AlertDto> {
    const raw = await this.getRawAlertById(id);
    return this.mapToAlertDto(raw);
  }

  async getRawAlertById(id: string): Promise<any> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}`;
    return this.httpClient.get<any>(url);
  }

  async createEmergencyEvent(
    dto: CreateEmergencyEventDto,
  ): Promise<{ alertId: string; status: string }> {
    const url = `${this.alertsServiceUrl}/api/v1/emergency-events`;
    return this.httpClient.post<{ alertId: string; status: string }>(url, dto);
  }

  async getAlertsByRoutes(routeIds: string[]): Promise<AlertDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/by-routes`;
    const raw = await this.httpClient.get<any[]>(url, {
      params: { routeIds: routeIds.join(',') },
    });
    return raw.map((a) => this.mapToAlertDto(a));
  }

  async confirmAlert(
    id: string,
    body: { actorUserId?: string; actorRole?: string },
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/confirm`;
    const raw = await this.httpClient.patch<any>(url, body);
    return this.mapToAlertDto(raw);
  }

  async falseAlarmAlert(
    id: string,
    body: { actorUserId?: string; actorRole?: string; notes?: string },
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/false-alarm`;
    const raw = await this.httpClient.patch<any>(url, body);
    return this.mapToAlertDto(raw);
  }

  async requestInfoAlert(
    id: string,
    body: { actorUserId?: string; actorRole?: string },
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/request-info`;
    const raw = await this.httpClient.patch<any>(url, body);
    return this.mapToAlertDto(raw);
  }

  async addStatusUpdate(
    id: string,
    body: { notes: string; actorUserId?: string; actorRole?: string },
  ): Promise<any> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/status-update`;
    return this.httpClient.patch<any>(url, body);
  }

  async getAuditTrail(alertId: string): Promise<AlertAuditDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/audit/${alertId}`;
    const raw = await this.httpClient.get<any[]>(url);
    return raw.map((e) => this.mapToAuditDto(e));
  }

  /**
   * Resolve the GTFS `route_id`s that a parent's children are currently
   * riding, then proxy the alert lookup to the alerts service.
   *
   * v1 cached `childRouteIds` on the JWT. v2 derives the list server-side:
   *   guardian → stx_student_guardians → stx_students → stx_ridership
   *           → trips.route_id  (active ridership only, today's date)
   *
   * Returns an empty array (not 404) when the guardian has no active
   * ridership — keeps the parent dashboard rendering cleanly.
   */
  async getParentAlertHistory(guardianId: string): Promise<AlertDto[]> {
    const today = new Date().toISOString().slice(0, 10);
    const routeIds = await this.rlsContext.runAsCurrent(async (tx) => {
      const rows = (await tx.query(
        `
        SELECT DISTINCT t.route_id AS route_id
        FROM stx_student_guardians sg
        JOIN stx_ridership rd  ON rd.student_id = sg.student_id
        JOIN trips t           ON t.trip_id = rd.trip_id
        WHERE sg.guardian_id    = $1
          AND rd.status         = 'active'
          AND rd.effective_from <= $2::date
          AND (rd.effective_to IS NULL OR rd.effective_to >= $2::date)
        `,
        [guardianId, today],
      )) as Array<{ route_id: string }>;
      return rows.map((r) => r.route_id);
    });
    if (routeIds.length === 0) return [];
    return this.getAlertsByRoutes(routeIds);
  }

  // ─── Private mapping helpers ────────────────────────────────────────────────

  private mapToAlertDto(raw: any): AlertDto {
    if (!raw) return raw;
    return {
      id: raw.id,
      // staId serves as the scoping identifier; schoolId is kept for ownership
      // checks in the controller (SCHOOL_ADMIN/BOARD_ADMIN paths).
      schoolId: raw.staId,
      routeId:
        raw.scopeKind === 'route' ? (raw.scopeRef ?? '') : (raw.scopeRef ?? ''),
      vehicleId: raw.vehicleId ?? '',
      timestamp: raw.startsAt ?? raw.createdAt,
      createdAt: raw.createdAt,
      eventType: CATEGORY_TO_EVENT_TYPE[raw.category] ?? 'OTHER',
      description: raw.body ?? raw.title,
      status: STATUS_MAP[raw.status] ?? 'ACTIVE',
      tier: SEVERITY_TO_TIER[raw.severity],
      confirmedBy: undefined,
      confirmedAt: undefined,
      escalationLevel: undefined,
    };
  }

  private mapToAuditDto(raw: any): AlertAuditDto {
    if (!raw) return raw;
    const action: string = raw.action ?? '';
    return {
      id: raw.id,
      alertId: raw.alertId,
      eventType:
        ACTION_TO_EVENT_TYPE[action] ?? action.toUpperCase().replace(/-/g, '_'),
      actorUserId: raw.actorUserId ?? null,
      actorRole: raw.payload?.actorRole ?? null,
      notes: raw.payload?.notes ?? null,
      escalationLevel: null,
      eventTimestamp: raw.createdAt,
    };
  }
}
