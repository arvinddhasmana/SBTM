import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';

/**
 * Extracts the JWT from (in order of priority):
 *   1. The `access_token` httpOnly cookie (web clients)
 *   2. The `Authorization: Bearer <token>` header (mobile / service clients)
 *   3. The `token` query parameter (SSE stream endpoint)
 */
function extractJwtFromRequestOrQuery(req: Request): string | null {
  // 1. Cookie (set by login endpoint for web clients)
  const cookieToken = req.cookies?.access_token;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  // 2. Authorization header (mobile apps / inter-service calls)
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 3. Query parameter (SSE – EventSource cannot send headers)
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequestOrQuery,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      anchorKind: user.anchorKind,
      anchorId: user.anchorId,
      preferredLanguage: user.preferredLanguage,
    };
  }
}
