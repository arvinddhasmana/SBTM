import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '../../../common/decorators/roles.decorator';

@Injectable()
export class PresenceGatewayService {
    private readonly presenceServiceUrl: string;

    constructor(
        private readonly httpClient: HttpClientService,
        private readonly configService: ConfigService,
    ) {
        this.presenceServiceUrl = this.configService.get<string>(
            'PRESENCE_SERVICE_URL',
            'http://localhost:3004',
        );
    }

    async getStats(user: any) {
        const schoolId = user.schoolId;
        const url = `${this.presenceServiceUrl}/api/v1/presence/stats${schoolId ? `?schoolId=${schoolId}` : ''}`;
        return this.httpClient.get(url);
    }

    async getEvents(query: any, user: any) {
        const schoolId = user.schoolId;
        const params = new URLSearchParams();

        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, String(value));
            }
        });

        if (schoolId && !params.get('schoolId')) {
            params.append('schoolId', schoolId);
        }

        const url = `${this.presenceServiceUrl}/api/v1/presence/events?${params.toString()}`;
        return this.httpClient.get(url);
    }

    async processEvents(dto: any) {
        const url = `${this.presenceServiceUrl}/api/v1/presence-events`;
        return this.httpClient.post(url, dto);
    }

    async manualOverride(dto: any) {
        const url = `${this.presenceServiceUrl}/api/v1/student-presence-events/manual`;
        return this.httpClient.post(url, dto);
    }
}
