import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

interface RequestContextStore {
  user: AuthenticatedUser | null;
}

/**
 * Request-scoped storage for the authenticated user, backed by Node's
 * AsyncLocalStorage. Populated by `RequestContextInterceptor` on every HTTP
 * request and consumed by `RlsContextService.runAsCurrent()` so services can
 * scope queries to the caller without threading `req.user` through every layer.
 *
 * Returns `null` outside a `runWith()` scope (e.g. bootstrap, background jobs).
 */
@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContextStore>();

  runWith<T>(user: AuthenticatedUser | null, fn: () => T): T {
    return this.als.run({ user }, fn);
  }

  getUser(): AuthenticatedUser | null {
    return this.als.getStore()?.user ?? null;
  }
}
