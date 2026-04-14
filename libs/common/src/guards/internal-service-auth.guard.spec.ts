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
    configService = { get: jest.fn().mockReturnValue('test_internal_secret') };

    guard = new InternalServiceAuthGuard(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true and attach serviceId when token is valid', () => {
    jwtService.verify.mockReturnValue({
      sub: 'api-gateway',
      iss: 'sbtm-internal',
    } as never);

    const mockReq = { headers: { authorization: 'Bearer valid.jwt.token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => mockReq }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect((mockReq as Record<string, unknown>)['serviceId']).toBe('api-gateway');
  });

  it('should throw UnauthorizedException when Authorization header is missing', () => {
    expect(() => guard.canActivate(createMockContext(undefined))).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when Authorization header does not start with Bearer', () => {
    expect(() => guard.canActivate(createMockContext('Basic dXNlcjpwYXNz'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when token verification fails', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    expect(() => guard.canActivate(createMockContext('Bearer bad.token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when token is expired', () => {
    jwtService.verify.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });
    expect(() => guard.canActivate(createMockContext('Bearer expired.token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('should verify with INTERNAL_SERVICE_SECRET from config and sbtm-internal issuer', () => {
    jwtService.verify.mockReturnValue({ sub: 'gps-tracking', iss: 'sbtm-internal' } as never);
    guard.canActivate(createMockContext('Bearer valid.jwt.token'));

    expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token', {
      secret: 'test_internal_secret',
      issuer: 'sbtm-internal',
    });
  });

  it('should throw when empty bearer token is provided', () => {
    expect(() => guard.canActivate(createMockContext('Bearer '))).toThrow(UnauthorizedException);
  });

  it('should use default secret when INTERNAL_SERVICE_SECRET is not configured', () => {
    const defaultConfigService = {
      get: jest.fn().mockReturnValue('dev_internal_secret'),
    } as unknown as jest.Mocked<ConfigService>;

    const guardWithDefault = new InternalServiceAuthGuard(
      jwtService as unknown as JwtService,
      defaultConfigService,
    );

    jwtService.verify.mockReturnValue({ sub: 'test-service', iss: 'sbtm-internal' } as never);
    guardWithDefault.canActivate(createMockContext('Bearer a.b.c'));

    expect(jwtService.verify).toHaveBeenCalledWith('a.b.c', {
      secret: 'dev_internal_secret',
      issuer: 'sbtm-internal',
    });
  });
});
