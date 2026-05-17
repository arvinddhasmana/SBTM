import {
  Injectable,
  ForbiddenException,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { ReportAbsenceDto } from '../dto/report-absence.dto';
import { Role } from '@sbtm/common';
import type { AnchorKind } from '../../auth/entities/user.entity';

interface CallerContext {
  id: string;
  role: Role;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

/**
 * v2 stub: the v1 `student_absences` table has been removed in favour of a future
 * trip-day exception model (likely `stx_trip_exceptions` keyed by service_date +
 * student_id). Until that is designed and persisted, every method on this service
 * throws NotImplementedException so that callers see a clean 501 rather than silently
 * succeeding against a non-existent table.
 *
 * TODO(phase-B): design `stx_trip_exceptions` (kind ∈ {absent, late, alternate_pickup}),
 * then re-introduce reportAbsence / list / confirm / reject backed by that table.
 */
@Injectable()
export class AbsenceGatewayService {
  private readonly logger = new Logger(AbsenceGatewayService.name);

  constructor() {}

  async reportAbsence(
    _dto: ReportAbsenceDto,
    caller: CallerContext,
  ): Promise<never> {
    this.logger.debug('reportAbsence stub hit by caller', { id: caller.id });
    throw new NotImplementedException(
      'Absence reporting is not yet wired to the v2 trip-exception model',
    );
  }

  async listAbsences(
    _tripDate: string,
    _caller: CallerContext,
    _schoolId?: string,
  ): Promise<never> {
    throw new NotImplementedException(
      'Absence listing is not yet wired to the v2 trip-exception model',
    );
  }

  async listAbsencesForAdmin(
    caller: CallerContext,
    _tripDate?: string,
    _schoolId?: string,
  ): Promise<never> {
    if (caller.role === Role.PARENT) {
      throw new ForbiddenException('Parents cannot access admin absence view');
    }
    throw new NotImplementedException(
      'Admin absence listing is not yet wired to the v2 trip-exception model',
    );
  }

  async deleteAbsence(
    _absenceId: string,
    _caller: CallerContext,
  ): Promise<never> {
    throw new NotImplementedException(
      'Absence deletion is not yet wired to the v2 trip-exception model',
    );
  }

  async confirmAbsence(
    _absenceId: string,
    _caller: CallerContext,
  ): Promise<never> {
    throw new NotImplementedException(
      'Absence confirmation is not yet wired to the v2 trip-exception model',
    );
  }

  async rejectAbsence(
    _absenceId: string,
    _caller: CallerContext,
    _notes?: string,
  ): Promise<never> {
    throw new NotImplementedException(
      'Absence rejection is not yet wired to the v2 trip-exception model',
    );
  }
}
