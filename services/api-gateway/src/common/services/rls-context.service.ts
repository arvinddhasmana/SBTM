import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RequestContextService } from './request-context.service';

export type AnchorKind =
  | 'super'
  | 'sta'
  | 'board'
  | 'school'
  | 'operator'
  | 'driver'
  | 'parent';

export interface UserAnchor {
  anchorKind: AnchorKind | null;
  anchorId: string | null;
}

/**
 * Per-request RLS context for the v2 schema.
 *
 * The Postgres RLS policies in migration 20260518_v2_cutover.sql read two GUCs:
 *   - sbtm.user_anchor_kind ('super' | 'sta' | 'board' | 'school' | 'operator' | ...)
 *   - sbtm.user_anchor_id   (UUID, ignored when kind='super')
 *
 * These must be `SET LOCAL` inside a transaction so they scope to the connection
 * for the duration of the query and reset on commit/rollback. Calling SET without
 * LOCAL would leak the value across pooled connections.
 *
 * Usage:
 *   await rlsContext.runAs(user, async (tx) => {
 *     return tx.getRepository(Board).find({ where: { ... } });
 *   });
 *
 * Admin policies (super/sta/board/school/operator) are enforced by RLS at the DB
 * layer. Driver and Parent are enforced at the application layer via IN(...) filters
 * on the run/student IDs they can access — RLS policies for those roles are
 * intentionally NOT created. See DataModel-v2.md §6.
 */
@Injectable()
export class RlsContextService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly requestContext: RequestContextService,
  ) {}

  /**
   * Run `fn` inside a transaction with sbtm.user_anchor_kind/id set for RLS.
   * Pass `null`/`null` to run with no anchor — only useful for SUPER_ADMIN or system jobs.
   */
  async runAs<T>(
    anchor: UserAnchor,
    fn: (tx: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (tx) => {
      const kind = anchor.anchorKind ?? 'super';
      const id = anchor.anchorId ?? '';
      await tx.query(`SET LOCAL sbtm.user_anchor_kind = $1`, [kind]);
      await tx.query(`SET LOCAL sbtm.user_anchor_id = $1`, [id]);
      return fn(tx);
    });
  }

  /**
   * Run `fn` under the anchor of the currently authenticated request user
   * (populated by `RequestContextInterceptor`). Throws if called outside an
   * authenticated request scope — this is intentional: a missing user is
   * almost always a bug (forgotten guard, background job, unauth route) and
   * silently scoping to 'super' would leak data across tenants.
   */
  async runAsCurrent<T>(fn: (tx: EntityManager) => Promise<T>): Promise<T> {
    const user = this.requestContext.getUser();
    if (!user) {
      throw new Error(
        'RlsContextService.runAsCurrent() called outside an authenticated request scope. ' +
          'Use runAs() explicitly for system jobs or unauth paths.',
      );
    }
    return this.runAs(
      { anchorKind: user.anchorKind, anchorId: user.anchorId },
      fn,
    );
  }
}
