import {
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportAbsenceDto } from '../dto/report-absence.dto';
import { Role } from '@sbtm/common';
import type { AnchorKind } from '../../auth/entities/user.entity';
import { RlsContextService } from '../../../common/services/rls-context.service';

interface CallerContext {
  id: string;
  role: Role;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

export interface AbsenceDto {
  id: string;
  studentId: string;
  tripDate: string;
  routeType: 'AM' | 'PM' | 'BOTH';
  confirmationStatus: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  reportedByUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AbsenceRow {
  id: string;
  student_id: string;
  trip_date: string;
  route_type: 'AM' | 'PM' | 'BOTH';
  confirmation_status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  reported_by_user_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToDto(row: AbsenceRow): AbsenceDto {
  return {
    id: row.id,
    studentId: row.student_id,
    tripDate: row.trip_date,
    routeType: row.route_type,
    confirmationStatus: row.confirmation_status,
    reportedByUserId: row.reported_by_user_id,
    notes: row.notes,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

/**
 * v2 absence gateway, backed by `stx_student_absences`.
 *
 * Scoping (app-layer, mirrors the rest of the gateway):
 *   - parent: must own the student via `stx_student_guardians`
 *     (`guardian_id = caller.anchorId`); may only act on rows they reported and
 *     only while still `pending`.
 *   - school admin: scoped to absences whose student's `school_id` matches the
 *     caller's anchor.
 *   - board admin: scoped via `stx_schools.board_id`.
 *   - sta admin: scoped via `stx_boards.sta_id`.
 *   - super: no scope filter.
 *   - driver: scoped to students appearing on the caller's `stx_runs` for the
 *     queried `tripDate` (via `stx_ridership` join on the run's `trip_ids`).
 *
 * RLS posture: the RLS policy on `stx_student_absences` allows only
 * super/sta/board/school anchors to read; parent / driver paths are
 * app-layer scoped. Tables are not FORCE'd to RLS, so the app DB user (table
 * owner) reads/writes through the policies without explicit bypass.
 */
@Injectable()
export class AbsenceGatewayService {
  private readonly logger = new Logger(AbsenceGatewayService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly rlsContext: RlsContextService,
  ) {
    void this.dataSource;
  }

  async reportAbsence(
    dto: ReportAbsenceDto,
    caller: CallerContext,
  ): Promise<AbsenceDto> {
    if (caller.role !== Role.PARENT) {
      throw new ForbiddenException('Only parents can report absences');
    }
    if (caller.anchorKind !== 'parent' || !caller.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a guardian');
    }
    const guardianId = caller.anchorId;

    return this.rlsContext.runAsCurrent(async (tx) => {
      const ownership = (await tx.query(
        `SELECT 1 FROM stx_student_guardians
         WHERE guardian_id = $1 AND student_id = $2
         LIMIT 1`,
        [guardianId, dto.studentId],
      )) as unknown[];
      if (ownership.length === 0) {
        throw new ForbiddenException(
          'Guardian is not linked to the specified student',
        );
      }

      const duplicate = (await tx.query(
        `SELECT id FROM stx_student_absences
         WHERE student_id = $1
           AND trip_date = $2::date
           AND route_type = $3
           AND confirmation_status <> 'cancelled'
         LIMIT 1`,
        [dto.studentId, dto.tripDate, dto.routeType],
      )) as Array<{ id: string }>;
      if (duplicate.length > 0) {
        throw new ConflictException(
          'An absence for that student / date / route already exists',
        );
      }

      const inserted = (await tx.query(
        `INSERT INTO stx_student_absences
           (student_id, trip_date, route_type, confirmation_status,
            reported_by_user_id, notes)
         VALUES ($1, $2::date, $3, 'pending', $4, $5)
         RETURNING id, student_id, trip_date, route_type,
                   confirmation_status, reported_by_user_id, notes,
                   created_at, updated_at`,
        [
          dto.studentId,
          dto.tripDate,
          dto.routeType,
          caller.id,
          dto.notes ?? null,
        ],
      )) as AbsenceRow[];
      return rowToDto(inserted[0]);
    });
  }

  async listAbsencesForAdmin(
    caller: CallerContext,
    tripDate?: string,
    schoolId?: string,
  ): Promise<AbsenceDto[]> {
    if (caller.role === Role.PARENT) {
      throw new ForbiddenException('Parents cannot access admin absence view');
    }
    if (caller.role === Role.DRIVER) {
      return this.listAbsencesForDriver(caller, tripDate);
    }
    const effectiveAnchorKind =
      caller.role === Role.SUPER_ADMIN ? 'super' : caller.anchorKind;
    if (!effectiveAnchorKind) {
      throw new ForbiddenException('Caller has no anchor');
    }

    return this.rlsContext.runAsCurrent(async (tx) => {
      const where: string[] = [];
      const params: unknown[] = [];
      const push = (clause: string, value: unknown) => {
        params.push(value);
        where.push(clause.replace('$$', `$${params.length}`));
      };

      if (tripDate) {
        push('a.trip_date = $$::date', tripDate);
      }

      switch (effectiveAnchorKind) {
        case 'super':
          if (schoolId) push('stu.school_id = $$::uuid', schoolId);
          break;
        case 'sta':
          if (!caller.anchorId) {
            throw new ForbiddenException('STA admin missing anchorId');
          }
          push(
            'sch.board_id IN (SELECT id FROM stx_boards WHERE sta_id = $$::uuid)',
            caller.anchorId,
          );
          if (schoolId) push('stu.school_id = $$::uuid', schoolId);
          break;
        case 'board':
          if (!caller.anchorId) {
            throw new ForbiddenException('Board admin missing anchorId');
          }
          push('sch.board_id = $$::uuid', caller.anchorId);
          if (schoolId) push('stu.school_id = $$::uuid', schoolId);
          break;
        case 'school':
          if (!caller.anchorId) {
            throw new ForbiddenException('School admin missing anchorId');
          }
          // School admins cannot override the school scope.
          push('stu.school_id = $$::uuid', caller.anchorId);
          break;
        default:
          throw new ForbiddenException(
            `Anchor kind ${caller.anchorKind} cannot list absences`,
          );
      }

      const sql = `
        SELECT a.id, a.student_id, a.trip_date, a.route_type,
               a.confirmation_status, a.reported_by_user_id, a.notes,
               a.created_at, a.updated_at
        FROM stx_student_absences a
        JOIN stx_students stu ON stu.id = a.student_id
        JOIN stx_schools  sch ON sch.id = stu.school_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY a.trip_date DESC, a.created_at DESC
      `;
      const rows = (await tx.query(sql, params)) as AbsenceRow[];
      return rows.map(rowToDto);
    });
  }

  private async listAbsencesForDriver(
    caller: CallerContext,
    tripDate?: string,
  ): Promise<AbsenceDto[]> {
    if (caller.anchorKind !== 'driver' || !caller.anchorId) {
      throw new ForbiddenException('Driver caller missing anchorId');
    }
    const driverId = caller.anchorId;
    const serviceDate = tripDate ?? new Date().toISOString().slice(0, 10);

    return this.rlsContext.runAsCurrent(async (tx) => {
      const rows = (await tx.query(
        `
        SELECT DISTINCT a.id, a.student_id, a.trip_date, a.route_type,
               a.confirmation_status, a.reported_by_user_id, a.notes,
               a.created_at, a.updated_at
        FROM stx_student_absences a
        JOIN stx_ridership rd ON rd.student_id = a.student_id
        JOIN stx_runs      run ON rd.trip_id = ANY(run.trip_ids)
        WHERE run.driver_id    = $1
          AND run.service_date = $2::date
          AND run.deleted_at   IS NULL
          AND a.trip_date      = $2::date
        ORDER BY a.trip_date DESC, a.created_at DESC
        `,
        [driverId, serviceDate],
      )) as AbsenceRow[];
      return rows.map(rowToDto);
    });
  }

  async confirmAbsence(
    absenceId: string,
    caller: CallerContext,
  ): Promise<AbsenceDto> {
    return this.updateStatus(absenceId, caller, 'confirmed');
  }

  async rejectAbsence(
    absenceId: string,
    caller: CallerContext,
    notes?: string,
  ): Promise<AbsenceDto> {
    return this.updateStatus(absenceId, caller, 'rejected', notes);
  }

  private async updateStatus(
    absenceId: string,
    caller: CallerContext,
    nextStatus: 'confirmed' | 'rejected',
    notes?: string,
  ): Promise<AbsenceDto> {
    if (caller.role !== Role.SCHOOL_ADMIN) {
      throw new ForbiddenException(
        'Only school admins can confirm or reject absences',
      );
    }
    if (caller.anchorKind !== 'school' || !caller.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a school');
    }
    const schoolId = caller.anchorId;

    return this.rlsContext.runAsCurrent(async (tx) => {
      const existing = (await tx.query(
        `SELECT a.id, a.confirmation_status, stu.school_id
         FROM stx_student_absences a
         JOIN stx_students stu ON stu.id = a.student_id
         WHERE a.id = $1
         LIMIT 1`,
        [absenceId],
      )) as Array<{
        id: string;
        confirmation_status: string;
        school_id: string;
      }>;
      if (existing.length === 0) {
        throw new NotFoundException('Absence not found');
      }
      if (existing[0].school_id !== schoolId) {
        throw new ForbiddenException(
          'Absence belongs to a student outside the admin school',
        );
      }
      if (existing[0].confirmation_status !== 'pending') {
        throw new BadRequestException(
          `Cannot ${nextStatus === 'confirmed' ? 'confirm' : 'reject'} an absence in state ${existing[0].confirmation_status}`,
        );
      }

      const updated = (await tx.query(
        `UPDATE stx_student_absences
         SET confirmation_status = $1,
             notes = COALESCE($2, notes),
             updated_at = now()
         WHERE id = $3
         RETURNING id, student_id, trip_date, route_type,
                   confirmation_status, reported_by_user_id, notes,
                   created_at, updated_at`,
        [nextStatus, notes ?? null, absenceId],
      )) as AbsenceRow[];
      return rowToDto(updated[0]);
    });
  }

  async deleteAbsence(absenceId: string, caller: CallerContext): Promise<void> {
    return this.rlsContext.runAsCurrent(async (tx) => {
      const rows = (await tx.query(
        `SELECT a.id, a.reported_by_user_id, a.confirmation_status,
                stu.school_id, sch.board_id
         FROM stx_student_absences a
         JOIN stx_students stu ON stu.id = a.student_id
         JOIN stx_schools  sch ON sch.id = stu.school_id
         WHERE a.id = $1
         LIMIT 1`,
        [absenceId],
      )) as Array<{
        id: string;
        reported_by_user_id: string | null;
        confirmation_status: string;
        school_id: string;
        board_id: string;
      }>;
      if (rows.length === 0) {
        throw new NotFoundException('Absence not found');
      }
      const row = rows[0];

      if (caller.role === Role.PARENT) {
        if (caller.anchorKind !== 'parent' || !caller.anchorId) {
          throw new ForbiddenException('Caller is not anchored to a guardian');
        }
        if (row.reported_by_user_id !== caller.id) {
          throw new ForbiddenException(
            'Parents may only cancel absences they reported',
          );
        }
        if (row.confirmation_status !== 'pending') {
          throw new BadRequestException(
            'Cannot cancel an absence that has already been processed',
          );
        }
      } else if (caller.anchorKind === 'school') {
        if (row.school_id !== caller.anchorId) {
          throw new ForbiddenException(
            'Absence belongs to a student outside the admin school',
          );
        }
      } else if (caller.anchorKind === 'board') {
        if (row.board_id !== caller.anchorId) {
          throw new ForbiddenException(
            'Absence belongs to a student outside the admin board',
          );
        }
      } else if (caller.anchorKind === 'sta') {
        const scope = (await tx.query(
          `SELECT 1 FROM stx_boards
           WHERE id = $1 AND sta_id = $2 LIMIT 1`,
          [row.board_id, caller.anchorId],
        )) as unknown[];
        if (scope.length === 0) {
          throw new ForbiddenException(
            'Absence belongs to a student outside the admin STA',
          );
        }
      } else if (caller.anchorKind !== 'super') {
        throw new ForbiddenException(
          `Anchor kind ${caller.anchorKind} cannot delete absences`,
        );
      }

      await tx.query(`DELETE FROM stx_student_absences WHERE id = $1`, [
        absenceId,
      ]);
    });
  }
}
