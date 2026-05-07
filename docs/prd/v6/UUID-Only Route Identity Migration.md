# UUID-Only Route Identity Migration

**Status:** Proposed
**Effort:** ~1.5 days engineering + 0.5 day validation
**Goal:** Eliminate dual-ID system. `routes`, `route_stops`, `students` operational tables become the single source of truth. All reference tables (`routes_reference`, `route_stops_reference`, `students_reference`) and string IDs (`ROUTE-STBERN-R01-AM`, `STOP-…`) are removed.

---

## 1. Outcome

| Layer                                  | Today                                     | After                                                        |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| `routes.id`                            | UUID                                      | UUID (unchanged)                                             |
| `routes_reference`                     | Parallel string-ID table, manually seeded | **Dropped**                                                  |
| Driver JWT `assignedRouteIds`          | `["ROUTE-STBERN-R01-AM"]`                 | `["a0000…-0001"]` (UUIDs)                                    |
| Driver gateway `/driver/me/schedule`   | Reads `routes_reference`                  | Reads `routes`                                               |
| Parent gateway `/routes/reference/:id` | Reads `routes_reference`                  | Renamed `/routes/:id`, reads `routes`                        |
| GPS sim config (`*-config.json`)       | `routeRefId: "ROUTE-…"`                   | `routeId: "<uuid>"` (or schoolSlug-based deterministic UUID) |
| `students_reference`                   | Parallel student table                    | **Dropped** — readers use `students` + `route_stops`         |
| `syncRouteToReference()`               | Required band-aid                         | **Removed**                                                  |

---

## 2. Schema Changes (`scripts/init-schema.sql`)

### 2.1 Drop reference tables

```sql
DROP TABLE IF EXISTS route_stops_reference CASCADE;
DROP TABLE IF EXISTS routes_reference CASCADE;
DROP TABLE IF EXISTS students_reference CASCADE;
```

### 2.2 Add columns to `students` if missing

Confirm `students.am_route_id`, `pm_route_id`, `am_stop_id`, `pm_stop_id` exist as UUID FKs (currently nullable). Add `am_stop_id`/`pm_stop_id` if absent — these were only on `students_reference`.

```sql
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS am_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL;
```

### 2.3 Migration file (new)

`services/api-gateway/migrations/20260507_drop_reference_tables.sql` — same DROPs + ALTERs, idempotent. Run via existing `scripts/azure/db-migrate-via-aks.sh` flow for prod.

---

## 3. Backend Code Changes

### 3.1 `services/api-gateway`

