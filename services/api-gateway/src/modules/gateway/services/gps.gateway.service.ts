import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '../../../common/decorators/roles.decorator';

export interface LiveLocationDto {
    routeId: string;
    vehicleId: string;
    lastUpdate: string;
    position: { lat: number; lng: number };
    etaToNextStopMinutes: number;
    deviationFlag?: boolean;
}

export interface LocationHistoryQueryDto {
    from?: string;
    to?: string;
    granularity?: 'raw' | '1min' | '5min';
}

interface RequestUser {
    id: string;
    role: Role;
    childRouteIds?: string[];
    assignedRouteIds?: string[];
}

@Injectable()
export class GpsGatewayService {
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

    async getLiveLocation(routeId: string, user: RequestUser): Promise<LiveLocationDto> {
        this.checkRouteAccess(routeId, user);

        const url = `${this.gpsServiceUrl}/api/v1/routes/${routeId}/live-location`;
        return this.httpClient.get<LiveLocationDto>(url);
    }

    async getLocationHistory(
        routeId: string,
        query: LocationHistoryQueryDto,
        user: RequestUser,
    ): Promise<unknown> {
        this.checkRouteAccess(routeId, user);

        const params = new URLSearchParams();
        if (query.from) params.append('from', query.from);
        if (query.to) params.append('to', query.to);
        if (query.granularity) params.append('granularity', query.granularity);

        const url = `${this.gpsServiceUrl}/api/v1/routes/${routeId}/history?${params.toString()}`;
        return this.httpClient.get(url);
    }

    private checkRouteAccess(routeId: string, user: RequestUser): void {
        // Admins can access all routes
        if (user.role === Role.ADMIN) {
            return;
        }

        // Parents can only access their children's routes
        if (user.role === Role.PARENT) {
            if (!user.childRouteIds?.includes(routeId)) {
                throw new ForbiddenException('You do not have access to this route');
            }
            return;
        }

        // Drivers can only access their assigned routes
        if (user.role === Role.DRIVER) {
            if (!user.assignedRouteIds?.includes(routeId)) {
                throw new ForbiddenException('You do not have access to this route');
            }
            return;
        }

        throw new ForbiddenException('Access denied');
    }
}
