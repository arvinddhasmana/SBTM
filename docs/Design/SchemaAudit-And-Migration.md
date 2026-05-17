# SBTM v1 → v2 Schema Audit & Aggressive Cutover Plan

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-16
- Related: `DataModel-v2.md`, `Integrations-STA.md`, `Alerts.md`, `RoutePlanner.md`, `ImportMappings.md`

> **Strategy note.** SBTM is pre-production; there is no protected tenant data. This plan supersedes any prior dual-write / expand-migrate-contract approach with a single forward cut: drop v1, ship v2, seed from the two-STA sample bundle. There is no `OSTA_ADMIN` alias and no `Route.polyline` retention window — both are removed outright.

## 1. v1 Inventory (current state)

Audit of `services/*` and `libs/common` as of branch `feat/sbtm-refocus-data-model`.

| Service               | ORM              | Key entities                                                                                                            |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| api-gateway           | TypeORM/Postgres | `User`, `SchoolBoard`, `School`, `Route`, `RouteStop`, `Vehicle`, `StudentAbsence`, `FleetAssignment`, `PageVisibility` |
| gps-tracking          | Prisma/Postgres  | `LocationPoint`, `RouteLifecycleEvent`, `RouteGeofence`, `RouteDeviationEvent`, `GpsDeviceToken`, `SystemSetting`       |
| student-management    | TypeORM/Postgres | `Student`                                                                                                               |
| student-presence      | TypeORM/Postgres | `PresenceEvent`                                                                                                         |
| emergency-alerts      | TypeORM/Postgres | `EmergencyAlert`, `AlertAuditLog`, `AlertNotificationLog`, escalation chains, routing rules                             |
| compliance-management | TypeORM/Postgres | `DriverCompliance`, `VehicleInspection`, `AuditLog`                                                                     |
| notification-service  | TypeORM/Postgres | `NotificationPreference`, `DeviceToken`, `NotificationDeliveryLog`                                                      |
| video-service         | TypeORM/Postgres | `VideoEvent`                                                                                                            |

Tenant anchor present everywhere (`schoolId`/`school_id`, `boardId`). Roles currently include `SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT, ADMIN, SYSTEM` (`libs/common/src/decorators/roles.decorator.ts:3-12`). In v2 `OSTA_ADMIN` is **removed** (not aliased) and replaced by `STA_ADMIN`.

## 2. Gap Analysis vs v2 Target

| #   | Gap                                                          | v1 evidence                                                                  | v2 fix                                                                                                                                         |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| G01 | No GTFS calendar / `service_id`                              | `Route.startTime` only                                                       | Introduce `calendar`, `calendar_dates`, `stx_calendar_link`                                                                                    |
| G02 | No bell schedule                                             | none                                                                         | `stx_bell_schedules`, `stx_bell_schedule_dates`                                                                                                |
| G03 | No guardian entity                                           | `Student.parent_user_id` text                                                | `stx_guardians`, `stx_student_guardians` (M:N)                                                                                                 |
| G04 | No eligibility model                                         | enum-only via `am_route_id`/`pm_route_id`                                    | `stx_eligibility`                                                                                                                              |
| G05 | No ridership table                                           | implicit via `Student.am_route_id`                                           | `stx_ridership` (canonical "who rides what")                                                                                                   |
| G06 | No operational run grouping                                  | `FleetAssignment` close but proposal-oriented                                | `stx_runs`                                                                                                                                     |
| G07 | No GTFS export contract                                      | none                                                                         | GTFS-compliant naming + `external_ids` JSONB                                                                                                   |
| G08 | Boarding state inferred client-side                          | `roster.service.ts` toggles                                                  | `stx_boarding_events` persisted                                                                                                                |
| G09 | StudentAbsence in api-gateway, Student in student-management | split-brain                                                                  | consolidate under student domain                                                                                                               |
| G10 | Direction hard-coded AM/PM                                   | enum                                                                         | `stx_direction_kind` adds midday, KG, activity                                                                                                 |
| G11 | No stop scheduled times                                      | `RouteStop` has no arrival/departure                                         | `stop_times`                                                                                                                                   |
| G12 | No bus operator entity                                       | `Vehicle.schoolId` only                                                      | `stx_operators`, `stx_operator_contracts`                                                                                                      |
| G13 | Alert schema fragmented                                      | `EmergencyAlert` + `NotificationPreference` + `RouteDeviationEvent` separate | unify under `stx_alerts/_subscriptions/_deliveries`                                                                                            |
| G14 | No Phase-2 OAuth federation column                           | none                                                                         | `users.identity_provider` (`local` only wired)                                                                                                 |
| G15 | No external_ids round-trip for STA                           | none                                                                         | `external_ids JSONB` on routes/stops/students/schools                                                                                          |
| G17 | Single-consortium assumption (OSTA-only)                     | `stx_consortium` table modelled as a single row                              | New top-level `stx_sta` table; multiple STAs; `stx_boards.sta_id NOT NULL FK`; **`OSTA_ADMIN` removed and replaced by `STA_ADMIN`** — no alias |
| G18 | Route alignment as single text column                        | `Route.polyline` text only                                                   | GTFS `shapes` table; `routes.stx_shape_source` provenance; OSRM fallback when STA omits shapes; **`Route.polyline` dropped — not retained**    |
| G16 | Status overload                                              | `status` field on Vehicle/Alert/Presence/Absence                             | rename per-domain (`vehicle_status`, `alert_status`…); v1 columns dropped along with their tables                                              |

