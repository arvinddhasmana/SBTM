import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';
import { RequestContextService } from '../services/request-context.service';

/**
 * Populates `RequestContextService` with `req.user` for the lifetime of each
 * HTTP request. Runs as a global interceptor after the JWT guard has resolved
 * the user, so downstream services can call `rlsContext.runAsCurrent()` without
 * threading `req.user` through their signatures.
 *
 * Unauthenticated routes (login, health) flow through with `user = null`; in
 * that case `runAsCurrent()` will throw, which is the desired safety net —
 * accidental tenant-scoped queries from an unauth path become loud errors
 * rather than silent full-table scans.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly ctx: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req?.user ?? null;
    return new Observable((subscriber) => {
      this.ctx.runWith(user, () => {
        const sub = next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
        return () => sub.unsubscribe();
      });
    });
  }
}
