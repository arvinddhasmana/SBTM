import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { RlsContextService } from '../../../common/services/rls-context.service';

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

export interface CreateEmergencyEventDto {
  vehicleId: string;
  routeId: string;
  driverId: string;
  schoolId: string;
  timestamp: string;
  lat: number;
  lng: number;
  eventType: string;
  description?: string;
}

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

  async getAllAlerts(schoolId?: string): Promise<AlertDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts`;
    const params = schoolId ? { schoolId } : undefined;
    return this.httpClient.get<AlertDto[]>(url, { params });
  }

  async getActiveAlerts(schoolId?: string): Promise<AlertDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/active`;
    const params = schoolId ? { schoolId } : undefined;
    return this.httpClient.get<AlertDto[]>(url, { params });
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
    return this.httpClient.patch<AlertDto>(url, body);
  }

  async getAlertsForRoute(routeId: string): Promise<any> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/parent-view/${routeId}`;
    return this.httpClient.get<any>(url);
  }

  async getAlertById(id: string): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}`;
    return this.httpClient.get<AlertDto>(url);
  }

  async createEmergencyEvent(
    dto: CreateEmergencyEventDto,
  ): Promise<{ alertId: string; status: string }> {
    const url = `${this.alertsServiceUrl}/api/v1/emergency-events`;
    return this.httpClient.post<{ alertId: string; status: string }>(url, dto);
  }

  async getAlertsByRoutes(routeIds: string[]): Promise<AlertDto[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/by-routes`;
    return this.httpClient.get<AlertDto[]>(url, {
      params: { routeIds: routeIds.join(',') },
    });
  }

  async confirmAlert(
    id: string,
    body: { actorUserId?: string; actorRole?: string },
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/confirm`;
    return this.httpClient.patch<AlertDto>(url, body);
  }

  async falseAlarmAlert(
    id: string,
    body: { actorUserId?: string; actorRole?: string; notes?: string },
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/false-alarm`;
    return this.httpClient.patch<AlertDto>(url, body);
  }

  async requestInfoAlert(
    id: string,
    body: { actorUserId?: string; actorRole?: string },
  ): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/request-info`;
    return this.httpClient.patch<AlertDto>(url, body);
  }

  async addStatusUpdate(
    id: string,
    body: { notes: string; actorUserId?: string; actorRole?: string },
  ): Promise<any> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/status-update`;
    return this.httpClient.patch<any>(url, body);
  }

  async getAuditTrail(alertId: string): Promise<any[]> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/audit/${alertId}`;
    return this.httpClient.get<any[]>(url);
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
}
