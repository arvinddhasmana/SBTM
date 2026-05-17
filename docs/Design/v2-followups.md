# SBTM v2 — Phase B Follow-up Tracker

Open work items deferred from the aggressive cutover (commits 497497c Phase A, 39453d2 Phase B). Each item lists where it lives, the symptom that will surface if it goes unaddressed, and the rough size.

## High priority (blocks runtime correctness)

### 1. `req.user` typed as `any` in gateway services — runtime-broken anchor reads

- **Where**: ~24 callsites across `services/api-gateway/src/modules/gateway/services/*.ts` reading `req.user.schoolId`, `req.user.boardId`, `req.user.driverId`, `req.user.childRouteIds`, `req.user.assignedRouteIds`.
- **Symptom**: code compiles (TS thinks `req.user` is `any`) but at runtime returns `undefined` for those fields → scoped queries return empty / forbidden.
- **Fix**: introduce `AuthenticatedRequest` type with `user: { id, role, anchorKind, anchorId, preferredLanguage }`; replace `req.user.schoolId` → derived helper that maps `anchorKind`+`anchorId` to the appropriate scope. Per-service migration.
- **Status**: partial — shared `AuthenticatedUser` type landed at `services/api-gateway/src/modules/auth/types/authenticated-user.ts` and wired into `JwtStrategy.validate()`. Controller migrations done so far: `video.controller.ts`, `organization.controller.ts`, `absence.controller.ts`, `fleet-assignment.controller.ts`, `provisioning.controller.ts`, `alerts.controller.ts`, `school.controller.ts`, `system-settings.controller.ts` (drop local v1-shaped `AuthenticatedRequest`, switch to `{ user: AuthenticatedUser }`, scope reads off `anchorKind`+`anchorId`). `MultiTenancyGuard` also migrated to anchor reads. Still v1-shaped: `notification-settings.controller.ts` (parent `user.schoolId` reads — blocked on parent-multi-school design + downstream `notification-service` rewrite per #6). Per-service callsite migration is folded into item #2 (each 501 stub rewrite drops its local `RequestUser` interface and switches reads to anchor helpers).
- **Size**: ~1–2 days. Should land before Phase C importer integrates so the importer's RBAC compiles against the real shape.

### 2. 501 stubs in api-gateway gateway services

- **Where**: `RouteService.create/update`, `FleetAssignmentGatewayService.*`, `DriverGatewayService.schedule/roster`, `DocumentController.*`, `AbsenceGatewayService.*`, `parent.gateway.service.parent-history`.
- **Symptom**: endpoints throw `NotImplementedException` at runtime. UIs hitting them show "501 Not Implemented".
- **Status**: in progress on `feat/sbtm-refocus-data-model`. `DriverGatewayService.getScheduleForDriver` is wired against `stx_runs` + GTFS (`trips`/`routes`/`stop_times`/`stx_schools`) inside `rlsContext.runAsCurrent`; serves as the worked example for the remaining stubs. `DriverGatewayService.getRouteStudents` and the rest still 501 pending the student↔stop assignment model and per-stub design.
- **Fix**: rewrite each against the v2 entities (`stx_runs`, `stx_ridership`, `stx_student_absences`, `trips`+`stop_times`+`shapes`). Several need design decisions first: run proposals model, trip exception model, driver→run resolver, parent alert audience resolver.
- **Size**: Each is 0.5–2 days. Will be partly absorbed by Phase C (importer writes the same tables).

### 3. RLS context not wired into gateway services

- **Where**: `services/api-gateway/src/common/services/rls-context.service.ts` exists but no service calls `rlsContext.runAs(...)`.
- **Symptom**: Postgres RLS policies fire with `current_setting('sbtm.user_anchor_kind', true)` returning empty string → all admin-tier policies deny. Queries return zero rows even for legitimate admins.
- **Status**: infrastructure landed on `feat/sbtm-refocus-data-model`. `RequestContextService` (AsyncLocalStorage) holds the authenticated user for the request lifetime; `RequestContextInterceptor` is wired globally via `APP_INTERCEPTOR` in `CommonModule` and populates the ALS scope from `req.user` after the JWT guard runs; `RlsContextService.runAsCurrent(fn)` reads from ALS and runs `fn` inside a transaction with `SET LOCAL sbtm.user_anchor_kind` / `sbtm.user_anchor_id`. Calling `runAsCurrent` outside a request scope throws — silent fall-through to `super` was rejected to avoid masking missing guards. Per-service migration to wrap reads/writes in `runAsCurrent(tx => ...)` and switch to the tx-scoped `EntityManager` is still incremental and will land service-by-service alongside the #2 501-stub rewrites.
- **Fix**: wrap each gateway service entry point (or add a NestJS interceptor) that pulls `req.user.anchorKind` / `anchorId` and runs the handler inside `rlsContext.runAs(user, ...)`. Driver and Parent paths additionally need an app-layer `IN(...)` filter on the accessible run / student IDs.
- **Size**: 1–2 days for the interceptor; per-service migration to use the tx-scoped `EntityManager` rather than module repositories is incremental.

## Medium priority (test/coverage debt)

### 4. 11 archived `.v1bak` specs needing rewrite for v2 anchor model

- **Where** (api-gateway):
  - `src/modules/auth/provisioning.service.spec.ts.v1bak`
  - `src/modules/fleet/fleet.service.spec.ts.v1bak`
  - `src/modules/route/route.service.spec.ts.v1bak`
  - `src/modules/gateway/services/{absence,driver,fleet-assignment,organization,parent,parent-status}.gateway.service.spec.ts.v1bak`
  - **Done**: `school.service.spec.ts` and `school-board.service.spec.ts` rewritten against v2 entities (10 tests each).
- **Where** (notification-service):
  - `src/modules/preferences/preferences.service.spec.ts.v1bak`
  - `src/modules/router/notification-router.service.spec.ts.v1bak`
- **Symptom**: coverage gap — these services have no unit tests.
- **Fix**: rewrite using v2 fixtures (`anchorKind`/`anchorId` user shapes, new entity column names). Each file has a top-of-file TODO listing the v1 assertions that need new equivalents.
- **Size**: 0.5–1 day per file.

### 5. PostGIS column types stubbed as `text`

- **Where**: `stx_schools.location`, `stx_students.home_location`, `stx_boarding_events.location`.
- **Status**: done on `feat/sbtm-refocus-data-model`. Entity columns now declare `type: 'geography', spatialFeatureType: 'Point', srid: 4326` and use a shared `geographyPointTransformer` (`services/api-gateway/src/common/transformers/geography-point.transformer.ts`) that decodes Postgres EWKB hex into `{ lat, lng }` on read and emits `SRID=4326;POINT(lng lat)` EWKT on write — TypeORM repository `find` / `save` paths are now first-class. Raw-SQL callers (e.g. `DriverGatewayService.getScheduleForDriver`) read coords via `ST_X(col::geometry)` / `ST_Y(col::geometry)` and write via `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` (already the importer's pattern). The old WKT-parsing shim in `driver.gateway.service.ts` is removed.
- **Size**: closed.

### 6. `DeviceToken.userId` FK re-key to v2 users

- **Where**: `services/notification-service/src/modules/tokens/entities/device-token.entity.ts`.
- **Symptom**: orphaned device tokens if a v2 user is deleted (no cascade).
- **Status**: **blocked on cross-service user FK shape**. Admin/driver recipients live in `api-gateway.users`; parent recipients live in `stx_guardians` (no `users` row). A single hard FK to `users` would force every guardian to also have a `users` row, and TypeORM cannot model a polymorphic `userId` cleanly. Defer until either (a) we mint shadow `users` rows for guardians during subscription provisioning, or (b) we split `device_tokens.user_id` into `recipient_kind` + `recipient_id`. Pick one as part of the parent-app cutover (Phase D, item #10).
- **Fix**: add explicit FK + `ON DELETE CASCADE` migration once that decision is made.
- **Size**: 0.5 day once unblocked.

### 7. Internal-service guard replacing the removed `Role.SYSTEM`

- **Where**: `video.controller.ts` POST handler (callback from the video-processing pipeline).
- **Status**: done on `feat/sbtm-refocus-data-model`. `InternalServiceAuthGuard` (libs/common) is now registered/exported by `CommonModule` (global) and applied via `@UseGuards(InternalServiceAuthGuard)` on `VideoController.createVideoEvent`. GET handlers retain `JwtAuthGuard + RolesGuard` at the method level (class-level guards were dropped so each method can choose its own auth). The POST no longer overwrites `dto.schoolId` from `req.user` — the internal caller is a service, not a user; the DTO carries `schoolId` directly. Token shape: Bearer JWT signed with `INTERNAL_SERVICE_SECRET`, issuer `sbtm-internal` (already minted by `ServiceTokenService`).
- **Followup**: the standalone `MultiTenancyGuard` (`src/common/guards/multi-tenancy.guard.ts`) still carries a `TODO(phase-B): replace with internal-service guard` comment and still reads v1 `user.boardId` / `user.schoolId` — that guard is unused on any handler that needs internal-service access today, and its v1 anchor reads will be cleaned up as part of #1/#2.
- **Size**: closed.

## Low priority (cosmetic / docs)

### 8. Importer slice 2b PII layer — students / guardians / ridership commit

- **Where**: `services/integration-importer/src/modules/commit/commit.service.ts` covers the transport layer (stx_sta / boards / schools / operators / vehicles / agency / calendar / routes / stops / shapes / trips / stop_times); the PII layer landed in slice 4 (this commit).
- **Status**: done on `feat/sbtm-refocus-data-model`. `CommitService` now writes `stx_students`, `stx_guardians`, `stx_student_guardians`, and `stx_ridership` inside the same transaction as the transport layer when a `PiiCrypto` provider is wired (`PII_CRYPTO` token, `piiCryptoProvider` via `piiCryptoFromEnv()`). PII columns (`legal_name`, `board_student_number`, `preferred_name`, `date_of_birth`, `home_address`, guardian `legal_name`/`email`/`phone`) are written as `AES-256-GCM` BYTEA per `libs/common/src/crypto/pii-crypto.ts`. Cross-board guardian dedupe is keyed on `external_ids->>'guardian_code'`: integration test asserts `OSTA-GRD-0002` (OCSB-STU-0003 + OCDSB-STU-0001) becomes one `stx_guardians` row with two `stx_student_guardians` links. Ridership writes one row per trip on the student's (route, direction).
- **Followup**: replace the MVP single-key cipher with envelope encryption (per-record DEK wrapped by a KMS-managed KEK). The `PiiCrypto` interface stays stable across that swap — only `piiCryptoFromEnv()` / `AesGcmPiiCrypto` are replaced. ~2–3 days when a KMS provider is selected. Until then, **`SBTM_PII_KEY` (base64-encoded 32 bytes) must be set** in every env that runs the importer; rotating the key invalidates all stored ciphertexts.
- **Size**: closed.

### 9. Route Planner / shape-source post-processor

- **Where**: `services/integration-importer/src/modules/shape-fallback/` ships a worker that road-snaps stop sequences via OSRM. Now wired into `CommitService.runShapeFallback`, which runs after the main commit transaction.
- **Status**: done on `feat/sbtm-refocus-data-model`. After each commit, any route whose trip references a missing shape (`shape_id` NULL or zero rows in `shapes`) gets a road-snapped polyline (StubOsrmClient by default; HTTP impl swappable via `OSRM_CLIENT` provider), shape rows inserted, the trip's `shape_id` backfilled when NULL, and `routes.stx_shape_source` set to `sbtm_generated`. Integration test asserts R-OCDSB-101 and R-RCCDSB-501 are flagged correctly.
- **Followup**: done. `HttpOsrmClient` (`services/integration-importer/src/modules/shape-fallback/http-osrm-client.ts`) calls `/route/v1/{profile}/{coords}?geometries=geojson&overview=full` and maps the returned polyline into GTFS shape rows. `osrmClientProvider` returns the HTTP client when `OSRM_BASE_URL` is set, else falls back to `StubOsrmClient` so local dev and unit tests stay green without an OSRM instance. Optional env: `OSRM_PROFILE` (default `driving`), `OSRM_TIMEOUT_MS` (default 10000). Failures (non-2xx, OSRM `code != 'Ok'`, missing geometry) throw — importer surfaces the error rather than silently producing zero shapes. `shape_dist_traveled` is left null for interior points (OSRM does not expose per-shape-point cumulative distance and the importer does not yet consume it).

### 10. Frontend apps + locales (Phase D)

- **Where**: `apps/admin-dashboard`, `apps/parent-dashboard`, `apps/parent-app-mobile`, `apps/driver-app`, plus all `**/locales/*.json` referencing "OSTA Admin".
- **Symptom**: apps reference deleted `Role.OSTA_ADMIN`, expect old user shape (schoolId/boardId), and show stale UI strings.
- **Fix**: full Phase D cutover per plan.
- **Size**: 1–2 weeks for the four apps end-to-end.

### 11. Docs alignment (Phase F)

- **Where**: `docs/Design/SchemaAudit-And-Migration.md` (still describes dual-write), `docs/Design/DataModel-v2.md` §10 (still mentions OSTA Admin alias), various PRDs.
- **Symptom**: documentation drift from code.
- **Fix**: per plan Phase F.
- **Size**: 1 day.

## How to use this file

- When work starts on an item, add `**Status**: in progress (owner: …, branch: …)` under it.
- When complete, move the item to a "Done" section at the bottom and link the commit.
- New gaps discovered during Phase C–F implementation should be appended here, not lost.
