import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '../../../common/decorators/roles.decorator';

export interface StudentPresenceDto {
    studentId: string;
    name: string;
    status: 'BOARDED' | 'ALIGHTED';
    lastSeen: string;
}

export interface CreateStudentPresenceEventDto {
    studentId: string;
    vehicleId: string;
    routeId: string;
    eventType: 'BOARD' | 'ALIGHT';
    timestamp: string;
    source: 'SMARTTAG' | 'MANUAL' | 'RFID';
    signalStrength?: number;
    schoolId?: string;
}

interface RequestUser {
    id: string;
    role: Role;
    childRouteIds?: string[];
    assignedRouteIds?: string[];
    schoolId?: string;
}

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

    async getStudentsForRoute(routeId: string, user: RequestUser): Promise<StudentPresenceDto[]> {
        this.checkRouteAccess(routeId, user);

        const url = `${this.presenceServiceUrl}/api/v1/routes/${routeId}/students`;
        const params = user.schoolId ? { schoolId: user.schoolId } : undefined;
        const response = await this.httpClient.get<any>(url, { params });

        if (response && Array.isArray(response.students)) {
            return response.students as StudentPresenceDto[];
        }

        return response as StudentPresenceDto[];
    }

    async createStudentPresenceEvent(
        dto: CreateStudentPresenceEventDto,
        user: RequestUser,
    ): Promise<{ presenceEventId: string }> {
        // Only drivers and admins can create presence events
        if (user.role !== Role.DRIVER && user.role !== Role.ADMIN) {
            throw new ForbiddenException('Only drivers can create presence events');
        }

        if (user.role === Role.DRIVER && !user.assignedRouteIds?.includes(dto.routeId)) {
            throw new ForbiddenException('You can only report presence for your assigned routes');
        }

        const url = `${this.presenceServiceUrl}/api/v1/student-presence-events/manual`;
        const payload = {
            ...dto,
            schoolId: dto.schoolId || user.schoolId,
        };
        return this.httpClient.post<{ presenceEventId: string }>(url, payload);
    }

    private checkRouteAccess(routeId: string, user: RequestUser): void {
        // System admins can access all routes
        if (user.role === Role.ADMIN || user.role === Role.OSTA_ADMIN || user.role === Role.BOARD_ADMIN || user.role === Role.SCHOOL_ADMIN) {
            return;
        }

        if (user.role === Role.PARENT) {
            if (!user.childRouteIds?.includes(routeId)) {
                throw new ForbiddenException('You do not have access to this route');
            }
            return;
        }

        if (user.role === Role.DRIVER) {
            if (!user.assignedRouteIds?.includes(routeId)) {
                throw new ForbiddenException('You do not have access to this route');
            }
            return;
        }

        throw new ForbiddenException('Access denied');
    }
}
