import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ServiceTokenService, ServiceTokenPayload } from './service-token.service';

const MOCK_SECRET = 'test_internal_secret';

describe('ServiceTokenService', () => {
    let service: ServiceTokenService;
    let jwtService: JwtService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ServiceTokenService,
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn(),
                        verify: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultVal: string) => {
                            if (key === 'INTERNAL_SERVICE_SECRET') return MOCK_SECRET;
                            if (key === 'SERVICE_IDENTITY') return 'api-gateway';
                            return defaultVal;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<ServiceTokenService>(ServiceTokenService);
        jwtService = module.get<JwtService>(JwtService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createServiceToken()', () => {
        it('should sign a JWT with the correct payload and options', () => {
            const mockToken = 'signed-jwt-token';
            (jwtService.sign as jest.Mock).mockReturnValue(mockToken);

            const token = service.createServiceToken();

            expect(token).toBe(mockToken);
            expect(jwtService.sign).toHaveBeenCalledWith(
                { sub: 'api-gateway', iss: 'sbtm-internal' },
                { secret: MOCK_SECRET, expiresIn: '5m' },
            );
        });

        it('should use SERVICE_IDENTITY from config for the sub claim', () => {
            (configService.get as jest.Mock).mockImplementation(
                (key: string, defaultVal: string) => {
                    if (key === 'SERVICE_IDENTITY') return 'custom-service';
                    if (key === 'INTERNAL_SERVICE_SECRET') return MOCK_SECRET;
                    return defaultVal;
                },
            );
            // Recreate service so constructor re-reads config
            const newService = new ServiceTokenService(
                jwtService as JwtService,
                configService as ConfigService,
            );
            (jwtService.sign as jest.Mock).mockReturnValue('token');

            newService.createServiceToken();

            expect(jwtService.sign).toHaveBeenCalledWith(
                expect.objectContaining({ sub: 'custom-service' }),
                expect.any(Object),
            );
        });
    });

    describe('verifyServiceToken()', () => {
        it('should return the payload for a valid token', () => {
            const payload: ServiceTokenPayload = {
                sub: 'api-gateway',
                iss: 'sbtm-internal',
            };
            (jwtService.verify as jest.Mock).mockReturnValue(payload);

            const result = service.verifyServiceToken('valid-token');

            expect(result).toEqual(payload);
            expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
                secret: MOCK_SECRET,
                issuer: 'sbtm-internal',
            });
        });

        it('should return null when the token is invalid', () => {
            (jwtService.verify as jest.Mock).mockImplementation(() => {
                throw new Error('invalid signature');
            });

            const result = service.verifyServiceToken('tampered-token');

            expect(result).toBeNull();
        });

        it('should return null when the token is expired', () => {
            (jwtService.verify as jest.Mock).mockImplementation(() => {
                const err = new Error('jwt expired');
                err.name = 'TokenExpiredError';
                throw err;
            });

            const result = service.verifyServiceToken('expired-token');

            expect(result).toBeNull();
        });
    });
});
