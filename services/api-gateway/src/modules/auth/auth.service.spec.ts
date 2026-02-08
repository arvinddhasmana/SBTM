import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Role } from '../../common/decorators/roles.decorator';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;
    let jwtService: JwtService;

    const mockUser: Partial<User> = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: Role.PARENT,
        firstName: 'Test',
        lastName: 'User',
    };

    const mockRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn().mockReturnValue('test-token'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockRepository,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get<JwtService>(JwtService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('should return access token and user on successful login', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result.accessToken).toBe('test-token');
            expect(result.user.email).toBe('test@example.com');
            expect(jwtService.sign).toHaveBeenCalledWith({
                sub: 'user-123',
                email: 'test@example.com',
                role: Role.PARENT,
                schoolId: undefined,
                boardId: undefined,
            });
        });

        it('should throw UnauthorizedException for invalid email', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.login({ email: 'wrong@example.com', password: 'password123' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for invalid password', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.login({ email: 'test@example.com', password: 'wrongpassword' }),
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('validateUser', () => {
        it('should return user when found', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.validateUser({
                sub: 'user-123',
                email: 'test@example.com',
                role: 'PARENT',
            });

            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.validateUser({
                sub: 'unknown-user',
                email: 'unknown@example.com',
                role: 'PARENT',
            });

            expect(result).toBeNull();
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getProfile('user-123');

            expect(result.id).toBe('user-123');
            expect(result.email).toBe('test@example.com');
        });

        it('should throw UnauthorizedException when user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.getProfile('unknown-user')).rejects.toThrow(
                UnauthorizedException,
            );
        });
    });
});
