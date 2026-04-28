import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface ServiceTokenPayload {
  sub: string;
  iss: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class ServiceTokenService {
  private readonly serviceIdentity: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.serviceIdentity = this.configService.get<string>(
      'SERVICE_IDENTITY',
      'api-gateway',
    );
  }

  /**
   * Create a short-lived JWT for internal service-to-service calls.
   * The token is signed with INTERNAL_SERVICE_SECRET (separate from user JWT_SECRET).
   */
  createServiceToken(): string {
    const payload: ServiceTokenPayload = {
      sub: this.serviceIdentity,
      iss: 'sbtm-internal',
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('INTERNAL_SERVICE_SECRET'),
      expiresIn: '5m',
    });
  }

  /**
   * Validate a service token from a downstream service callback.
   * Returns the payload if valid, null if invalid.
   */
  verifyServiceToken(token: string): ServiceTokenPayload | null {
    try {
      return this.jwtService.verify<ServiceTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>(
          'INTERNAL_SERVICE_SECRET',
        ),
        issuer: 'sbtm-internal',
      });
    } catch {
      return null;
    }
  }
}
