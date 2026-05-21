import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException } from '@nestjs/common';
import { Role } from '@sbtm/common';
import { FleetAssignmentGatewayService } from './fleet-assignment.gateway.service';
import { ProposeFleetAssignmentDto } from '../dto/propose-fleet-assignment.dto';

/**
 * v2 contract test — fleet-assignment proposal workflow is **parked indefinitely**
 * per user direction (decision 2026-05-17, v2-followups #2). Vehicle/driver pinning
 * lives on stx_runs and is written by the importer; the propose/accept/reject
 * lifecycle is not part of the v2 surface. The controller routes remain registered
 * so the frontend gets a well-formed 501 instead of a 404; this spec locks that in.
 */
describe('FleetAssignmentGatewayService (v2 — parked 501 contract)', () => {
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

  it('list returns empty array (workflow parked — no stx_run_proposals table)', async () => {
    await expect(service.list(caller)).resolves.toEqual([]);
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
