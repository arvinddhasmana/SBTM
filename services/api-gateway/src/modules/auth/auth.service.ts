import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    async validateUser(username: string, pass: string): Promise<any> {
        // In a real app, you'd check against a database or external auth service.
        // For MVP, we'll accept 'admin'/'admin', 'driver'/'driver', 'parent'/'parent'.
        if (username === 'admin' && pass === 'admin') {
            return { userId: 1, username: 'admin', roles: ['ADMIN'] };
        }
        if (username === 'driver' && pass === 'driver') {
            return { userId: 2, username: 'driver', roles: ['DRIVER'] };
        }
        if (username === 'parent' && pass === 'parent') {
            return { userId: 3, username: 'parent', roles: ['PARENT'] };
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.userId, roles: user.roles };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
