import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
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

interface ReferenceStudentRow {
    id: string;
    firstName: string;
    lastName: string;
    parentId: string;
    schoolId: string | null;
    assignedRouteId: string | null;
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
        private readonly dataSource: DataSource,
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
        // Demo-first behavior: use seeded reference tables for parent portal.
        // This keeps IDs consistent with GPS/presence demo data (ROUTE-A, BUS-001, etc.).
        let refStudents: ReferenceStudentRow[] = [];
        try {
            refStudents = await this.dataSource.query(
                `SELECT id, "firstName" as "firstName", "lastName" as "lastName", "parentId" as "parentId", "schoolId" as "schoolId", "assignedRouteId" as "assignedRouteId"
                 FROM students_reference
                 WHERE "parentId" = $1
                 ORDER BY id ASC`,
                [user.id],
            );
        } catch {
            refStudents = [];
        }

        if (refStudents.length > 0) {
            const schoolIds = Array.from(new Set(refStudents.map((s) => s.schoolId).filter(Boolean) as string[]));
            const routeIds = Array.from(new Set(refStudents.map((s) => s.assignedRouteId).filter(Boolean) as string[]));

            const schools = schoolIds.length
                ? await this.schoolRepository.findBy({ id: In(schoolIds) })
                : [];
            const schoolMap = new Map(schools.map((s) => [s.id, s]));

            const routeVehicleRows = routeIds.length
                ? await this.dataSource.query(
                    `SELECT id, "vehicleId" as "vehicleId" FROM routes_reference WHERE id = ANY($1)`,
                    [routeIds],
                ) as Array<{ id: string; vehicleId: string | null }>
                : [];
            const routeToVehicle = new Map(routeVehicleRows.map((r) => [r.id, r.vehicleId || undefined]));

            return refStudents.map((student) => {
                const school = student.schoolId ? schoolMap.get(student.schoolId) : undefined;
                const routeId = student.assignedRouteId || undefined;
                const vehicleId = routeId ? routeToVehicle.get(routeId) : undefined;
                const name = `${student.firstName} ${student.lastName}`.trim();

                return {
                    id: student.id,
                    name,
                    schoolName: school?.name,
                    routeId,
                    vehicleId,
                    status: 'unknown',
                    avatarUrl: name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}` : undefined,
                };
            });
        }

        // Fallback: if reference data isn't present, use student-management service
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
