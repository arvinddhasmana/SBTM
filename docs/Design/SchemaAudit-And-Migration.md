# SBTM v1 → v2 Schema Audit & Migration Plan

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Related: `DataModel-v2.md`, `DatabaseSchema.md` (v1)

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

Tenant anchor present everywhere (`schoolId`/`school_id`, `boardId`). Roles already include `SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT, ADMIN, SYSTEM` (`libs/common/src/decorators/roles.decorator.ts:3-12`).

## 2. Gap Analysis vs v2 Target

| #   | Gap                                                          | v1 evidence                                                                  | v2 fix                                                                                                                         |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| G01 | No GTFS calendar / `service_id`                              | `Route.startTime` only                                                       | Introduce `calendar`, `calendar_dates`, `stx_calendar_link`                                                                    |
| G02 | No bell schedule                                             | none                                                                         | `stx_bell_schedules`, `stx_bell_schedule_dates`                                                                                |
| G03 | No guardian entity                                           | `Student.parent_user_id` text                                                | `stx_guardians`, `stx_student_guardians` (M:N)                                                                                 |
| G04 | No eligibility model                                         | enum-only via `am_route_id`/`pm_route_id`                                    | `stx_eligibility`                                                                                                              |
| G05 | No ridership table                                           | implicit via `Student.am_route_id`                                           | `stx_ridership` (canonical "who rides what")                                                                                   |
| G06 | No operational run grouping                                  | `FleetAssignment` close but proposal-oriented                                | `stx_runs`                                                                                                                     |
| G07 | No GTFS export contract                                      | none                                                                         | GTFS-compliant naming + `external_ids` JSONB                                                                                   |
| G08 | Boarding state inferred client-side                          | `roster.service.ts` toggles                                                  | `stx_boarding_events` persisted                                                                                                |
| G09 | StudentAbsence in api-gateway, Student in student-management | split-brain                                                                  | consolidate under student domain                                                                                               |
| G10 | Direction hard-coded AM/PM                                   | enum                                                                         | `stx_direction_kind` adds midday, KG, activity                                                                                 |
| G11 | No stop scheduled times                                      | `RouteStop` has no arrival/departure                                         | `stop_times`                                                                                                                   |
| G12 | No bus operator entity                                       | `Vehicle.schoolId` only                                                      | `stx_operators`, `stx_operator_contracts`                                                                                      |
| G13 | Alert schema fragmented                                      | `EmergencyAlert` + `NotificationPreference` + `RouteDeviationEvent` separate | unify under `stx_alerts/_subscriptions/_deliveries`                                                                            |
| G14 | No Phase-2 OAuth federation column                           | none                                                                         | `users.identity_provider` (`local` only wired)                                                                                 |
| G15 | No external_ids round-trip for OSTA                          | none                                                                         | `external_ids JSONB` on routes/stops/students/schools                                                                          |
| G16 | Status overload                                              | `status` field on Vehicle/Alert/Presence/Absence                             | rename per-domain (`vehicle_status`, `alert_status`…) only where it touches new code; v1 columns kept intact during dual-write |

## 3. Mapping Table (v1 → v2)