| File                                                                              | Change                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/route/route.service.ts`                                                  | **Delete** `syncRouteToReference()` (~75 lines) and all 4 call sites. `remove()` simplifies back to `routeRepository.remove(route)`.                                                                                                        |
| `modules/gateway/services/driver.gateway.service.ts:75-111`                       | Replace `FROM routes_reference` query with `FROM routes`. Use `Route` entity + TypeORM. Rename JSON `routeId` field source from `r.id` (string) to `r.id::text` (UUID string). Schedule comes from `r.startTime`, not `schedule.startTime`. |
| `modules/gateway/services/driver.gateway.service.ts:131-...` (`getRouteStudents`) | Source roster from `students` (operational), join `route_stops` for stop names/locations. Drop `students_reference` query.                                                                                                                  |
| `modules/gateway/services/parent.gateway.service.ts:119`                          | Read `routes` not `routes_reference` for vehicleId lookup.                                                                                                                                                                                  |
| `modules/gateway/controllers/gps.controller.ts` (`/routes/reference/:id`)         | Rename route to `/routes/:id`. Keep old path with deprecation shim for one release.                                                                                                                                                         |
| `modules/auth/jwt.strategy.ts` + token issuer                                     | `assignedRouteIds` populated from `student.am_route_id`/`pm_route_id` (UUIDs) and `vehicle_assignments.route_id` (UUIDs). Validate UUID format.                                                                                             |
| `modules/auth/auth.service.ts` (driver login)                                     | Same: emit UUIDs in JWT.                                                                                                                                                                                                                    |

### 3.2 `services/student-presence`

- `presence.processor.ts:87-96`: drop `students_reference` fallback. Read parent_id from `students.parent_user_id` only.

### 3.3 `services/emergency-alerts`

- `alerts.processor.ts:317-323`: drop `students_reference` fallback. Use `students` + `route_stops` join keyed on `am_route_id`/`pm_route_id`.

### 3.4 `services/gps-tracking`

- No code changes; route IDs already pass through opaquely. Verify `routeId` columns are UUIDs in tracking tables — add migration if currently `varchar`.

---

## 4. Frontend Changes

### 4.1 `apps/admin-dashboard`

- `src/services/api/routes.data.ts`: replace mock `ROUTE-SingleBus-AM` strings with deterministic UUID fixtures (`'00000000-0000-0000-0000-000000000a01'` style).
- No other changes — admin already uses UUIDs from `/api/v1/routes`.

### 4.2 `apps/parent-dashboard/web`

- `src/pages/Map.tsx`: change endpoint `/api/v1/routes/reference/:id` → `/api/v1/routes/:id`. ID source (student record's `am_route_id`/`pm_route_id`) is already a UUID, so no app-side change beyond URL.

### 4.3 `apps/driver-app`

- No code change required. `assignedRoutes` from `/driver/me/schedule` becomes UUID-keyed transparently. Verify `Route['id']` typing accepts UUID strings (already `string`).

---

## 5. Scripts: Consolidate, Rewrite, Delete

### 5.1 Hierarchical inventory + actions

```
scripts/
├── SCHEMA & SEED  ──────────────────────────────────  KEEP / REWRITE
│   ├── init-schema.sql          [REWRITE]  drop reference tables, add stop columns
│   ├── init-db.sh               [KEEP]     entry point
│   ├── seed-standard.sql        [KEEP]     no route data
│   ├── seed-demo.sql            [REWRITE]  remove ROUTE-/STOP- string IDs, use UUIDs
│   ├── reset-demo-db.sh         [KEEP]     calls init-db.sh + verify
│   └── verify-demo.sh           [REWRITE]  drop routes_reference / students_reference checks
│
├── SIMULATION (canonical) ──────────────────────────  KEEP — rewire to UUIDs
│   ├── SimulationOnlyOnSeededDB.sh   [REWRITE]  read route UUIDs from `routes` table
│   ├── seeded-run.ts                 [REWRITE]  query `routes`, `route_stops`, `students`
│   ├── demo-sim-config.json          [REWRITE]  routeRefId → routeId (UUIDs); produce via generator
│   └── demo-gen-config.ts            [REWRITE]  emit UUID-based config
│
├── SIMULATION (legacy duplicates) ──────────────────  DELETE
│   ├── singlebus-simulate.sh         [DELETE]   superseded by SimulationOnlyOnSeededDB.sh
│   ├── singlebus-run.ts              [DELETE]
│   ├── singlebus-config.json         [DELETE]
│   ├── singlebus-seed.ts             [DELETE]
│   ├── dynamic-simulate.sh           [DELETE]   never wired into demo flow
│   ├── dynamic-run.ts                [DELETE]
│   ├── dynamic-config.json           [DELETE]
│   ├── dynamic-generate-config.ts    [DELETE]
│   ├── demo-simulate.sh              [DELETE]   replaced by SimulationOnlyOnSeededDB.sh
│   ├── demo-run.ts                   [DELETE]
│   ├── simulate-demo.sh              [DELETE]   pre-existing dup
│   └── generate-demo-track.js        [DELETE]   one-off, output already in seed
│
├── ROUTE GENERATION (utility) ──────────────────────  KEEP / REWRITE
│   ├── generate-demo-routes.ts       [REWRITE]  emit UUIDs into seed-demo.sql
│   ├── generate-osrm-routes.{js,ts}  [KEEP one] delete .js, keep .ts
│   ├── densify-tracks.{js,ts}        [KEEP one] delete .js, keep .ts
│   ├── demo-routes.json              [REGENERATE] via generate-demo-routes.ts
│   └── demo-gps-track.json           [DELETE]   only consumed by deleted simulate-demo.sh
│
├── DEV WORKFLOW ────────────────────────────────────  KEEP
│   ├── dev-hybrid.sh, dev-mock.sh, dev-stop.sh, start-hybrid.sh, setup-osrm.sh
│
├── MOBILE ──────────────────────────────────────────  KEEP
│   ├── mobile-build.sh, mobile-submit.sh, phone-deploy.sh
│
├── MIGRATIONS ──────────────────────────────────────  KEEP / ADD
│   ├── run-alert-config-migration.sh           [KEEP]
│   └── 20260507_drop_reference_tables.sql      [ADD]
│
├── ORPHANS ─────────────────────────────────────────  DELETE
│   ├── rls-policies.sql              [DELETE]   never referenced
│   └── verify.sql                    [DELETE]   superseded by verify-demo.sh
│
├── azure/, gcp/  ───────────────────────────────────  KEEP unchanged
└── infra/local/init-test-db.sh ─────────────────────  REVIEW (orphan candidate)
```

### 5.2 Net effect

- **22 files deleted** (singlebus-_, dynamic-_, demo-{run,simulate}.{ts,sh}, simulate-demo.sh, generate-demo-track.js, demo-gps-track.json, rls-policies.sql, verify.sql, .js duplicates of .ts)
- **6 files rewritten** to use UUIDs
- **1 migration added**
- Single canonical simulation flow: `init-db.sh` → `SimulationOnlyOnSeededDB.sh`

---

## 6. Test Updates

### 6.1 Update existing

| Test                                                         | Change                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/admin-dashboard/e2e/alert-regression.spec.ts:54`       | Replace `'ROUTE-STBERN-R01-AM'` with UUID resolved from seed (or via API lookup helper).                                   |
| `apps/admin-dashboard/e2e/map-gps-tracking.spec.ts`          | Same — use UUIDs.                                                                                                          |
| `apps/admin-dashboard/e2e/fixtures.ts`                       | Update `TEST_USERS` and helper functions to emit UUIDs. Add `getRouteIdByName(name)` helper that queries `/api/v1/routes`. |
| `apps/parent-dashboard/web/.../useGpsLocation.spec.ts`       | Replace `ROUTE-AM`/`ROUTE-PM` mock IDs with UUIDs.                                                                         |
| `services/api-gateway/.../driver.gateway.service.spec.ts:38` | UUID fixtures.                                                                                                             |
| `apps/admin-dashboard/src/services/api/routes.api.test.ts`   | UUID fixtures.                                                                                                             |

