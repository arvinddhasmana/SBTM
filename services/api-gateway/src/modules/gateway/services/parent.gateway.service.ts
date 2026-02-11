import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { School } from '../../auth/entities/school.entity';
import { Route } from '../../auth/entities/route.entity';

interface ParentUser {
    id: string;
    schoolId?: string;
}

interface StudentRecord {
    id: string;
    first_name: string;
    last_name: string;
    school_id: string;
    am_route_id?: string;
    pm_route_id?: string;
}

interface ParentChildDto {
    id: string;
    name: string;
    schoolName?: string;
    routeId?: string;
    vehicleId?: string;
    status: 'on_bus' | 'at_school' | 'at_home' | 'unknown';
    avatarUrl?: string;
}

@Injectable()
export class ParentGatewayService {
    private readonly studentServiceUrl: string;

    constructor(
        private readonly httpClient: HttpClientService,
        private readonly configService: ConfigService,
        @InjectRepository(School)
        private readonly schoolRepository: Repository<School>,
        @InjectRepository(Route)
        private readonly routeRepository: Repository<Route>,
    ) {
        this.studentServiceUrl = this.configService.get<string>(
            'STUDENT_SERVICE_URL',
            'http://localhost:3006',
        );
    }

    async getChildrenForParent(user: ParentUser): Promise<ParentChildDto[]> {
        const url = `${this.studentServiceUrl}/students`;
        const students = await this.httpClient.get<StudentRecord[]>(url, {
            params: { parent_id: user.id },
        });

        if (!students || students.length === 0) {
            return [];
        }

        const schoolIds = Array.from(new Set(students.map((s) => s.school_id).filter(Boolean)));
        const routeIds = Array.from(new Set(
            students
                .map((s) => s.am_route_id || s.pm_route_id)
                .filter(Boolean) as string[],
        ));

        const schools = schoolIds.length
            ? await this.schoolRepository.findBy({ id: In(schoolIds) })
            : [];
        const routes = routeIds.length
            ? await this.routeRepository.findBy({ id: In(routeIds) })
            : [];

        const schoolMap = new Map(schools.map((s) => [s.id, s]));
        const routeMap = new Map(routes.map((r) => [r.id, r]));

        return students.map((student) => {
            const routeId = student.am_route_id || student.pm_route_id;
            const route = routeId ? routeMap.get(routeId) : undefined;
            const school = schoolMap.get(student.school_id);
            const name = `${student.first_name} ${student.last_name}`.trim();

            return {
                id: student.id,
                name,
                schoolName: school?.name,
                routeId,
                vehicleId: route?.vehicleId,
                status: 'unknown',
                avatarUrl: name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` : undefined,
            };
        });
    }
}