| v1 entity (path)                                 | v2 target                          | Mapping notes                                                                                                                                |
| ------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `api-gateway` `SchoolBoard`                      | `stx_boards`                       | rename column `name`; add `external_ids`; FK to `stx_consortium`                                                                             |
| `api-gateway` `School`                           | `stx_schools`                      | add `bell_schedule_id`, `external_ids`; promote `lat`/`lng` to PostGIS Point                                                                 |
| `api-gateway` `User`                             | `users` (kept)                     | add `identity_provider`, `preferred_language`; trim `childRouteIds[]` (replaced by `stx_student_guardians` join)                             |
| `api-gateway` `Route`                            | `routes` (GTFS) + `stx_runs`       | static schedule → `routes`+`trips`+`stop_times`; daily realisation → `stx_runs`                                                              |
| `api-gateway` `RouteStop`                        | `stops` + `stop_times`             | normalise; promote `address` → `stop_name`; PostGIS `location` → `stop_lat/lon`                                                              |
| `api-gateway` `Vehicle`                          | `stx_vehicles`                     | add `operator_id`, `capacity_*`, `equipment` jsonb                                                                                           |
| `api-gateway` `StudentAbsence`                   | `stx_student_absences`             | move to student domain; FK to `stx_students` (true UUID FK)                                                                                  |
| `api-gateway` `FleetAssignment`                  | `stx_runs`                         | proposal/review fields preserved as `stx_runs.proposed_by`, `reviewed_by`, `status='proposed'`                                               |
| `student-management` `Student`                   | `stx_students`                     | encrypt PII columns; add `home_location` PostGIS; `am_route_id`/`pm_route_id`/`am_stop_id`/`pm_stop_id` decomposed into `stx_ridership` rows |
| `student-presence` `PresenceEvent`               | `stx_boarding_events`              | `BOARD/ALIGHT` → `event_kind`; SOURCE values reduced to `driver_app` for Phase 1; add `run_id` FK                                            |
| `emergency-alerts` `EmergencyAlert`              | `stx_alerts` (`category=safety`)   | enum maps to `event_type`; escalation chain to `metadata.escalation`                                                                         |
| `emergency-alerts` `AlertAuditLog`               | `stx_alert_audit`                  | direct copy                                                                                                                                  |
| `emergency-alerts` `AlertNotificationLog`        | `stx_alert_deliveries`             | direct copy                                                                                                                                  |
| `notification-service` `NotificationPreference`  | `stx_alert_subscriptions`          | wider scope (categories, scope_kind, channels[])                                                                                             |
| `notification-service` `DeviceToken`             | unchanged                          | continue as-is                                                                                                                               |
| `notification-service` `NotificationDeliveryLog` | merged into `stx_alert_deliveries` | dedup with above                                                                                                                             |
| `gps-tracking` (all)                             | unchanged                          | add `run_id` FK column on `LocationPoint`, `RouteLifecycleEvent`, `RouteDeviationEvent`; nullable during transition                          |
| `compliance-management` (all)                    | unchanged                          | continue as system-of-record; `stx_drivers` mirrors expiry fields read-only                                                                  |
| `video-service` `VideoEvent`                     | unchanged                          | add `run_id` FK                                                                                                                              |

## 4. Migration Strategy — Expand → Migrate → Contract

A standard zero-downtime, three-phase rollout. **No destructive change** until each step is observed stable in production for ≥2 weeks.

### Phase A — Expand (additive, no breaking change)

1. Create all new `stx_*` tables and the GTFS-aligned `agency`, `routes`, `trips`, `stops`, `stop_times`, `calendar`, `calendar_dates`, `shapes` tables.
2. Add nullable `external_ids` JSONB to `School`, `Student`, `Route`, `Vehicle`.
3. Add nullable `run_id` columns on `gps-tracking`, `video-service`, `student-presence`, `emergency-alerts` source tables.
4. Add `users.identity_provider` (`local` default).
5. Backfill: deterministic transformation of existing `Route` → `routes`+`trips`+`stop_times`, existing `RouteStop` → `stops`, existing `Student.am_*`/`pm_*` → `stx_ridership` rows, existing `FleetAssignment` → `stx_runs`.
6. Backfill `stx_guardians` from current `Student.parent_user_id` references (one guardian per student initially; M:N exposed in admin later).
7. Backfill `stx_boarding_events` from `PresenceEvent` history.

### Phase B — Migrate (dual-write, then dual-read)

1. **Dual-write**: writes from driver app, admin console, and GPS service write to **both** v1 and v2 tables for 4 weeks. Reconciliation job runs nightly; mismatches alert engineering.
2. **Dual-read**: read paths gradually flipped service-by-service to v2, behind a per-tenant feature flag (`tenant.read_v2_enabled`). Order: `parent-app` (lowest blast radius) → `admin-dashboard` (school view) → `driver-app` → `admin-dashboard` (board/OSTA views) → internal cron jobs.
3. **Alert pipeline cutover**: deploy `alert-service` consuming the same triggers; keep v1 emergency-alerts as fallback emitter for 2 weeks; compare `stx_alert_deliveries` vs `AlertNotificationLog` daily.
4. **OSTA importer go-live**: enable `OstaCsvAdapter` against staging exports; first prod import is dry-run-only for 1 week.

### Phase C — Contract (remove v1)

