import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GpsRouteAccessGuard } from './gps-route-access.guard';
import { GpsGatewayService } from '../services/gps.gateway.service';
import { Role } from '@sbtm/common';

const makeContext = (
  routeId: string | undefined,
  user: object,
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
    checkRouteAccess = jest.fn();
    guard = new GpsRouteAccessGuard({
      checkRouteAccess,
    } as unknown as GpsGatewayService);
  });

  it('should return true when checkRouteAccess passes', () => {
    const user = { role: Role.PARENT, childRouteIds: ['ROUTE-SingleBus-AM'] };
    const result = guard.canActivate(makeContext('ROUTE-SingleBus-AM', user));
    expect(checkRouteAccess).toHaveBeenCalledWith('ROUTE-SingleBus-AM', user);
    expect(result).toBe(true);
  });

  it('should propagate ForbiddenException from checkRouteAccess', () => {
    const user = { role: Role.PARENT, childRouteIds: ['ROUTE-SingleBus-AM'] };
    checkRouteAccess.mockImplementation(() => {
      throw new ForbiddenException('You do not have access to this route');
    });
    expect(() =>
      guard.canActivate(makeContext('ROUTE-NOT-MINE', user)),
    ).toThrow(ForbiddenException);
  });

  it('should return true and skip check when no routeId param', () => {
    const user = { role: Role.PARENT, childRouteIds: [] };
    const result = guard.canActivate(makeContext(undefined, user));
    expect(checkRouteAccess).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should return true for admin users (via checkRouteAccess passthrough)', () => {
    const user = { role: Role.STA_ADMIN };
    // checkRouteAccess does not throw for admins
    const result = guard.canActivate(makeContext('ROUTE-ANY', user));
    expect(checkRouteAccess).toHaveBeenCalledWith('ROUTE-ANY', user);
    expect(result).toBe(true);
  });

  it('should propagate ForbiddenException for driver accessing wrong route', () => {
    const user = {
      role: Role.DRIVER,
      assignedRouteIds: ['ROUTE-SingleBus-AM'],
    };
    checkRouteAccess.mockImplementation(() => {
      throw new ForbiddenException('You do not have access to this route');
    });
    expect(() => guard.canActivate(makeContext('ROUTE-WRONG', user))).toThrow(
      ForbiddenException,
    );
  });
});
