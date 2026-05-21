import { DataSource, EntityManager } from 'typeorm';
import { Role } from '@sbtm/common';
import { RequestContextService } from './request-context.service';
import { RlsContextService } from './rls-context.service';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

const user: AuthenticatedUser = {
  id: 'u1',
  email: 'u1@example.com',
  role: Role.BOARD_ADMIN,
  anchorKind: 'board',
  anchorId: 'board-7',
  preferredLanguage: 'en',
};

function makeDataSource(): {
  ds: DataSource;
  queries: Array<{ sql: string; params?: unknown[] }>;
} {
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  const tx = {
    query: async (sql: string, params?: unknown[]) => {
      queries.push({ sql, params });
      return [];
    },
  } as unknown as EntityManager;
  const ds = {
    transaction: async <T>(fn: (m: EntityManager) => Promise<T>) => fn(tx),
  } as unknown as DataSource;
  return { ds, queries };
}

describe('RlsContextService', () => {
  describe('runAs', () => {
    it('sets sbtm.user_anchor_kind/id via set_config', async () => {
      const { ds, queries } = makeDataSource();
      const svc = new RlsContextService(ds, new RequestContextService());
      const out = await svc.runAs(
        { anchorKind: 'sta', anchorId: 'sta-1' },
        async () => 42,
      );
      expect(out).toBe(42);
      expect(queries).toEqual([
        {
          sql: `SELECT set_config('sbtm.user_anchor_kind', $1, true)`,
          params: ['sta'],
        },
        {
          sql: `SELECT set_config('sbtm.user_anchor_id', $1, true)`,
          params: ['sta-1'],
        },
      ]);
    });

    it('defaults a null anchor to super with sentinel UUID id', async () => {
      const { ds, queries } = makeDataSource();
      const svc = new RlsContextService(ds, new RequestContextService());
      await svc.runAs({ anchorKind: null, anchorId: null }, async () => null);
      expect(queries[0].params).toEqual(['super']);
      expect(queries[1].params).toEqual([
        '00000000-0000-0000-0000-000000000000',
      ]);
    });
  });

  describe('runAsCurrent', () => {
    it('uses the user from RequestContextService', async () => {
      const { ds, queries } = makeDataSource();
      const ctx = new RequestContextService();
      const svc = new RlsContextService(ds, ctx);
      const out = await ctx.runWith(user, () =>
        svc.runAsCurrent(async () => 'done'),
      );
      expect(out).toBe('done');
      expect(queries[0].params).toEqual(['board']);
      expect(queries[1].params).toEqual(['board-7']);
    });

    it('throws outside a request scope', async () => {
      const { ds } = makeDataSource();
      const svc = new RlsContextService(ds, new RequestContextService());
      await expect(svc.runAsCurrent(async () => 1)).rejects.toThrow(
        /outside an authenticated request scope/,
      );
    });
  });
});
