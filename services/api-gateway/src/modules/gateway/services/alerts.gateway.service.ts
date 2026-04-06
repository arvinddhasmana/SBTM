import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

export interface AlertDto {
  id: string;
  routeId: string;
  vehicleId: string;
  timestamp: string;
  eventType: string;
  description?: string;
  status: 'ACTIVE' | 'RESOLVED';
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
    this.alertsServiceUrl = this.configService.get<string>(
      'ALERTS_SERVICE_URL',
      'http://localhost:3003',
    );
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

  async resolveAlert(id: string): Promise<AlertDto> {
    const url = `${this.alertsServiceUrl}/api/v1/alerts/${id}/resolve`;
    return this.httpClient.patch<AlertDto>(url, {});
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
}
