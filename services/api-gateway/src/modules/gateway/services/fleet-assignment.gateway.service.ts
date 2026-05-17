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
 * v2: parked indefinitely (decision 2026-05-17, see docs/Design/v2-followups.md #2).
 *
 * The v1 `fleet_assignments` table is gone. Vehicle/Driver assignment now lives on
 * `stx_runs` (each Run row pins a vehicle + driver to a route+trip+service_date),
 * which is written directly by the importer and by Phase-C admin UI.
 *
 * Per user direction we are **skipping the propose/accept/reject workflow entirely**
 * — there is no `stx_run_proposals` table and no plan to add one. The controller
 * routes stay registered so the frontend gets a well-formed 501 rather than a 404,
 * but the methods will not be re-implemented.
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
      'Fleet-assignment proposal workflow is not part of the v2 surface',
    );
  }

  async list(_caller: CallerContext): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment listing is not part of the v2 surface',
    );
  }

  async getById(_id: string): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment lookup is not part of the v2 surface',
    );
  }

  async accept(_id: string, _caller: CallerContext): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment accept is not part of the v2 surface',
    );
  }

  async reject(
    _id: string,
    _caller: CallerContext,
    _notes?: string,
  ): Promise<never> {
    throw new NotImplementedException(
      'Fleet-assignment reject is not part of the v2 surface',
    );
  }
}
