import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        const startTime = Date.now();

        const { method, originalUrl, ip } = request;
        const userAgent = request.get('user-agent') || '';

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    const { statusCode } = response;
                    console.log(
                        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip} - ${userAgent}`,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error?.status || 500;
                    console.error(
                        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip} - ${userAgent} - Error: ${error?.message}`,
                    );
                },
            }),
        );
    }
}
