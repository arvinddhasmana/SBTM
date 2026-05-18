import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@sbtm/common';
import { GpsRouteAccessGuard } from './gps-route-access.guard';
import { GpsGatewayService } from '../services/gps.gateway.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

const parent: AuthenticatedUser = {
  id: 'guardian-1',
  email: 'p@example.com',
  role: Role.PARENT,
  anchorKind: 'parent',
  anchorId: 'guardian-1',
  preferredLanguage: 'en',
};

const staAdmin: AuthenticatedUser = {
  id: 'u-sta',
  email: 'sta@example.com',
  role: Role.STA_ADMIN,
  anchorKind: 'sta',
  anchorId: 'sta-1',
  preferredLanguage: 'en',
};

const driver: AuthenticatedUser = {
  id: 'u-driver',
  email: 'd@example.com',
  role: Role.DRIVER,
  anchorKind: 'driver',
  anchorId: 'drv-1',
  preferredLanguage: 'en',
};

const makeContext = (
  routeId: string | undefined,
  user: AuthenticatedUser,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ params: routeId ? { routeId } : {}, user }),
    }),
  }) as unknown as ExecutionContext;

describe('GpsRouteAccessGuard', () => {
  let guard: GpsRouteAccessGuard;
  let checkRouteAccess: jest.Mock;

  beforeEach(() => {
    checkRouteAccess = jest.fn().mockResolvedValue(undefined);
    guard = new GpsRouteAccessGuard({
      checkRouteAccess,
    } as unknown as GpsGatewayService);
  });

  it('returns true when checkRouteAccess resolves', async () => {
    const result = await guard.canActivate(makeContext('R-1', parent));
    expect(checkRouteAccess).toHaveBeenCalledWith('R-1', parent);
    expect(result).toBe(true);
  });

  it('propagates ForbiddenException from checkRouteAccess', async () => {
    checkRouteAccess.mockRejectedValue(
      new ForbiddenException('You do not have access to this route'),
    );
    await expect(
      guard.canActivate(makeContext('R-NOT-MINE', parent)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('skips check when no routeId param', async () => {
    const result = await guard.canActivate(makeContext(undefined, parent));
    expect(checkRouteAccess).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('passes through admin users (checkRouteAccess admin short-circuit)', async () => {
    const result = await guard.canActivate(makeContext('R-ANY', staAdmin));
    expect(checkRouteAccess).toHaveBeenCalledWith('R-ANY', staAdmin);
    expect(result).toBe(true);
  });

  it('propagates ForbiddenException for driver accessing wrong route', async () => {
    checkRouteAccess.mockRejectedValue(
      new ForbiddenException('You do not have access to this route'),
    );
    await expect(
      guard.canActivate(makeContext('R-WRONG', driver)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
