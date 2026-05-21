import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HttpClientService } from '../../../common/utils/http-client.service';

export interface RegisterDeviceTokenPayload {
  /**
   * v2-followups #6: defaults to 'user' (admin/driver). Parent-app flows
   * must pass 'guardian' so notification-service keys off stx_guardians.id.
   */
  recipientKind?: 'user' | 'guardian';
  recipientId: string;
  token: string;
  platform: string;
}

export interface NotificationPreference {
  eventType: string;
  channel: string;
  enabled: boolean;
}

@Injectable()
export class NotificationSettingsGatewayService {
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.notificationServiceUrl = this.configService.getOrThrow<string>(
      'NOTIFICATION_SERVICE_URL',
    );
  }

  async registerDeviceToken(payload: RegisterDeviceTokenPayload): Promise<any> {
    const url = `${this.notificationServiceUrl}/api/v1/device-tokens`;
    return this.httpClient.post(url, payload);
  }

  async deactivateDeviceToken(
    tokenId: string,
    recipientId: string,
    recipientKind: 'user' | 'guardian' = 'user',
  ): Promise<any> {
    const params = new URLSearchParams({ recipientId, recipientKind });
    const url = `${this.notificationServiceUrl}/api/v1/device-tokens/${tokenId}?${params.toString()}`;
    return this.httpClient.delete(url);
  }

  async getDeviceTokens(
    recipientId: string,
    recipientKind: 'user' | 'guardian' = 'user',
  ): Promise<any[]> {
    const url = `${this.notificationServiceUrl}/api/v1/device-tokens`;
    return this.httpClient.get(url, {
      params: { recipientId, recipientKind },
    });
  }

  async getDeliveryLog(userId: string): Promise<any[]> {
    const url = `${this.notificationServiceUrl}/api/v1/delivery-log`;
    return this.httpClient.get(url, {
      params: { userId },
    });
  }

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreference[]> {
    const rows = await this.dataSource.query<Array<{ value: string }>>(
      `SELECT value FROM system_settings WHERE key = $1`,
      [`notification_prefs:${userId}`],
    );
    if (!rows.length) return [];
    try {
      return JSON.parse(rows[0].value) as NotificationPreference[];
    } catch {
      return [];
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreference[],
  ): Promise<void> {
    const key = `notification_prefs:${userId}`;
    const value = JSON.stringify(preferences);
    await this.dataSource.query(
      `INSERT INTO system_settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = now()`,
      [key, value, userId],
    );
  }
}
