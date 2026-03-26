import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtValidatedUser {
    userId: string;
    email: string;
    role: string;
    schoolId?: string;
    boardId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'dev_secret',
        });
    }

    async validate(payload: {
        sub: string;
        email: string;
        role: string;
        schoolId?: string;
        boardId?: string;
    }): Promise<JwtValidatedUser> {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
            schoolId: payload.schoolId,
            boardId: payload.boardId,
        };
    }
}
