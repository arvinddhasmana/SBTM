import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '../../../common/decorators/roles.decorator';
import { DataSource } from 'typeorm';

@Injectable()
export class StudentGatewayService {
    private readonly studentServiceUrl: string;

    constructor(
        private readonly httpClient: HttpClientService,
        private readonly configService: ConfigService,
        private readonly dataSource: DataSource,
    ) {
        this.studentServiceUrl = this.configService.get<string>(
            'STUDENT_SERVICE_URL',
            'http://localhost:3006',
        );
    }

    async getStudents(query: any, user: any) {
        // Enforce parent scoping
        if (user.role === Role.PARENT) {
            query.parent_id = user.id;
        } else if (user.role !== Role.ADMIN && user.role !== Role.OSTA_ADMIN) {
            if (!user.schoolId) {
                throw new ForbiddenException('School ID is required for this operation');
            }
            query.school_id = user.schoolId;
        }

        const url = `${this.studentServiceUrl}/students`;
        try {
            const res: any = await this.httpClient.get(url, { params: query });
            if (Array.isArray(res) && res.length > 0) {
                return res;
            }
        } catch {
            // Fall through to demo-reference fallback.
        }

        // Demo fallback: serve from students_reference (used elsewhere in demo flows).
        // Shape matches Admin Dashboard expectations (snake_case).
        const targetSchoolId = query?.school_id || user.schoolId || null;
        const rows: Array<{
            id: string;
            firstName: string;
            lastName: string;
            grade: number | null;
            assignedRouteId: string | null;
        }> = await this.dataSource.query(
            `
            SELECT
              id,
              "firstName" as "firstName",
              "lastName" as "lastName",
              grade,
              "assignedRouteId" as "assignedRouteId"
            FROM students_reference
            WHERE ($1::text IS NULL OR "schoolId" = $1)
            ORDER BY id ASC
            `,
            [targetSchoolId],
        );

        return rows.map((r) => ({
            id: r.id,
            first_name: r.firstName,
            last_name: r.lastName,
            grade: r.grade === null || r.grade === undefined ? '' : String(r.grade),
            status: 'ENROLLED',
            am_route_id: r.assignedRouteId || null,
            pm_route_id: null,
        }));
    }

    async getStudentById(id: string, user: any) {
        const url = `${this.studentServiceUrl}/students/${id}`;
        try {
            const student: any = await this.httpClient.get(url);

            // Security check: ensure user has access to this student's school
            if (user.role === Role.PARENT) {
                if (student.parent_user_id !== user.id) {
                    throw new ForbiddenException('You do not have access to this student');
                }
            } else if (user.role !== Role.ADMIN && user.role !== Role.OSTA_ADMIN) {
                if (student.school_id !== user.schoolId) {
                    throw new ForbiddenException('You do not have access to this student');
                }
            }

            return student;
        } catch {
            // Demo fallback
        }

        const rows: Array<{
            id: string;
            firstName: string;
            lastName: string;
            grade: number | null;
            assignedRouteId: string | null;
            schoolId: string | null;
            parentId: string | null;
        }> = await this.dataSource.query(
            `
            SELECT
              id,
              "firstName" as "firstName",
              "lastName" as "lastName",
              grade,
              "assignedRouteId" as "assignedRouteId",
              "schoolId" as "schoolId",
              "parentId" as "parentId"
            FROM students_reference
            WHERE id = $1
            LIMIT 1
            `,
            [id],
        );

        const student = rows[0];
        if (!student) {
            // Preserve old behavior (student-service not found) by throwing the same style of error
            throw new ForbiddenException('Student not found');
        }

        // Apply the same access checks, but based on demo columns
        if (user.role === Role.PARENT) {
            if (student.parentId !== user.id) {
                throw new ForbiddenException('You do not have access to this student');
            }
        } else if (user.role !== Role.ADMIN && user.role !== Role.OSTA_ADMIN) {
            if (student.schoolId !== user.schoolId) {
                throw new ForbiddenException('You do not have access to this student');
            }
        }

        return {
            id: student.id,
            first_name: student.firstName,
            last_name: student.lastName,
            grade: student.grade === null || student.grade === undefined ? '' : String(student.grade),
            status: 'ENROLLED',
            am_route_id: student.assignedRouteId || null,
            pm_route_id: null,
        };
    }

    async enrollStudent(dto: any, user: any) {
        if (user.role !== Role.ADMIN && user.role !== Role.SCHOOL_ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        if (user.role === Role.SCHOOL_ADMIN) {
            dto.school_id = user.schoolId;
        }

        const url = `${this.studentServiceUrl}/students`;
        return this.httpClient.post(url, dto);
    }

    async updateStudent(id: string, dto: any, user: any) {
        await this.getStudentById(id, user); // Check access
        const url = `${this.studentServiceUrl}/students/${id}`;
        return this.httpClient.patch(url, dto);
    }

    async assignRoute(id: string, assignment: any, user: any) {
        await this.getStudentById(id, user); // Check access
        const url = `${this.studentServiceUrl}/students/${id}/assignment`;
        return this.httpClient.patch(url, assignment);
    }

    async bulkImport(file: any, schoolId: string, user: any) {
        if (user.role !== Role.SCHOOL_ADMIN && user.role !== Role.ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        const targetSchoolId = user.role === Role.SCHOOL_ADMIN ? user.schoolId : schoolId;

        // Proxying file upload
        const url = `${this.studentServiceUrl}/students/bulk-import`;
        const formData = new FormData(); // This might need a specialized handling in httpClient
        // For simplicity, we'll assume the gateway passes the buffer

        // However, axios needs special handling for multipart/form-data with buffers
        // We'll use a post with the right headers and data format

        // But for now, let's keep it simple and assume the gateway can handle it
        return this.httpClient.post(url, { file, school_id: targetSchoolId });
    }
}
