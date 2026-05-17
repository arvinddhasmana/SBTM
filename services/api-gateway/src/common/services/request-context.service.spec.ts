import { RequestContextService } from './request-context.service';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';
import { Role } from '@sbtm/common';

const u = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'u1',
  email: 'u1@example.com',
  role: Role.STA_ADMIN,
  anchorKind: 'sta',
  anchorId: 'sta-1',
  preferredLanguage: 'en',
  ...overrides,
});

describe('RequestContextService', () => {
  let svc: RequestContextService;

  beforeEach(() => {
    svc = new RequestContextService();
  });

  it('returns null outside a runWith scope', () => {
    expect(svc.getUser()).toBeNull();
  });

  it('exposes the user inside runWith', () => {
    const user = u();
    const seen = svc.runWith(user, () => svc.getUser());
    expect(seen).toBe(user);
  });

  it('returns null again after runWith returns', () => {
    svc.runWith(u(), () => svc.getUser());
    expect(svc.getUser()).toBeNull();
  });

  it('isolates nested scopes', () => {
    const outer = u({ id: 'outer', anchorId: 'sta-A' });
    const inner = u({ id: 'inner', anchorId: 'sta-B' });
    const result = svc.runWith(outer, () => {
      const before = svc.getUser()?.id;
      const innerSeen = svc.runWith(inner, () => svc.getUser()?.id);
      const after = svc.getUser()?.id;
      return { before, innerSeen, after };
    });
    expect(result).toEqual({
      before: 'outer',
      innerSeen: 'inner',
      after: 'outer',
    });
  });

  it('isolates concurrent async scopes', async () => {
    const a = u({ id: 'A', anchorId: 'sta-A' });
    const b = u({ id: 'B', anchorId: 'sta-B' });
    const [seenA, seenB] = await Promise.all([
      svc.runWith(a, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return svc.getUser()?.id;
      }),
      svc.runWith(b, async () => {
        await new Promise((r) => setTimeout(r, 1));
        return svc.getUser()?.id;
      }),
    ]);
    expect(seenA).toBe('A');
    expect(seenB).toBe('B');
  });

  it('accepts null user (unauth scope)', () => {
    const seen = svc.runWith(null, () => svc.getUser());
    expect(seen).toBeNull();
  });
});
