import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InternalServiceAuthGuard } from './internal-service-auth.guard';

describe('InternalServiceAuthGuard', () => {
    let guard: InternalServiceAuthGuard;
    let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
    let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

    const createMockContext = (authHeader?: string): ExecutionContext => {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ headers: { authorization: authHeader } }),
            }),
        } as unknown as ExecutionContext;
    };

    beforeEach(() => {
        jwtService = { verify: jest.fn() };
        configService = {
            get: jest.fn().mockReturnValue('test_internal_secret'),
        };

        guard = new InternalServiceAuthGuard(
            jwtService as unknown as JwtService,
            configService as unknown as ConfigService,
        );
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should return true and attach serviceId when token is valid', () => {
        (jwtService.verify as jest.Mock).mockReturnValue({
            sub: 'api-gateway',
            iss: 'sbtm-internal',
        });

        const mockReq = { headers: { authorization: 'Bearer valid.jwt.token' } };
        const context = {
            switchToHttp: () => ({ getRequest: () => mockReq }),
        } as unknown as ExecutionContext;

        const result = guard.canActivate(context);

        expect(result).toBe(true);
        expect((mockReq as Record<string, unknown>)['serviceId']).toBe('api-gateway');
    });

    it('should throw UnauthorizedException when Authorization header is missing', () => {
        const context = createMockContext(undefined);
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Authorization header does not start with Bearer', () => {
        const context = createMockContext('Basic dXNlcjpwYXNz');
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token verification fails', () => {
        (jwtService.verify as jest.Mock).mockImplementation(() => {
            throw new Error('invalid signature');
        });

        const context = createMockContext('Bearer bad.jwt.token');
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', () => {
        (jwtService.verify as jest.Mock).mockImplementation(() => {
            const err = new Error('jwt expired');
            err.name = 'TokenExpiredError';
            throw err;
        });

        const context = createMockContext('Bearer expired.jwt.token');
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should verify with INTERNAL_SERVICE_SECRET from config and sbtm-internal issuer', () => {
        (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'api-gateway', iss: 'sbtm-internal' });
        const context = createMockContext('Bearer valid.jwt.token');

        guard.canActivate(context);

        expect(jwtService.verify).toHaveBeenCalledWith(
            'valid.jwt.token',
            { secret: 'test_internal_secret', issuer: 'sbtm-internal' },
        );
    });
});
