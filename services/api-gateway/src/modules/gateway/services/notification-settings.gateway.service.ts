import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';

export interface NotificationPreferenceDto {
  id?: string;
  eventType: string;
  channel: string;
  enabled: boolean;
}

export interface UpdatePreferencesPayload {
  userId: string;
  schoolId: string;
  preferences: NotificationPreferenceDto[];
}

export interface RegisterDeviceTokenPayload {
  /**
   * v2-followups #6: defaults to 'user' (admin/driver). Parent-app flows
   * must pass 'guardian' so notification-service keys off stx_guardians.id.
   */
  recipientKind?: 'user' | 'guardian';
  recipientId: string;
  schoolId: string;
  token: string;
  platform: string;
}

@Injectable()
export class NotificationSettingsGatewayService {
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl = this.configService.getOrThrow<string>(
      'NOTIFICATION_SERVICE_URL',
    );
  }

  async getPreferences(
    userId: string,
    schoolId: string,
  ): Promise<NotificationPreferenceDto[]> {
    const url = `${this.notificationServiceUrl}/api/v1/notification-preferences`;
    return this.httpClient.get<NotificationPreferenceDto[]>(url, {
      params: { userId, schoolId },
    });
  }

  async updatePreferences(
    payload: UpdatePreferencesPayload,
  ): Promise<NotificationPreferenceDto[]> {
    const url = `${this.notificationServiceUrl}/api/v1/notification-preferences`;
    return this.httpClient.put<NotificationPreferenceDto[]>(url, payload);
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
    schoolId: string,
    recipientKind: 'user' | 'guardian' = 'user',
  ): Promise<any[]> {
    const url = `${this.notificationServiceUrl}/api/v1/device-tokens`;
    return this.httpClient.get(url, {
      params: { recipientId, schoolId, recipientKind },
    });
  }

  async getDeliveryLog(userId: string, schoolId: string): Promise<any[]> {
    const url = `${this.notificationServiceUrl}/api/v1/delivery-log`;
    return this.httpClient.get(url, {
      params: { userId, schoolId },
    });
  }
}
