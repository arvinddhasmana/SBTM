import { Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService implements OnModuleInit {
    constructor(
        private jwtService: JwtService,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        // Seed initial users on startup
        // Note: In production, use migrations or a dedicated seed script.
        try {
            const count = await this.usersRepository.count();
            if (count === 0) {
                console.log('Seeding initial users...');
                await this.usersRepository.save([
                    { username: 'admin', passwordOrHash: 'admin', roles: ['ADMIN'] },
                    { username: 'driver', passwordOrHash: 'driver', roles: ['DRIVER'] },
                    { username: 'parent', passwordOrHash: 'parent', roles: ['PARENT'] },
                ]);
                console.log('Seeding complete.');
            }
        } catch (e) {
            console.warn('Failed to seed users. Is DB connected? ' + e.message);
        }
    }

    async validateUser(username: string, pass: string): Promise<any> {
        try {
            const user = await this.usersRepository.findOne({ where: { username } });
            if (user && user.passwordOrHash === pass) {
                const { passwordOrHash, ...result } = user;
                return result;
            }
        } catch (e) {
            console.error('DB Error during validateUser: ' + e.message);
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id || user.userId, roles: user.roles };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
