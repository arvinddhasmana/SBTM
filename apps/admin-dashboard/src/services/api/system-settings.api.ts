/**
 * System Settings API Client
 *
 * Provides typed access to the GPS tracking source and device token management
 * endpoints in the API gateway. All calls require SUPER_ADMIN authentication
 * (enforced on the backend; the admin dashboard enforces role guard on the route).
 *
 * Classification: T2 — operational configuration, no student PII.
 */
import { apiClient } from './api-client';

export type GpsTrackingSource = 'DRIVER_APP' | 'DEDICATED_GPS';

export interface GpsDeviceToken {
  id: string;
  vehicleId: string;
  schoolId: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  /** Last 8 characters of the token — full value is never returned after creation. */
  maskedToken: string;
}

export interface CreatedGpsDeviceToken extends GpsDeviceToken {
  /** Raw token — returned once only at creation time. Store it securely. */
  token: string;
}

export interface CreateDeviceTokenDto {
  vehicleId: string;
  schoolId: string;
  description?: string;
}

export const systemSettingsApi = {
  /**
   * Returns the current GPS tracking source.
   */
  async getGpsSource(): Promise<{ source: GpsTrackingSource }> {
    const response = await apiClient.get<{ source: GpsTrackingSource }>(
      '/api/v1/system-settings/gps-source',
    );
    return response.data;
  },

  /**
   * Switches the GPS tracking source.
   * Confirmation should be obtained from the user before calling this.
   */
  async setGpsSource(source: GpsTrackingSource): Promise<{ source: GpsTrackingSource }> {
    const response = await apiClient.put<{ source: GpsTrackingSource }>(
      '/api/v1/system-settings/gps-source',
      { source },
    );
    return response.data;
  },

  /**
   * Lists GPS device tokens for a school. Token values are masked.
   */
  async listDeviceTokens(schoolId: string): Promise<GpsDeviceToken[]> {
    const response = await apiClient.get<GpsDeviceToken[]>(
      '/api/v1/system-settings/gps-device-tokens',
      { params: { schoolId } },
    );
    return response.data;
  },

  /**
   * Creates a new GPS device token.
   * The full token value is returned once in the response — display it to the user.
   */
  async createDeviceToken(dto: CreateDeviceTokenDto): Promise<CreatedGpsDeviceToken> {
    const response = await apiClient.post<CreatedGpsDeviceToken>(
      '/api/v1/system-settings/gps-device-tokens',
      dto,
    );
    return response.data;
  },

  /**
   * Hard-deletes a GPS device token. The token is immediately invalidated.
   */
  async deleteDeviceToken(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/system-settings/gps-device-tokens/${id}`);
  },
};
