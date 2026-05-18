import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
}
