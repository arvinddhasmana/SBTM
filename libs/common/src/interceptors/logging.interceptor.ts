import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';

interface AuthenticatedRequest extends Request {
  user?: { id?: string; userId?: string; schoolId?: string; role?: string };
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly serviceName: string;

  constructor(serviceName = 'unknown') {
    this.serviceName = serviceName;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<AuthenticatedRequest>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    const { method, originalUrl } = request;
    const requestId = (request.headers[CORRELATION_ID_HEADER] as string) ?? 'unknown';
    const tenantId = request.user?.schoolId ?? null;
    const userId = request.user?.id ?? request.user?.userId ?? null;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              level: 'info',
              timestamp: new Date().toISOString(),
              service: this.serviceName,
              requestId,
              tenantId,
              userId,
              method,
              path: originalUrl,
              statusCode: response.statusCode,
              durationMs: Date.now() - startTime,
            }),
          );
        },
        error: (error: { status?: number; message?: string }) => {
          this.logger.error(
            JSON.stringify({
              level: 'error',
              timestamp: new Date().toISOString(),
              service: this.serviceName,
              requestId,
              tenantId,
              userId,
              method,
              path: originalUrl,
              statusCode: error?.status ?? 500,
              durationMs: Date.now() - startTime,
              error: error?.message ?? 'Unknown error',
            }),
          );
        },
      }),
    );
  }
}
