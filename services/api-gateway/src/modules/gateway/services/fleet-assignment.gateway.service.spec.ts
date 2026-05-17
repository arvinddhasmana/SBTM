import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException } from '@nestjs/common';
import { Role } from '@sbtm/common';
import { FleetAssignmentGatewayService } from './fleet-assignment.gateway.service';
import { ProposeFleetAssignmentDto } from '../dto/propose-fleet-assignment.dto';

/**
 * v2 contract test — the v1 fleet_assignments table is gone; vehicle/driver pinning
 * now lives on stx_runs and the propose/accept/reject lifecycle is blocked on the
 * stx_run_proposals design decision (v2-followups #2). Until that lands, every
 * surface throws NotImplementedException; this spec locks that in so a future
 * partial wiring can't silently regress.
 */
describe('FleetAssignmentGatewayService (v2 — phase-B 501 contract)', () => {
  let service: FleetAssignmentGatewayService;
  const caller = {
    id: 'op-1',
    role: Role.OPERATOR_ADMIN,
    anchorKind: 'operator' as const,
    anchorId: 'op-stock',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FleetAssignmentGatewayService],
    }).compile();
    service = module.get(FleetAssignmentGatewayService);
  });

  it('propose throws NotImplementedException', async () => {
    await expect(
      service.propose({} as ProposeFleetAssignmentDto, caller),
    ).rejects.toThrow(NotImplementedException);
  });

  it('list throws NotImplementedException', async () => {
    await expect(service.list(caller)).rejects.toThrow(NotImplementedException);
  });

  it('getById throws NotImplementedException', async () => {
    await expect(service.getById('any')).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('accept throws NotImplementedException', async () => {
    await expect(service.accept('any', caller)).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('reject throws NotImplementedException (with or without notes)', async () => {
    await expect(service.reject('any', caller)).rejects.toThrow(
      NotImplementedException,
    );
    await expect(service.reject('any', caller, 'late')).rejects.toThrow(
      NotImplementedException,
    );
  });
});
