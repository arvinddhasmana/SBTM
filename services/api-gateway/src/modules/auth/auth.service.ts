import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto, UserResponseDto } from './dto/user-response.dto';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
}

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto): Promise<LoginResponseDto> {
        const user = await this.userRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: this.toUserResponse(user),
        };
    }

    async validateUser(payload: JwtPayload): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id: payload.sub },
        });
    }

    async getProfile(userId: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return this.toUserResponse(user);
    }

    async createUser(
        email: string,
        password: string,
        role: string,
        additionalData?: Partial<User>,
    ): Promise<User> {
        const passwordHash = await bcrypt.hash(password, 10);

        const user = this.userRepository.create({
            email,
            passwordHash,
            role: role as User['role'],
            ...additionalData,
        });

        return this.userRepository.save(user);
    }

    private toUserResponse(user: User): UserResponseDto {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            driverId: user.driverId,
            childRouteIds: user.childRouteIds,
            assignedRouteIds: user.assignedRouteIds,
        };
    }
}
