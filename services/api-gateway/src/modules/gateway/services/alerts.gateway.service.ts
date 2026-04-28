import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

export interface AlertDto {
  id: string;
  schoolId?: string;
  routeId: string;
  vehicleId: string;
  timestamp: string;
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
  escalationLevel?: 'SCHOOL' | 'BOARD' | 'OSTA';
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
}
