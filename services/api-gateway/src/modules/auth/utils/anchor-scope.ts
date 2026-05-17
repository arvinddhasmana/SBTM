import { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Pull the school-scope id off the authenticated user.
 *
 * In v2 the JWT carries `anchorKind`+`anchorId` rather than the legacy
 * `schoolId`/`boardId`/`driverId` fields. A SCHOOL_ADMIN (and an OIDC user
 * mapped to a single school) anchors at `kind='school'` and the anchor id
 * is the `stx_schools.id`. Every other anchor kind is broader (board / sta /
 * super / operator) or unrelated (driver / parent) and does not project
 * straight to a single schoolId — those callsites must derive scope through
 * a join or explicit query param, not this helper.
 *
 * Returns `null` when no school is in scope so callers can decide between
 * "broaden the query" and "throw Forbidden".
 */
export function schoolIdFromAnchor(
  user: Pick<AuthenticatedUser, 'anchorKind' | 'anchorId'> | null | undefined,
): string | null {
  if (!user) return null;
  if (user.anchorKind === 'school' && user.anchorId) return user.anchorId;
  return null;
}

/**
 * Pull the board-scope id off the authenticated user, mirroring schoolIdFromAnchor.
 * BOARD_ADMIN anchors at `kind='board'`; other kinds do not yield a board id directly.
 */
export function boardIdFromAnchor(
  user: Pick<AuthenticatedUser, 'anchorKind' | 'anchorId'> | null | undefined,
): string | null {
  if (!user) return null;
  if (user.anchorKind === 'board' && user.anchorId) return user.anchorId;
  return null;
}
