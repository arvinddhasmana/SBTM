/**
 * SystemSettingsGatewayService
 *
 * Proxies system-settings and GPS device token management requests
 * from the API Gateway to the GPS Tracking microservice.
 *
 * All calls use the internal service JWT (injected by HttpClientService).
 * The Super Admin's user ID is passed as `updatedBy` for audit trail purposes.
 * No PII is transmitted — only IDs, source enum values, and vehicleId strings.
 *
 * Classification: T2 — operational configuration, no student PII.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

export type GpsTrackingSource = 'DRIVER_APP' | 'DEDICATED_GPS';

export interface GpsDeviceTokenDto {
  id: string;
  vehicleId: string;
  schoolId: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  maskedToken: string;
}

export interface CreateDeviceTokenDto {
  vehicleId: string;
  schoolId: string;
  description?: string;
}

export interface CreatedDeviceTokenDto extends GpsDeviceTokenDto {
  /** Raw token — returned only once at creation time. */
  token: string;
}

@Injectable()
export class SystemSettingsGatewayService {
  private readonly gpsServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.gpsServiceUrl = this.configService.get<string>(
      'GPS_SERVICE_URL',
      'http://localhost:3002',
    );
  }

  /** Returns the current GPS tracking source. */
  async getGpsSource(): Promise<{ source: GpsTrackingSource }> {
    const url = `${this.gpsServiceUrl}/api/v1/system-settings/gps-source`;
    return this.httpClient.get<{ source: GpsTrackingSource }>(url);
  }

  /**
   * Updates the GPS tracking source.
   * updatedBy must be the Super Admin's user ID (never a name or email).
   */
  async setGpsSource(
    source: GpsTrackingSource,
    updatedBy: string,
  ): Promise<{ source: GpsTrackingSource }> {
    const url = `${this.gpsServiceUrl}/api/v1/system-settings/gps-source`;
    return this.httpClient.put<{ source: GpsTrackingSource }>(url, {
      source,
      updatedBy,
    });
  }

  /**
   * Creates a new GPS device token.
   * schoolId is derived from the API call — the GPS service stores it in the token record.
   */
  async createDeviceToken(
    dto: CreateDeviceTokenDto,
  ): Promise<CreatedDeviceTokenDto> {
    const url = `${this.gpsServiceUrl}/api/v1/device-tokens`;
    return this.httpClient.post<CreatedDeviceTokenDto>(url, dto);
  }

  /**
   * Lists all GPS device tokens for a given school. Token values are masked.
   */
  async listDeviceTokens(schoolId: string): Promise<GpsDeviceTokenDto[]> {
    const url = `${this.gpsServiceUrl}/api/v1/device-tokens?schoolId=${encodeURIComponent(schoolId)}`;
    return this.httpClient.get<GpsDeviceTokenDto[]>(url);
  }

  /**
   * Hard-deletes a GPS device token by ID.
   */
  async deleteDeviceToken(id: string): Promise<void> {
    const url = `${this.gpsServiceUrl}/api/v1/device-tokens/${encodeURIComponent(id)}`;
    await this.httpClient.delete<void>(url);
  }

  /**
   * Forwards a dedicated GPS device location payload to the GPS service.
   * The device Bearer token is forwarded as-is — the GPS service performs
   * token validation, GPS source check, and route resolution.
   */
  async ingestDeviceLocation(
    payload: {
      timestamp: string;
      lat: number;
      lng: number;
      speedKph?: number;
      headingDeg?: number;
      accuracyMeters?: number;
    },
    deviceBearerToken: string,
  ): Promise<{ status: string }> {
    const url = `${this.gpsServiceUrl}/api/v1/device-locations`;
    // Override the Authorization header with the device token (not the service JWT)
    return this.httpClient.post<{ status: string }>(url, payload, {
      headers: { Authorization: `Bearer ${deviceBearerToken}` },
    });
  }
}
