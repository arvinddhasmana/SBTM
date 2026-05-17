import { Role } from '@sbtm/common';
import { AnchorKind } from '../entities/user.entity';

/**
 * Shape of `req.user` after JWT auth in the v2 anchor model.
 *
 * Resolution path: JwtStrategy.validate() loads the `users` row and projects
 * it to this shape. Downstream services use `anchorKind`+`anchorId` to scope
 * queries instead of the legacy `schoolId`/`boardId`/`driverId` fields, which
 * were dropped in the Phase A migration (20260518_v2_cutover.sql).
 *
 * For DRIVER and PARENT, `anchorId` points at the `stx_drivers.id` /
 * `users.id` row respectively; the set of accessible runs/students is resolved
 * at query time, not stored on the JWT.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  anchorKind: AnchorKind | null;
  anchorId: string | null;
  preferredLanguage: string;
}
