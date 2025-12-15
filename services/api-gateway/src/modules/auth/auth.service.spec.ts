import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(() => 'mock_token'),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user for valid credentials', async () => {
            const result = await service.validateUser('admin', 'admin');
            expect(result).toEqual({ userId: 1, username: 'admin', roles: ['ADMIN'] });
        });

        it('should return null for invalid credentials', async () => {
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
