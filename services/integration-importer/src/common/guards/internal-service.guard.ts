import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Gates the importer HTTP surface to internal callers only. The expected client
 * is the admin-dashboard backend-for-frontend (with its own STA-Admin RBAC),
 * not browsers. When `INTERNAL_SERVICE_TOKEN` is unset the guard fails closed
 * so we never accidentally expose dry-run/commit endpoints in dev.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected) {
      throw new UnauthorizedException(
        'INTERNAL_SERVICE_TOKEN is not configured; importer endpoints are disabled',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header('x-internal-token') ?? req.header('X-Internal-Token');
    if (provided !== expected) {
      throw new UnauthorizedException('invalid internal service token');
    }
    return true;
  }
}