### 6.2 New tests to add

| Layer                   | Test                             | Asserts                                                                                                     |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| api-gateway unit        | `route.service.spec.ts`          | After `update()`, no writes to `routes_reference` (table gone); subsequent `findOne` returns updated stops. |
| api-gateway unit        | `driver.gateway.service.spec.ts` | `/driver/me/schedule` returns route with UUID `routeId` from `routes` table; no reference-table query.      |
| api-gateway integration | `routes.controller.int-spec.ts`  | Full PATCH → GET round-trip with stop replacement; assert UUID id stable.                                   |
| Playwright e2e          | `route-sync.spec.ts` (new)       | Edit route in admin → poll parent portal → poll driver app → assert all 3 see updated stops within 90s.     |
| Migration test          | `migrations/20260507.spec.ts`    | Idempotent; drops cleanly even if tables don't exist.                                                       |

### 6.3 Test gates per package

Use existing `pnpm --filter <pkg> test` and `pnpm --filter <pkg> test:e2e`. Block merge on:

- `services/api-gateway` unit + int
- `apps/admin-dashboard` unit + e2e (`route-planner-live.spec.ts`, `map-gps-tracking.spec.ts`, new `route-sync.spec.ts`)
- `apps/driver-app` unit
- `apps/parent-dashboard/web` unit

---

## 7. End-to-End Validation Plan

Run after migration in this order:

### 7.1 Local hybrid

```bash
./scripts/dev-stop.sh
./scripts/init-db.sh                        # schema + seed (rewritten)
./scripts/SimulationOnlyOnSeededDB.sh &     # GPS events
./scripts/dev-hybrid.sh                     # services up
```

### 7.2 Manual smoke (browser via Playwright MCP / manual)

1. Admin dashboard → Route Planner → list shows seeded routes (UUID ids).
2. Edit "STBERN Route 2 AM": rename to "STBERN R2 AM Test", change start time, add a stop.
3. Save → toast success.
4. Admin Map view → route polyline reflects new stop within 30s.
5. Parent portal (login as parent of student on R2 AM) → Map page shows new route name + stop within 60s (poll interval).
6. Driver app (login as R2 AM driver) → Routes screen shows new name within 60s; tap into Active Route → roster + stops match.
7. Delete a stop → all three surfaces remove it within 60s.
8. Delete the route → fail-safe: parent/driver gracefully show "no route assigned".

