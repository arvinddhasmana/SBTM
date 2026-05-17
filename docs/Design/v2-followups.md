# SBTM v2 — Phase B Follow-up Tracker

Open work items deferred from the aggressive cutover (commits 497497c Phase A, 39453d2 Phase B). Each item lists where it lives, the symptom that will surface if it goes unaddressed, and the rough size.

## High priority (blocks runtime correctness)

### 1. `req.user` typed as `any` in gateway services — runtime-broken anchor reads

- **Where**: ~24 callsites across `services/api-gateway/src/modules/gateway/services/*.ts` reading `req.user.schoolId`, `req.user.boardId`, `req.user.driverId`, `req.user.childRouteIds`, `req.user.assignedRouteIds`.
- **Symptom**: code compiles (TS thinks `req.user` is `any`) but at runtime returns `undefined` for those fields → scoped queries return empty / forbidden.
- **Fix**: introduce `AuthenticatedRequest` type with `user: { id, role, anchorKind, anchorId, preferredLanguage }`; replace `req.user.schoolId` → derived helper that maps `anchorKind`+`anchorId` to the appropriate scope. Per-service migration.
- **Status**: partial — shared `AuthenticatedUser` type landed at `services/api-gateway/src/modules/auth/types/authenticated-user.ts` and wired into `JwtStrategy.validate()`. Per-service callsite migration is folded into item #2 (each 501 stub rewrite drops its local `RequestUser` interface and switches reads to anchor helpers).
- **Size**: ~1–2 days. Should land before Phase C importer integrates so the importer's RBAC compiles against the real shape.

### 2. 501 stubs in api-gateway gateway services

- **Where**: `RouteService.create/update`, `FleetAssignmentGatewayService.*`, `DriverGatewayService.schedule/roster`, `DocumentController.*`, `AbsenceGatewayService.*`, `parent.gateway.service.parent-history`.
- **Symptom**: endpoints throw `NotImplementedException` at runtime. UIs hitting them show "501 Not Implemented".
- **Fix**: rewrite each against the v2 entities (`stx_runs`, `stx_ridership`, `stx_student_absences`, `trips`+`stop_times`+`shapes`). Several need design decisions first: run proposals model, trip exception model, driver→run resolver, parent alert audience resolver.
- **Size**: Each is 0.5–2 days. Will be partly absorbed by Phase C (importer writes the same tables).

### 3. RLS context not wired into gateway services

- **Where**: `services/api-gateway/src/common/services/rls-context.service.ts` exists but no service calls `rlsContext.runAs(...)`.
- **Symptom**: Postgres RLS policies fire with `current_setting('sbtm.user_anchor_kind', true)` returning empty string → all admin-tier policies deny. Queries return zero rows even for legitimate admins.
- **Fix**: wrap each gateway service entry point (or add a NestJS interceptor) that pulls `req.user.anchorKind` / `anchorId` and runs the handler inside `rlsContext.runAs(user, ...)`. Driver and Parent paths additionally need an app-layer `IN(...)` filter on the accessible run / student IDs.
- **Size**: 1–2 days for the interceptor; per-service migration to use the tx-scoped `EntityManager` rather than module repositories is incremental.

## Medium priority (test/coverage debt)

### 4. 11 archived `.v1bak` specs needing rewrite for v2 anchor model

- **Where** (api-gateway):
  - `src/modules/auth/provisioning.service.spec.ts.v1bak`
  - `src/modules/fleet/fleet.service.spec.ts.v1bak`
  - `src/modules/route/route.service.spec.ts.v1bak`
  - `src/modules/organization/school-board.service.spec.ts.v1bak`
  - `src/modules/organization/school.service.spec.ts.v1bak`
  - `src/modules/gateway/services/{absence,driver,fleet-assignment,organization,parent,parent-status}.gateway.service.spec.ts.v1bak`
- **Where** (notification-service):
  - `src/modules/preferences/preferences.service.spec.ts.v1bak`
  - `src/modules/router/notification-router.service.spec.ts.v1bak`
- **Symptom**: coverage gap — these services have no unit tests.
- **Fix**: rewrite using v2 fixtures (`anchorKind`/`anchorId` user shapes, new entity column names). Each file has a top-of-file TODO listing the v1 assertions that need new equivalents.
- **Size**: 0.5–1 day per file.

### 5. PostGIS column types stubbed as `text`

- **Where**: `stx_schools.location`, `stx_students.home_location`, `stx_boarding_events.location` — entity files have `// TODO(phase-B): wire PostGIS column type — geography(Point, 4326)`.
- **Symptom**: TypeORM treats them as strings. Spatial queries via repository methods won't work; raw SQL still does.
- **Fix**: install `typeorm-postgis` or use `@Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })` once the TypeORM version supports it cleanly. Add a custom transformer if needed.
- **Size**: 0.5 day.

### 6. `DeviceToken.userId` FK re-key to v2 users

- **Where**: `services/notification-service/src/modules/tokens/entities/device-token.entity.ts`.
- **Symptom**: orphaned device tokens if a v2 user is deleted (no cascade).
- **Fix**: add explicit FK + `ON DELETE CASCADE` migration once the cross-service user FK shape is settled.
- **Size**: 0.5 day.

### 7. Internal-service guard replacing the removed `Role.SYSTEM`

- **Where**: `video.controller.ts` and any other handler with `// TODO(phase-B): replace with internal-service guard`.
- **Symptom**: handlers that previously accepted service-to-service calls via `Role.SYSTEM` now reject them.
- **Fix**: add `@InternalService()` decorator + guard that validates the existing `INTERNAL_SERVICE_SECRET` JWT (already wired in `ServiceTokenService`).
- **Size**: 0.5 day.

## Low priority (cosmetic / docs)

### 8. Frontend apps + locales (Phase D)

- **Where**: `apps/admin-dashboard`, `apps/parent-dashboard`, `apps/parent-app-mobile`, `apps/driver-app`, plus all `**/locales/*.json` referencing "OSTA Admin".
- **Symptom**: apps reference deleted `Role.OSTA_ADMIN`, expect old user shape (schoolId/boardId), and show stale UI strings.
- **Fix**: full Phase D cutover per plan.
- **Size**: 1–2 weeks for the four apps end-to-end.

### 9. Docs alignment (Phase F)

- **Where**: `docs/Design/SchemaAudit-And-Migration.md` (still describes dual-write), `docs/Design/DataModel-v2.md` §10 (still mentions OSTA Admin alias), various PRDs.
- **Symptom**: documentation drift from code.
- **Fix**: per plan Phase F.
- **Size**: 1 day.

## How to use this file

- When work starts on an item, add `**Status**: in progress (owner: …, branch: …)` under it.
- When complete, move the item to a "Done" section at the bottom and link the commit.
- New gaps discovered during Phase C–F implementation should be appended here, not lost.
