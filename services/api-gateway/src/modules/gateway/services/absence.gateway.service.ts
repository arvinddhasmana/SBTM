import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentAbsence } from '../entities/student-absence.entity';
import { ReportAbsenceDto } from '../dto/report-absence.dto';
import { Role } from '@sbtm/common';

interface CallerContext {
  id: string;
  role: Role;
  schoolId?: string;
  boardId?: string;
}

@Injectable()
export class AbsenceGatewayService {
  private readonly logger = new Logger(AbsenceGatewayService.name);

  constructor(
    @InjectRepository(StudentAbsence)
    private readonly absenceRepository: Repository<StudentAbsence>,
  ) {}

  /**
   * Report an absence for a student. Caller must be a parent (PARENT role)
   * and the absence is scoped to their schoolId. FR-ABS-001
   */
  async reportAbsence(
    dto: ReportAbsenceDto,
    caller: CallerContext,
  ): Promise<StudentAbsence> {
    if (!caller.schoolId) {
      throw new ForbiddenException(
        'Parent account is not associated with a school',
      );
    }

    // Prevent duplicate absence for the same student, date, and route type
    const existing = await this.absenceRepository.findOne({
      where: {
        studentId: dto.studentId,
        tripDate: dto.tripDate,
        routeType: dto.routeType,
        schoolId: caller.schoolId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'An absence for this student on this date and route type has already been reported',
      );
    }

    const absence = this.absenceRepository.create({
      studentId: dto.studentId,
      guardianUserId: caller.id,
      schoolId: caller.schoolId,
      tripDate: dto.tripDate,
      routeType: dto.routeType,
      notes: dto.notes,
    });

    const saved = await this.absenceRepository.save(absence);

    this.logger.log('Absence reported', {
      absenceId: saved.id,
      tenantId: caller.schoolId,
      studentId: dto.studentId,
      action: 'absence.reported',
    });

    return saved;
  }

  /**
   * List absences for a route and date. Accessible to drivers, school admins, board admins, OSTA admins.
   * FR-ABS-002
   */
  async listAbsences(
    tripDate: string,
    caller: CallerContext,
    schoolId?: string,
  ): Promise<StudentAbsence[]> {
    const resolvedSchoolId = this.resolveCallerSchoolId(caller, schoolId);

    return this.absenceRepository.find({
      where: {
        tripDate,
        schoolId: resolvedSchoolId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all absences for admin visibility with optional date filter.
   */
  async listAbsencesForAdmin(
    caller: CallerContext,
    tripDate?: string,
    schoolId?: string,
  ): Promise<StudentAbsence[]> {
    if (caller.role === Role.PARENT) {
      throw new ForbiddenException('Parents cannot access admin absence view');
    }

    const resolvedSchoolId = this.resolveCallerSchoolId(caller, schoolId);
    const query = this.absenceRepository
      .createQueryBuilder('absence')
      .where('absence.schoolId = :schoolId', { schoolId: resolvedSchoolId })
      .orderBy('absence.tripDate', 'DESC')
      .addOrderBy('absence.createdAt', 'DESC');

    if (tripDate) {
      query.andWhere('absence.tripDate = :tripDate', { tripDate });
    }

    return query.getMany();
  }

  async deleteAbsence(absenceId: string, caller: CallerContext): Promise<void> {
    const absence = await this.absenceRepository.findOne({
      where: { id: absenceId },
    });
    if (!absence) throw new NotFoundException('Absence record not found');

    // Parent can only delete their own reported absence
    if (caller.role === Role.PARENT && absence.guardianUserId !== caller.id) {
      throw new ForbiddenException('You can only cancel absences you reported');
    }

    await this.absenceRepository.remove(absence);

    this.logger.log('Absence cancelled', {
      absenceId,
      tenantId: absence.schoolId,
      callerId: caller.id,
      action: 'absence.cancelled',
    });
  }

  /**
   * Confirm a pending absence. Caller must be SCHOOL_ADMIN with matching schoolId.
   */
  async confirmAbsence(
    absenceId: string,
    caller: CallerContext,
  ): Promise<StudentAbsence> {
    const absence = await this.absenceRepository.findOne({
      where: { id: absenceId },
    });
    if (!absence) throw new NotFoundException('Absence record not found');

    if (
      caller.role === Role.SCHOOL_ADMIN &&
      absence.schoolId !== caller.schoolId
    ) {
      throw new ForbiddenException(
        'You can only confirm absences from your own school',
      );
    }

    absence.confirmationStatus = 'CONFIRMED';
    absence.confirmedByUserId = caller.id;
    absence.confirmedAt = new Date();

    const saved = await this.absenceRepository.save(absence);

    this.logger.log('Absence confirmed', {
      absenceId,
      tenantId: absence.schoolId,
      callerId: caller.id,
      action: 'absence.confirmed',
    });

    return saved;
  }

  /**
   * Reject a pending absence. Caller must be SCHOOL_ADMIN with matching schoolId.
   */
  async rejectAbsence(
    absenceId: string,
    caller: CallerContext,
    notes?: string,
  ): Promise<StudentAbsence> {
    const absence = await this.absenceRepository.findOne({
      where: { id: absenceId },
    });
    if (!absence) throw new NotFoundException('Absence record not found');

    if (
      caller.role === Role.SCHOOL_ADMIN &&
      absence.schoolId !== caller.schoolId
    ) {
      throw new ForbiddenException(
        'You can only reject absences from your own school',
      );
    }

    absence.confirmationStatus = 'REJECTED';
    absence.confirmedByUserId = caller.id;
    absence.confirmedAt = new Date();
    if (notes) {
      absence.confirmationNotes = notes;
    }

    const saved = await this.absenceRepository.save(absence);

    this.logger.log('Absence rejected', {
      absenceId,
      tenantId: absence.schoolId,
      callerId: caller.id,
      action: 'absence.rejected',
    });

    return saved;
  }

  // ---------- private helpers ----------

  private resolveCallerSchoolId(
    caller: CallerContext,
    requestedSchoolId?: string,
  ): string {
    if (
      caller.role === Role.SCHOOL_ADMIN ||
      caller.role === Role.DRIVER ||
      caller.role === Role.PARENT
    ) {
      if (!caller.schoolId) {
        throw new ForbiddenException('User is not associated with a school');
      }
      return caller.schoolId;
    }

    if (!requestedSchoolId) {
      throw new ForbiddenException('schoolId is required for this operation');
    }

    return requestedSchoolId;
  }
}