1. Stop writes to v1 tables (per-tenant flag flipped to `write_v1_disabled`).
2. Snapshot v1 tables to cold storage (per `DataRetention.md`).
3. Drop v1 columns/tables in two passes: first `Route`/`RouteStop`/`StudentAbsence`/`FleetAssignment`/`PresenceEvent`/`EmergencyAlert`/`NotificationPreference`/`AlertNotificationLog`; second pass after one academic year.
4. Remove dual-write code paths and feature flags.

## 5. Service-Level Changes

| Service                          | v2 changes                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| api-gateway                      | New REST/GraphQL surface for `routes`/`trips`/`stops`/`runs`/`ridership`/`guardians`; old endpoints kept as v1 prefix for transition     |
| student-management               | Owns `stx_students`, `stx_guardians`, `stx_student_guardians`, `stx_eligibility`, `stx_ridership`, `stx_student_absences` (consolidated) |
| student-presence                 | Owns `stx_boarding_events`; reads `stx_ridership` for roster                                                                             |
| gps-tracking                     | Adds `run_id` joins; emits compliance events to alert pipeline                                                                           |
| emergency-alerts → alert-service | Renamed/expanded; owns `stx_alerts`, `stx_alert_subscriptions`, `stx_alert_deliveries`, `stx_alert_audit`                                |
| notification-service             | Becomes pure channel dispatcher; subscription concerns move to alert-service                                                             |
| compliance-management            | Unchanged scope; provides read-model into `stx_drivers`                                                                                  |
| video-service                    | Unchanged; `run_id` added                                                                                                                |
| **integration-importer (new)**   | Hosts `OstaCsvAdapter`, `GtfsScheduleAdapter`, future `OstaApiAdapter`                                                                   |
| **alert-service (renamed/new)**  | Audience resolver, dispatcher, idempotency layer                                                                                         |

## 6. Deployment / Ops Considerations

- New tables require Postgres extensions: `postgis` (already used), `pgcrypto` for column-level encryption, `uuid-ossp`/`pg_uuidv7`.
- Tenant RLS policies updated per new tables — see `SecurityPrivacyArchitecture.md` (to be updated in a follow-up).
- Backfill jobs run via the existing turbo/worker infra; dry-run mode mandatory before each prod step.
- Monitoring: per-phase dashboards (mismatch rate, dual-write lag, alert delivery parity).

## 7. Risks & Mitigations

| Risk                                                                                           | Mitigation                                                                                          |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Backfill of `stx_ridership` produces wrong stop assignments where `Student.am_stop_id` is null | Pre-flight report; flag students missing assignments to school admins for manual fix before cutover |
| Driver app shows stale roster during dual-read flip                                            | Feature-flag flip is per-tenant + per-day; flips happen at 02:00 ET when no run is active           |
| Alert duplication during dual-write                                                            | Idempotency key on `(source, source_ref)` + delivery dedup on `(alert_id, user_id, channel)`        |
| OSTA importer schema drift                                                                     | Manifest validation + schema version field; importer rejects unknown columns unless `strict=false`  |
| PII leak via GTFS export                                                                       | Default export excludes `stx_*` columns containing PII; integration tests assert this               |

## 8. Sequencing Summary

| Week  | Action                                                                |
| ----- | --------------------------------------------------------------------- |
| 0     | Approve this design pack; confirm OSTA Data Sharing Agreement track   |
| 1–2   | Phase A migrations (additive); deploy `integration-importer` skeleton |
| 3–4   | Backfill jobs in staging; reconcile against v1                        |
| 5–6   | Phase B dual-write enabled in prod; 2-week observation                |
| 7–8   | Per-tenant dual-read flip starting with parent-app                    |
| 9–10  | OSTA prod import first dry-run; alert-service shadow mode             |
| 11–12 | Alert cutover; OSTA-sourced cancellations live                        |
| 13+   | Phase C contraction over the following academic-year boundary         |

## 9. Out of Scope (recorded for follow-up)

- Mobile app schema changes (offline cache shape) — separate ADR.
- GTFS-Realtime feed publication endpoint — separate design.
- Parent OAuth federation (OCSB/OCDSB) — interface stub only; full design when those IdPs are confirmed.
- RFID/NFC student tap-on/tap-off — Phase 2.
- Routing/optimisation engine — never; OSTA owns this.
