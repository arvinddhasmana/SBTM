import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';

/**
 * Extracts the JWT from the Authorization header (Bearer) or from the
 * `token` query parameter. The query parameter path is used exclusively
 * by the SSE stream endpoint, because EventSource does not support
 * custom request headers.
 */
function extractJwtFromRequestOrQuery(req: Request): string | null {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
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
            secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
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
            driverId: user.driverId,
            childRouteIds: user.childRouteIds,
            assignedRouteIds: user.assignedRouteIds,
            schoolId: user.schoolId,
            boardId: user.boardId,
        };
    }
}
