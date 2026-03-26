import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

interface ServiceTokenPayload {
  sub: string;
  iss: string;
}

/**
 * Guard that validates internal service-to-service JWTs on NestJS downstream services.
 * All inbound requests must carry a Bearer token signed with INTERNAL_SERVICE_SECRET
 * and issued by 'sbtm-internal'.
 *
 * Apply this guard at module level via APP_GUARD or per-controller.
 */
@Injectable()
export class InternalServiceAuthGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceAuthGuard.name);
  private readonly internalSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.internalSecret = this.configService.get<string>(
      'INTERNAL_SERVICE_SECRET',
      'dev_internal_secret',
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing internal service token');
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify<ServiceTokenPayload>(token, {
        secret: this.internalSecret,
        issuer: 'sbtm-internal',
      });

      // Attach service identity to request for downstream audit context
      (request as Request & { serviceId: string }).serviceId = payload.sub;
      return true;
    } catch (err) {
      this.logger.warn('Internal service token validation failed', {
        action: 'service.auth.failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
      throw new UnauthorizedException('Invalid internal service token');
    }
  }
}
