import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ProposeFleetAssignmentDto } from '../dto/propose-fleet-assignment.dto';
import { Role } from '@sbtm/common';
import type { AnchorKind } from '../../auth/entities/user.entity';

interface CallerContext {
  id: string;
  role: Role;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

/**
 * v2 stub: the v1 `fleet_assignments` table is gone. Vehicle/Driver assignment now
 * lives on `stx_runs` (each Run row pins a vehicle + driver to a route+trip+service_date).
 * The propose/accept/reject workflow has not yet been re-modelled — we expect a
 * `stx_run_proposals` table in a follow-up, but for Phase B we throw 501.
 *
 * TODO(phase-B): design the run-proposal lifecycle (operator proposes → school accepts)
 * and re-implement these methods against `stx_runs` + `stx_run_proposals`.
 */
@Injectable()
export class FleetAssignmentGatewayService {
  private readonly logger = new Logger(FleetAssignmentGatewayService.name);

  constructor() {}

  async propose(
    _dto: ProposeFleetAssignmentDto,
    caller: CallerContext,
  ): Promise<never> {
    this.logger.debug('propose stub hit by caller', { id: caller.id });
    throw new NotImplementedException(
      'Fleet-assignment proposal is not yet wired to the v2 Run model',
    );
  }

  async list(_caller: CallerContext): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment listing is not yet wired to the v2 Run model',
    );
  }

  async getById(_id: string): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment lookup is not yet wired to the v2 Run model',
    );
  }

  async accept(_id: string, _caller: CallerContext): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment accept is not yet wired to the v2 Run model',
    );
  }

  async reject(
    _id: string,
    _caller: CallerContext,
    _notes?: string,
  ): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment reject is not yet wired to the v2 Run model',
    );
  }
}
