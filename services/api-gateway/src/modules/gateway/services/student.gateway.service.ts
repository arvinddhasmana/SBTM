import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '@sbtm/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { schoolIdFromAnchor } from '../../auth/utils/anchor-scope';

@Injectable()
export class StudentGatewayService {
  private readonly studentServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.studentServiceUrl = this.configService.getOrThrow<string>(
      'STUDENT_SERVICE_URL',
    );
  }

  async getStudents(query: any, user: AuthenticatedUser) {
    const schoolId = schoolIdFromAnchor(user);
    // Enforce parent scoping
    if (user.role === Role.PARENT) {
      query.parent_id = user.id;
    } else if (user.role === Role.STA_ADMIN || user.role === Role.SUPER_ADMIN) {
      // Unrestricted access - see all students
    } else if (user.role === Role.BOARD_ADMIN) {
      // Board admin: scope to their board via UI; no school filter applied here.
    } else {
      if (!schoolId) {
        throw new ForbiddenException(
          'School ID is required for this operation',
        );
      }
      query.school_id = schoolId;
    }

    const url = `${this.studentServiceUrl}/students`;
    try {
      const res: any = await this.httpClient.get(url, { params: query });
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
    } catch {
      // Fall through to operational students table fallback.
    }

    // Fallback: serve from operational students table (demo flows).
    // Shape matches Admin Dashboard expectations (snake_case).
    const targetSchoolId = query?.school_id || schoolId || null;
    try {
      const rows: Array<{
        id: string;
        grade: string | null;
      }> = await this.dataSource.query(
        `
            SELECT
              id,
              grade
            FROM stx_students
            WHERE ($1::text IS NULL OR school_id = $1::uuid)
            ORDER BY id ASC
            `,
        [targetSchoolId],
      );

      return rows.map((r) => ({
        id: r.id,
        first_name: '',
        last_name: '',
        grade: r.grade || '',
        status: 'ENROLLED',
        am_route_id: null,
        pm_route_id: null,
      }));
    } catch {
      return [];
    }
  }

  async getStudentById(id: string, user: AuthenticatedUser) {
    const callerSchoolId = schoolIdFromAnchor(user);
    const url = `${this.studentServiceUrl}/students/${id}`;
    try {
      const student: any = await this.httpClient.get(url);

      // Security check: ensure user has access to this student's school
      if (user.role === Role.PARENT) {
        if (student.parent_user_id !== user.id) {
          throw new ForbiddenException(
            'You do not have access to this student',
          );
        }
      } else if (
        user.role !== Role.STA_ADMIN &&
        user.role !== Role.SUPER_ADMIN &&
        user.role !== Role.BOARD_ADMIN
      ) {
        if (student.school_id !== callerSchoolId) {
          throw new ForbiddenException(
            'You do not have access to this student',
          );
        }
      }

      return student;
    } catch {
      // Demo fallback
    }

    const rows: Array<{
      id: string;
      grade: string | null;
      schoolId: string | null;
    }> = await this.dataSource.query(
      `
            SELECT
              id,
              grade,
              school_id as "schoolId"
            FROM stx_students
            WHERE id = $1
            LIMIT 1
            `,
      [id],
    );

    const student = rows[0];
    if (!student) {
      throw new ForbiddenException('Student not found');
    }

    // Apply the same access checks, but based on demo columns
    if (user.role === Role.PARENT) {
      if (true) {
        throw new ForbiddenException('You do not have access to this student');
      }
    } else if (
      user.role !== Role.STA_ADMIN &&
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.BOARD_ADMIN
    ) {
      if (student.schoolId !== callerSchoolId) {
        throw new ForbiddenException('You do not have access to this student');
      }
    }

    return {
      id: student.id,
      first_name: '',
      last_name: '',
      grade:
        student.grade === null || student.grade === undefined
          ? ''
          : String(student.grade),
      status: 'ENROLLED',
      am_route_id: null,
      pm_route_id: null,
    };
  }

  async enrollStudent(dto: any, user: AuthenticatedUser) {
    if (
      user.role !== Role.STA_ADMIN &&
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (user.role === Role.SCHOOL_ADMIN) {
      const callerSchoolId = schoolIdFromAnchor(user);
      if (!callerSchoolId) {
        throw new ForbiddenException(
          'School anchor required to enroll a student',
        );
      }
      dto.school_id = callerSchoolId;
    }

    const url = `${this.studentServiceUrl}/students`;
    return this.httpClient.post(url, dto);
  }

  async updateStudent(id: string, dto: any, user: AuthenticatedUser) {
    await this.getStudentById(id, user); // Check access
    const url = `${this.studentServiceUrl}/students/${id}`;
    return this.httpClient.patch(url, dto);
  }

  async assignRoute(id: string, assignment: any, user: AuthenticatedUser) {
    await this.getStudentById(id, user); // Check access
    const url = `${this.studentServiceUrl}/students/${id}/assignment`;
    return this.httpClient.patch(url, assignment);
  }

  async bulkImport(file: any, schoolId: string, user: AuthenticatedUser) {
    if (
      user.role !== Role.SCHOOL_ADMIN &&
      user.role !== Role.STA_ADMIN &&
      user.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const targetSchoolId =
      user.role === Role.SCHOOL_ADMIN ? schoolIdFromAnchor(user) : schoolId;
    if (user.role === Role.SCHOOL_ADMIN && !targetSchoolId) {
      throw new ForbiddenException('School anchor required for bulk import');
    }

    // Proxying file upload
    const url = `${this.studentServiceUrl}/students/bulk-import`;
    return this.httpClient.post(url, { file, school_id: targetSchoolId });
  }
}
