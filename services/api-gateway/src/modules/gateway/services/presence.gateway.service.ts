import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { schoolIdFromAnchor } from '../../auth/utils/anchor-scope';

@Injectable()
export class PresenceGatewayService {
  private readonly presenceServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.presenceServiceUrl = this.configService.getOrThrow<string>(
      'PRESENCE_SERVICE_URL',
    );
  }

  async getStats(user: AuthenticatedUser) {
    const schoolId = schoolIdFromAnchor(user);
    const url = `${this.presenceServiceUrl}/api/v1/presence/stats${schoolId ? `?schoolId=${schoolId}` : ''}`;
    return this.httpClient.get(url);
  }

  async getEvents(query: Record<string, unknown>, user: AuthenticatedUser) {
    const schoolId = schoolIdFromAnchor(user);
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      // Filter out null, undefined, AND empty strings to avoid 400 errors from backend enums
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    if (schoolId && !params.get('schoolId')) {
      params.append('schoolId', schoolId);
    }

    const url = `${this.presenceServiceUrl}/api/v1/presence/events?${params.toString()}`;
    return this.httpClient.get(url);
  }

  async processEvents(
    dto: { schoolId?: string } & Record<string, unknown>,
    user?: AuthenticatedUser,
  ) {
    const schoolId = schoolIdFromAnchor(user);
    if (schoolId && !dto.schoolId) {
      dto.schoolId = schoolId;
    }
    const url = `${this.presenceServiceUrl}/api/v1/presence-events`;
    return this.httpClient.post(url, dto);
  }

  async manualOverride(
    dto: { schoolId?: string } & Record<string, unknown>,
    user?: AuthenticatedUser,
  ) {
    const schoolId = schoolIdFromAnchor(user);
    if (schoolId && !dto.schoolId) {
      dto.schoolId = schoolId;
    }
    const url = `${this.presenceServiceUrl}/api/v1/student-presence-events/manual`;
    return this.httpClient.post(url, dto);
  }
}
