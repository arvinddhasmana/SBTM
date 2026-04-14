import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const createContext = (
    overrides: {
      method?: string;
      url?: string;
      requestId?: string;
      user?: { id?: string; schoolId?: string; role?: string };
      statusCode?: number;
    } = {},
  ) => {
    const { method = 'GET', url = '/test', requestId, user, statusCode = 200 } = overrides;
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          originalUrl: url,
          headers: { [CORRELATION_ID_HEADER]: requestId },
          user,
        }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    interceptor = new LoggingInterceptor('test-service');
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should log request details on successful response', (done) => {
    const ctx = createContext({ method: 'POST', url: '/api/v1/routes', requestId: 'req-123' });
    const next: CallHandler = { handle: () => of({ ok: true }) };

    interceptor.intercept(ctx, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            service: 'test-service',
            requestId: 'req-123',
            method: 'POST',
            path: '/api/v1/routes',
            statusCode: 200,
          }),
        );
        done();
      },
    });
  });

  it('should log error details on handler error', (done) => {
    const ctx = createContext({ method: 'GET', url: '/fail' });
    const next: CallHandler = {
      handle: () => throwError(() => ({ status: 404, message: 'Not found' })),
    };

    interceptor.intercept(ctx, next).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 404,
            error: 'Not found',
          }),
        );
        done();
      },
    });
  });

  it('should extract tenantId and userId from request.user', (done) => {
    const ctx = createContext({ user: { id: 'user-1', schoolId: 'school-1', role: 'ADMIN' } });
    const next: CallHandler = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({ tenantId: 'school-1', userId: 'user-1' }),
        );
        done();
      },
    });
  });

  it('should handle missing user gracefully (null tenantId/userId)', (done) => {
    const ctx = createContext({});
    const next: CallHandler = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({ tenantId: null, userId: null }),
        );
        done();
      },
    });
  });

  it('should use "unknown" when no correlation ID header', (done) => {
    const ctx = createContext({});
    const next: CallHandler = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'unknown' }));
        done();
      },
    });
  });

  it('should default to status 500 when error has no status', (done) => {
    const ctx = createContext({});
    const next: CallHandler = { handle: () => throwError(() => ({ message: 'oops' })) };

    interceptor.intercept(ctx, next).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
        done();
      },
    });
  });
});