### 7.3 Automated suite

```bash
pnpm -r test                                 # unit
pnpm --filter admin-dashboard test:e2e       # playwright
pnpm --filter api-gateway test:int           # integration (real PG)
./scripts/verify-demo.sh                     # smoke
```

### 7.4 Regression watch

- Confirm no row exists in pg_class for `routes_reference`, `route_stops_reference`, `students_reference`.
- `grep -r "routes_reference\|students_reference"` returns zero hits across `services/`, `apps/`, `scripts/`.
- Driver JWT decoded payload contains UUIDs only (verify via `jwt.io` on a test token).

---

## 8. Documentation Updates

| File                                         | Change                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `docs/Implementation/Module-8-ApiGateway.md` | Remove "reference tables" section. Document single-table route lifecycle.                 |
| `docs/Implementation/Module-3-DriverApp.md`  | Update JWT claims docs (UUIDs).                                                           |
| `docs/Implementation/Module-2-ParentApp.md`  | Endpoint rename `/routes/reference/:id` → `/routes/:id`.                                  |
| `docs/Demo/`                                 | Update any walkthrough that references `ROUTE-STBERN-…` IDs.                              |
| `docs/Reference/`                            | Add ADR `ADR-001-route-identity.md` explaining decision and why reference tables existed. |
| `docs/dev/scripts.md` (new)                  | The hierarchical inventory from §5.1 as the canonical script index.                       |
| `README.md`                                  | Update demo-run instructions to single canonical path.                                    |

---

## 9. Sequenced Execution (1.5 days)

**Day 1 morning (4h)** — Backend

1. Schema: drop tables migration + `init-schema.sql` rewrite.
2. `RouteService`: delete `syncRouteToReference`.
3. `driver.gateway.service.ts` + `parent.gateway.service.ts`: switch to operational tables.
4. JWT issuer: emit UUIDs.
5. `student-presence` + `emergency-alerts`: drop reference fallbacks.
6. Run unit tests, fix breakage.

**Day 1 afternoon (4h)** — Scripts + Seed 7. Rewrite `seed-demo.sql` (use `generate-demo-routes.ts` to emit UUID-based SQL). 8. Rewrite `SimulationOnlyOnSeededDB.sh` + `seeded-run.ts`. 9. Rewrite `demo-sim-config.json` via regenerated `demo-gen-config.ts`. 10. Delete legacy duplicates (22 files per §5.1). 11. Update `verify-demo.sh`. 12. Local smoke: `init-db.sh` + `dev-hybrid.sh`.

**Day 2 morning (4h)** — Frontend + Tests 13. Parent portal endpoint rename. 14. Update all test fixtures (UUIDs). 15. Add new tests per §6.2. 16. Run Playwright e2e suite end-to-end.

**Day 2 afternoon (2h)** — Docs + Cloud migration 17. Documentation updates per §8. 18. Run prod migration via `scripts/azure/db-migrate-via-aks.sh`. 19. Deploy services. 20. Production smoke (§7.2).

---

## 10. Rollback

- Migration is destructive (DROP TABLE). Pre-deploy backup mandatory: `pg_dump -t routes_reference -t route_stops_reference -t students_reference > rollback.sql`.
- Code rollback: revert PR; reference tables restored from backup; old JWTs naturally expire (driver re-login required either way).
- Reference-table sync band-aid (`syncRouteToReference`) is in git history at the commit prior — recoverable.

---

## 11. Risks & Mitigations

| Risk                                                    | Mitigation                                                                                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Active driver sessions hold old string-ID JWTs          | Force logout on deploy via JWT issuance epoch bump.                                                                                     |
| Old mobile-app builds in field still expect string IDs  | Backend tolerates both for one release (parse-and-accept), then drop. Add to JWT claim a `tokenVersion: 2`; mobile checks and re-auths. |
| Sim configs in dev branches break                       | Document migration in PR description; provide `scripts/migrate-config-uuids.ts` one-shot.                                               |
| Parent app caches `/routes/reference/:id` URL           | Service worker cache bust on deploy (already configured for version bumps).                                                             |
| Tests reference seeded UUIDs that change between resets | Tests resolve UUIDs by name via API helper, not hardcoded.                                                                              |
