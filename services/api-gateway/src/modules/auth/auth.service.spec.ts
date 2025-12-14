import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';

describe('AuthService', () => {
    let service: AuthService;
    let repoSpy: any;

    beforeEach(async () => {
        repoSpy = {
            count: jest.fn().mockResolvedValue(1), // Assume already seeded
            save: jest.fn(),
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(() => 'mock_token'),
                    },
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: repoSpy,
                }
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user for valid credentials', async () => {
            repoSpy.findOne.mockResolvedValue({ id: 1, username: 'admin', passwordOrHash: 'admin', roles: ['ADMIN'] });

            const result = await service.validateUser('admin', 'admin');
            expect(result).toEqual({ id: 1, username: 'admin', roles: ['ADMIN'] });
        });

        it('should return null for invalid credentials', async () => {
            repoSpy.findOne.mockResolvedValue(null);
            const result = await service.validateUser('admin', 'wrong');
            expect(result).toBeNull();
        });
    });

    describe('login', () => {
        it('should return access_token', async () => {
            const result = await service.login({ username: 'admin', userId: 1, roles: ['ADMIN'] });
            expect(result).toEqual({ access_token: 'mock_token' });
        });
    });
});
