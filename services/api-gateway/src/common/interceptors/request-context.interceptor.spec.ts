import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { Role } from '@sbtm/common';
import { RequestContextInterceptor } from './request-context.interceptor';
import { RequestContextService } from '../services/request-context.service';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

const user: AuthenticatedUser = {
  id: 'u1',
  email: 'u1@example.com',
  role: Role.STA_ADMIN,
  anchorKind: 'sta',
  anchorId: 'sta-1',
  preferredLanguage: 'en',
};

function mockCtx(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('RequestContextInterceptor', () => {
  let ctxSvc: RequestContextService;
  let interceptor: RequestContextInterceptor;

  beforeEach(() => {
    ctxSvc = new RequestContextService();
    interceptor = new RequestContextInterceptor(ctxSvc);
  });

  it('exposes req.user via RequestContextService inside the handler', async () => {
    let seen: AuthenticatedUser | null = null;
    const next: CallHandler = {
      handle: () => {
        seen = ctxSvc.getUser();
        return of('ok');
      },
    };
    const out = await lastValueFrom(
      interceptor.intercept(mockCtx({ user }), next),
    );
    expect(out).toBe('ok');
    expect(seen).toEqual(user);
  });

  it('exposes null user when req.user is absent (unauth route)', async () => {
    let seen: AuthenticatedUser | null = user;
    const next: CallHandler = {
      handle: () => {
        seen = ctxSvc.getUser();
        return of(null);
      },
    };
    await lastValueFrom(interceptor.intercept(mockCtx({}), next));
    expect(seen).toBeNull();
  });

  it('clears the scope after the response stream completes', async () => {
    const next: CallHandler = { handle: () => of(1) };
    await lastValueFrom(interceptor.intercept(mockCtx({ user }), next));
    expect(ctxSvc.getUser()).toBeNull();
  });

  it('propagates handler errors without leaking scope', async () => {
    const boom = new Error('boom');
    const next: CallHandler = { handle: () => throwError(() => boom) };
    await expect(
      lastValueFrom(interceptor.intercept(mockCtx({ user }), next)),
    ).rejects.toBe(boom);
    expect(ctxSvc.getUser()).toBeNull();
  });

  it('handles a missing request object defensively', async () => {
    let seen: AuthenticatedUser | null = user;
    const next: CallHandler = {
      handle: () => {
        seen = ctxSvc.getUser();
        return of('ok');
      },
    };
    await lastValueFrom(interceptor.intercept(mockCtx(null), next));
    expect(seen).toBeNull();
  });
});
