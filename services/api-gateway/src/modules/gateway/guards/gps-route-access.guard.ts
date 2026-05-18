import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GpsGatewayService } from '../services/gps.gateway.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';

/**
 * Guard that enforces per-route access control for GPS endpoints.
 *
 * Must run AFTER JwtAuthGuard (so req.user is populated) and AFTER RolesGuard.
 * Applied only to routes that expose a :routeId param requiring tenant/ownership
 * checks — most critically the SSE streaming endpoint, where throwing an
 * exception inside the controller body cannot reliably produce a 403 because
 * NestJS commits the `text/event-stream` response headers before the route
 * handler executes.
 *
 * Delegates to GpsGatewayService.checkRouteAccess() which throws
 * ForbiddenException for unauthorised access. Guards run before response
 * headers are committed, so the exception propagates as a proper HTTP 403.
 */
@Injectable()
export class GpsRouteAccessGuard implements CanActivate {
  constructor(private readonly gpsGatewayService: GpsGatewayService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
      params: Record<string, string>;
    }>();
    const routeId: string | undefined = request.params?.routeId;

    if (!routeId) {
      return true;
    }

    // checkRouteAccess throws ForbiddenException for unauthorised callers.
    // The exception propagates naturally; returning true is only reached when
    // access is permitted.
    await this.gpsGatewayService.checkRouteAccess(routeId, request.user);
    return true;
  }
}