## 3. Mapping Table (v1 → v2)

The mapping below describes what v2 **replaces** v1 with. Implementation is a single forward cut: the v1 column or table is dropped in the same migration that creates the v2 target.

| v1 entity (path)                                 | v2 target                               | Mapping notes                                                                                                                                                                                                                                                        |
| ------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api-gateway` `SchoolBoard`                      | `stx_boards`                            | rename column `name`; add `sta_id NOT NULL FK→stx_sta`; add `external_ids`; FK chain `stx_boards.sta_id → stx_sta.id`                                                                                                                                                |
| `api-gateway` `School`                           | `stx_schools`                           | add `bell_schedule_id`, `external_ids`, `alerts_enabled`; promote `lat`/`lng` to PostGIS Point                                                                                                                                                                       |
| `api-gateway` `User`                             | `users` (kept)                          | add `identity_provider`, `preferred_language`; drop `childRouteIds[]` (replaced by `stx_student_guardians` join)                                                                                                                                                     |
| `api-gateway` `Route`                            | `routes` (GTFS) + `stx_runs` + `shapes` | static schedule → `routes`+`trips`+`stop_times`; daily realisation → `stx_runs`; **`Route.polyline` text column is dropped** and replaced by the `shapes` table; provenance recorded in `routes.stx_shape_source` (`sta_import`/`sbtm_generated`/`sta_admin_edited`) |
| `api-gateway` `RouteStop`                        | `stops` + `stop_times`                  | normalise; promote `address` → `stop_name`; PostGIS `location` → `stop_lat/lon`                                                                                                                                                                                      |
| `api-gateway` `Vehicle`                          | `stx_vehicles`                          | add `operator_id`, `capacity_*`, `equipment` jsonb                                                                                                                                                                                                                   |
| `api-gateway` `StudentAbsence`                   | `stx_student_absences`                  | move to student domain; FK to `stx_students` (true UUID FK)                                                                                                                                                                                                          |
| `api-gateway` `FleetAssignment`                  | `stx_runs`                              | proposal/review fields preserved as `stx_runs.proposed_by`, `reviewed_by`, `status='proposed'`                                                                                                                                                                       |
| `student-management` `Student`                   | `stx_students`                          | encrypt PII columns; add `home_location` PostGIS; `am_route_id`/`pm_route_id`/`am_stop_id`/`pm_stop_id` decomposed into `stx_ridership` rows                                                                                                                         |
| `student-presence` `PresenceEvent`               | `stx_boarding_events`                   | `BOARD/ALIGHT` → `event_kind`; SOURCE values reduced to `driver_app` for Phase 1; add `run_id` FK                                                                                                                                                                    |
| `emergency-alerts` `EmergencyAlert`              | `stx_alerts` (`category=safety`)        | enum maps to `event_type`; escalation chain to `metadata.escalation`                                                                                                                                                                                                 |
| `emergency-alerts` `AlertAuditLog`               | `stx_alert_audit`                       | direct copy                                                                                                                                                                                                                                                          |
| `emergency-alerts` `AlertNotificationLog`        | `stx_alert_deliveries`                  | direct copy                                                                                                                                                                                                                                                          |
| `notification-service` `NotificationPreference`  | `stx_alert_subscriptions`               | wider scope (categories, scope_kind, channels[])                                                                                                                                                                                                                     |
| `notification-service` `DeviceToken`             | unchanged                               | continue as-is                                                                                                                                                                                                                                                       |
| `notification-service` `NotificationDeliveryLog` | merged into `stx_alert_deliveries`      | dedup with above                                                                                                                                                                                                                                                     |
| `gps-tracking` (all)                             | unchanged                               | add `run_id` FK column on `LocationPoint`, `RouteLifecycleEvent`, `RouteDeviationEvent`; `RouteGeofence.polylineSource` removed — geofence reads `shapes` directly                                                                                                   |
| `compliance-management` (all)                    | unchanged                               | continue as system-of-record; `stx_drivers` mirrors expiry fields read-only                                                                                                                                                                                          |
| `video-service` `VideoEvent`                     | unchanged                               | add `run_id` FK                                                                                                                                                                                                                                                      |

## 4. Migration Strategy — Aggressive Cutover (Phases A–F)

Pre-production posture lets us delete v1 outright. Each phase is sequential — start only when the prior phase's verification passes. Branch: `feat/sbtm-refocus-data-model` (or a child branch). Rollback = `git revert` + `docker-compose down -v`.

### Phase A — Schema reset

**Goal**: replace v1 tables with v2 tables in every service. No data carried over.

1. **api-gateway TypeORM**: single migration `2026XXXXXXXX-v2-cutover.ts` that
   - `DROP TABLE` in dependency order: `emergency_alerts`, `alert_audit_log`, `alert_notification_log`, `students`, `parents`, `student_parents`, `routes`, `stops`, `schools`, `school_boards`.
   - `CREATE TABLE` v2: `stx_sta`, `stx_boards`, `stx_schools`, `stx_operators`, `stx_operator_contracts`, `stx_vehicles`, `stx_bell_schedules`, `agency`, `routes` (GTFS-shape, includes `stx_sta_id`, `stx_shape_source`), `trips`, `stops`, `stop_times`, `shapes`, `calendar`, `calendar_dates`, `stx_students`, `stx_guardians`, `stx_student_guardians`, `stx_ridership`, `stx_eligibility`, `stx_alerts`, `stx_alert_subscriptions`, `stx_alert_deliveries`, `stx_alert_audit`, `stx_student_absences`, `stx_boarding_events`.
   - Apply RLS policies keyed on STA → board → school per `DataModel-v2.md` §6.
2. **gps-tracking Prisma**: edit `schema.prisma` — drop `RouteGeofence.polylineSource`, point geofence at the `shapes` table directly. Generate fresh migration; do not preserve legacy rows.
3. **notification-service**: drop `NotificationPreference`; `DeviceToken` stays (re-keyed FK to v2 users); preferences move to `stx_alert_subscriptions`.
4. Reset all dev/staging DBs (`docker-compose down -v && up`, helm chart with `persistence.enabled=false`).

**Verification A**: `npm run typeorm:migrate` and `prisma migrate deploy` succeed against a clean Postgres. `psql \dt` lists only v2 tables. Schema dump committed to `docs/Design/v2-schema-snapshot.sql`.

### Phase B — Entity & service rewrite

**Goal**: application code compiles against v2 only. Build is the audit.

1. Rewrite TypeORM entities under `services/api-gateway/src/modules/**/entities/` against v2; delete v1 entity files.
2. Rewrite services & resolvers: `SchoolBoardService` → `BoardService` (STA-scoped); `RouteService` reads/writes `shapes`; alert-related services collapsed into a single `AlertService` writing `stx_alerts`.
3. Delete the legacy `EmergencyAlert` flow; `AlertService.publish({ category: 'safety', ... })` is the single entry. Driver-app HTTP surface preserved; internals swapped.
4. **Role rename**: replace `Role.OSTA_ADMIN` with `Role.STA_ADMIN` repo-wide. Delete the `OSTA_ADMIN` enum value. Update every `@Roles()` decorator. Any surviving reference fails to compile — that is the audit.
5. **Env / config / queue rename**: `OSTA_*` → `STA_*` across Helm, Compose, `.env.example`. Old names deliberately fail-loud (no fallback reads).
6. Rewrite admin-dashboard screens that consumed v1 alert/route models. Route Planner saves to `shapes` (not `Route.polyline`).

**Verification B**: `npm run build` green across the monorepo. `npm run test:unit` green. Any v1 type name in source is a compile error.

### Phase C — Importer + adapters + sample seed

**Goal**: a clean DB can be populated entirely by importing the two-STA sample bundle.

1. New service `services/integration-importer` implementing `TransportDataAdapter` per `Integrations-STA.md` §4.1. Ship `StaCsvAdapter` first; `GtfsScheduleAdapter` second.
2. Three-layer import pipeline (stage → diff → dry-run report → commit) with `import_session_id` and manifest-hash enforcement.
3. **OSRM shape fallback worker**: when a route lacks shape rows, road-snap sequential stop coords and set `stx_shape_source = 'sbtm_generated'`.
4. Admin-UI "Import" page: file upload, dry-run preview, confirm/abort. RBAC — STA Admin uploads the STA layer; Board Admin uploads board/student layers.
5. End-to-end seed: from a fresh DB, upload `docs/Design/samples/two-sta-bundle/osta/*` then `rcjtc/*`. Both manifests' `row_count`s match `psql` counts after commit.

**Verification C**: From `docker-compose down -v && up`, `npm run import:sample two-sta-bundle` produces 2 `stx_sta` rows (OSTA, RCJTC), 4 `stx_boards`, 4 `stx_schools`, 12 `stx_students`, one `stx_operators` row for `OP-STOCK` (de-duped via `external_ids.legal_entity_id` across STAs), and at least one route per STA with `stx_shape_source='sbtm_generated'` and populated shape rows.

### Phase D — Three-app cutover

**Goal**: Driver, Parent, Admin apps work end-to-end against v2 only.

1. **Admin dashboard**: Route Planner save path → `shapes`; Alert Management → `stx_alerts`; Student/Roster screens → `stx_students` + `stx_ridership`.
2. **Parent app**: live-bus map subscribes to GPS positions joined to `stx_ridership` for the guardian's children; alert feed reads `stx_alert_deliveries`.
3. **Driver app**: nav-path overlay reads `shapes`; board/alight UI writes `stx_boarding_events`; panic raises `stx_alerts` with `category='safety'`.
4. Delete v1 screens, stores, and API client methods in all three apps.

**Verification D** (scripted walkthrough on freshly-seeded staging):

1. Admin imports the OSTA bundle → routes appear in Route Planner with correct shapes.
2. Admin publishes a `route_delayed` alert for `R-OCDSB-101` → Parent app for an OCDSB student receives push within 10 s; an unrelated RCJTC guardian does **not**.
3. Driver opens app for `T-OCSB-201-AM`, sees the auto-generated shape, taps board for two students → `stx_boarding_events` persisted; parents see "boarded" status.
4. Driver panic → `stx_alerts` row with `category=safety`; escalation chain fires.

### Phase E — Integration & soak

1. CI job `test:integration:two-sta`: spin Postgres + services in containers, import the sample bundle, run the audience-resolver over every alert template, assert deterministic delivery counts.
2. CI grep gate: `! grep -R "OSTA_ADMIN\|Route\.polyline\|EmergencyAlert" services/ apps/ libs/`. Any hit fails the build.
3. PII-exclusion test on GTFS export per `RoutePlanner.md` §9.
4. 24-hour staging soak with synthetic load (1 alert/min, 10 GPS pings/min/vehicle) — error budget zero.

**Verification E**: all CI gates green on the cutover branch; soak report attached to the PR.

### Phase F — Doc + history clean-up

1. This document already reflects the aggressive cutover (Phases A–F replace the prior expand/migrate/contract narrative).
2. `DataModel-v2.md` §10 RBAC table: the "OSTA Admin (deprecated alias)" row is removed.
3. Archive any stale ADR mentioning dual-write.

**Verification F**: `grep -R "dual-write\|expand-migrate-contract\|OSTA_ADMIN" docs/` is empty.

### Rollback posture

No per-table rollback. If a phase fails verification, revert the branch, fix forward, retry. With no production data, "rollback" is `git revert` plus `docker-compose down -v`. This is the explicit trade for skipping the dual-write tax.

### Risks accepted

- An older client run against a freshly-cut staging will get hard errors instead of graceful degradation — acceptable pre-launch.
- Future code archaeology cannot recover v1 column data; the v1 schema lives only in git history. Intended trade.

## 5. Service-Level Changes

### 5.0 Multi-STA tenancy cutover (G17) and role rename

1. **Schema**: `stx_sta` is created in Phase A. `stx_boards.sta_id` is `NOT NULL` from creation (no backfill phase — no rows pre-exist). Seed inserts OSTA and RCJTC `stx_sta` rows via the sample-bundle import.
2. **Role enum** (`libs/common/src/decorators/roles.decorator.ts`): `OSTA_ADMIN` is **deleted**. `STA_ADMIN` is the only top-tenant role. Any source reference to `OSTA_ADMIN` is a compile error — the build is the audit (Phase B verification, reinforced by Phase E grep gate).
3. **RLS policies**: tenant predicates are STA → board → school from inception; no migration of existing policies.
4. **Admin UI**: STA selector on Super Admin views; STA Admin users see only their STA's boards.
5. New STAs (STEO, …) are onboarded by inserting an `stx_sta` row + manual data import per `ImportMappings.md` — no schema migration per onboarding.

| Service                          | v2 changes                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| api-gateway                      | REST/GraphQL surface rewritten against `routes`/`trips`/`stops`/`runs`/`ridership`/`guardians`; v1 endpoints removed                     |
| student-management               | Owns `stx_students`, `stx_guardians`, `stx_student_guardians`, `stx_eligibility`, `stx_ridership`, `stx_student_absences` (consolidated) |
| student-presence                 | Owns `stx_boarding_events`; reads `stx_ridership` for roster                                                                             |
| gps-tracking                     | Adds `run_id` joins; emits compliance events to alert pipeline; geofence reads `shapes` directly                                         |
| emergency-alerts → alert-service | Renamed/expanded; owns `stx_alerts`, `stx_alert_subscriptions`, `stx_alert_deliveries`, `stx_alert_audit`                                |
| notification-service             | Becomes pure channel dispatcher; subscription concerns move to alert-service                                                             |
| compliance-management            | Unchanged scope; provides read-model into `stx_drivers`                                                                                  |
| video-service                    | Unchanged; `run_id` added                                                                                                                |
| **integration-importer (new)**   | Hosts `StaCsvAdapter`, `GtfsScheduleAdapter`, future `StaApiAdapter`                                                                     |
| **alert-service (renamed/new)**  | Audience resolver, dispatcher, idempotency layer                                                                                         |

## 6. Deployment / Ops Considerations

- Postgres extensions required: `postgis`, `pgcrypto` (column-level encryption), `uuid-ossp` / `pg_uuidv7`.
- Tenant RLS policies applied at table-create time; see `SecurityPrivacyArchitecture.md` (to be updated in a follow-up).
- The "Import sample bundle" CLI is the canonical bootstrap for new environments — no separate backfill infrastructure.
- Monitoring: per-phase dashboards (importer error rate, alert delivery latency, GPS ingest lag). No dual-write parity dashboards (no dual-write).

## 7. Risks & Mitigations

| Risk                                                                       | Mitigation                                                                                                                            |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Sample-bundle import diverges from real STA export at first onboarding     | `ImportMappings.md` is the contract; first real export validated dry-run-only; importer rejects unknown columns unless `strict=false` |
| OSRM shape fallback produces a path that diverges from the true bus route  | `stx_shape_source='sbtm_generated'` flag surfaced in Route Planner; STA Admin re-shapes; provenance flips to `sta_admin_edited`       |
| Alert duplication via cross-board parent (P2 in sample bundle)             | Audience resolver dedup on `(alert_id, user_id, channel)`; integration test asserts P2 receives exactly one delivery per scope event  |
| PII leak via GTFS export                                                   | Default export excludes `stx_*` columns containing PII; integration tests assert this                                                 |
| Pre-production environment retains stale v1 schema after a partial rebuild | `docker-compose down -v` required between phases; CI grep gate (Phase E2) catches surviving v1 names in source                        |

## 8. Sequencing Summary

| Step | Phase | Action                                                                            |
| ---- | ----- | --------------------------------------------------------------------------------- |
| 0    | —     | Approve this design pack                                                          |
| 1    | A     | Schema reset migrations land; dev/staging DBs reset                               |
| 2    | B     | Entity/service rewrite; `OSTA_ADMIN` deleted; env vars renamed; build green       |
| 3    | C     | `integration-importer` ships; OSRM fallback worker; sample bundle imports cleanly |
| 4    | D     | Driver/Parent/Admin apps cut over to v2; scripted walkthrough green               |
| 5    | E     | CI integration + grep gate + 24 h soak                                            |
| 6    | F     | Doc clean-up; archive dual-write ADRs                                             |

Each step gates on the previous step's verification. There is no per-tenant rollout (no tenants); there is no week-by-week schedule (effort sizing belongs in the engineering ADR that follows this pack).

## 9. Out of Scope (recorded for follow-up)

- Mobile app offline-cache shape — separate ADR.
- GTFS-Realtime feed publication endpoint — separate design.
- Parent OAuth federation (OCSB/OCDSB) — interface stub only; full design when those IdPs are confirmed.
- RFID/NFC student tap-on/tap-off — Phase 2.
- Routing/optimisation engine — never; STA owns this.
