import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

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
  constructor(private readonly dataSource: DataSource) {}

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
}
