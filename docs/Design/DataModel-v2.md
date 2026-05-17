# SBTM Data Model v2 — GTFS-Aligned Core + School Transport Extension

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Supersedes: portions of `DatabaseSchema.md` (v1) — see `SchemaAudit-And-Migration.md` for mapping

## 1. Purpose & Scope

SBTM is being refocused on three capabilities:

1. **Bus tracking** — live vehicle position, route adherence, ETA.
2. **Student tracking** — driver-confirmed boarding/alighting at the stop level (per commit `d9a0b76`). RFID/NFC tap is out of scope for Phase 1.
3. **Alert management** — cancellations, delays, deviations, emergencies; SBTM-originated, parent-targeted.

This document defines the **target persisted data model**. It is structured as:

- **Core (GTFS-Schedule aligned)** — agency, calendar, route, trip, stop, stop_time, shape. These tables are imported from / exported to GTFS-Schedule with minimal transform.
- **School Transport Extension (STX)** — student, guardian, school, bell schedule, eligibility, run assignment, ridership roster, boarding event, absence, alert. These are SBTM-native.

The two layers are linked by stable foreign keys (`gtfs_route_id`, `gtfs_trip_id`, `gtfs_stop_id`). GTFS realtime is **not** persisted as canonical; it is a derived view of bus-tracking telemetry.

### Non-goals (Phase 1)

- Fare data (GTFS Fares-v2). School transport in Ottawa is publicly funded; no fare model required.
- Pathways / level data (in-station accessibility) — not relevant for school stops.
- Public-transit interlining and block_id semantics. We model `block_id` only when an operator explicitly chains AM→Midday→PM runs on the same vehicle.
- RFID/NFC student tagging.
- Parent OAuth federation (OCSB/OCDSB) — interface stub only; see §10.

## 2. Standards & References

- **GTFS-Schedule reference**: <https://gtfs.org/documentation/schedule/reference/>
- **google/transit canonical extensions**: <https://github.com/google/transit>
- **Relevant non-school precedents reviewed**:
  - GTFS extensions for school routing are not standardized; we adopt a custom namespace `stx_*` (school transport extension) as recommended by the GTFS Best Practices for "additional fields and files".
  - Ontario STAs (OSTA, STEO, RCJTC, …) do **not** publish public schemas, GTFS feeds, or REST APIs. Most use BusPlanner Web (GeoQuery / Edulog) or equivalent internal systems. Our import contract is therefore CSV/Excel-based and STA-agnostic; see `Integrations-STA.md`.
  - STN (Student Transportation News) industry surveys, NAPT (National Association for Pupil Transportation) routing software RFP templates, and BusPlanner Pro field exports inform the STX entity set (eligibility, hazard zones, courtesy seats, walk-zone exemption).

## 3. Tenancy & Identity

### 3.1 Hierarchy

```
STA (Student Transportation Authority — e.g. OSTA, STEO, RCJTC)
  └── Board (OCDSB, OCSB, CECCE, CEPEO, …)
        └── School
              └── Run / Trip / Stop / Student
Operator (Bus vendor) — independent; may serve multiple STAs via Operator contracts
```

SBTM supports **multiple STAs concurrently** (Ontario has ~30). Each STA is fully tenant-isolated from every other STA — no cross-STA reads except by Super Admin. A single Bus Operator may be contracted by multiple STAs; operator records are de-duplicated by `external_ids.legal_entity_id` but their contracts are scoped to one STA at a time.

Per session decision: **RBAC is strictly scoped by this tree.** A user is anchored to exactly one node; visibility cascades downward. Cross-board joint runs are out of scope; if encountered, they will be modelled as two parallel runs with shared vehicle assignment.

### 3.2 Identifiers

- All primary keys are **UUID v7** (time-ordered) — extends the precedent set by ADR-001 (route identity).
- GTFS export uses `gtfs_*_id` columns (string, ≤64 chars, GTFS-compliant) generated deterministically from the UUID + entity prefix (`R-`, `T-`, `S-`).
- External system IDs (OSTA `route_number`, board `student_number`) are stored separately in `external_ids` (JSONB) for round-tripping.

### 3.3 Tenant column convention

Every domain table carries `tenant_school_id UUID NOT NULL` (or higher node for consortium/board-scoped rows). RLS policies enforce isolation; existing `schoolId` columns in v1 services map directly.

## 4. GTFS-Aligned Core Tables

All field names follow GTFS naming exactly. Optional GTFS fields we omit in Phase 1 are noted as `— omit`.

### 4.1 `agency` (operators + boards)

| field                    | type      | notes                                                       |
| ------------------------ | --------- | ----------------------------------------------------------- |
| agency_id                | text PK   | One row per Bus Operator and one per Board acting-as-agency |
| agency_name              | text      |                                                             |
| agency_url               | text      |                                                             |
| agency_timezone          | text      | `America/Toronto`                                           |
| agency_lang              | text      | `en` / `fr`                                                 |
| agency_phone             | text      |                                                             |
| agency_email             | text      |                                                             |
| **stx_agency_kind**      | enum      | `sta` \| `board` \| `operator`                              |
| **stx_parent_agency_id** | FK→agency | hierarchy                                                   |

### 4.2 `routes`

| field                         | type           | notes                                                    |
| ----------------------------- | -------------- | -------------------------------------------------------- |
| route_id                      | text PK        |                                                          |
| agency_id                     | FK             |                                                          |
| route_short_name              | text           | STA route number, e.g. `OCDSB-1234`                      |
| route_long_name               | text           |                                                          |
| route_type                    | int            | `712` (school bus) per GTFS extended types               |
| route_color, route_text_color | text           |                                                          |
| **stx_sta_id**                | FK→stx_sta     | top-of-tree tenant anchor                                |
| **stx_school_id**             | FK→stx_schools | primary tenant anchor                                    |
| **stx_direction_kind**        | enum           | `am` \| `pm` \| `midday` \| `kindergarten` \| `activity` |
| **stx_shape_source**          | enum           | `sta_import` \| `sbtm_generated` \| `sta_admin_edited`   |

### 4.3 `trips`

| field          | type        | notes                                           |
| -------------- | ----------- | ----------------------------------------------- |
| trip_id        | text PK     |                                                 |
| route_id       | FK          |                                                 |
| service_id     | FK→calendar |                                                 |
| shape_id       | FK→shapes   | nullable                                        |
| trip_headsign  | text        | typically school name                           |
| direction_id   | int         | 0 outbound (to school), 1 inbound (from school) |
| block_id       | text        | only when operator chains runs                  |
| **stx_run_id** | FK→stx_runs | operational run grouping (vehicle+driver+date)  |

### 4.4 `stops`

| field               | type     | notes                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| stop_id             | text PK  |                                                                        |
| stop_name           | text     |                                                                        |
| stop_lat, stop_lon  | decimal  |                                                                        |
| location_type       | int      | 0 stop, 1 station (rare for school), 2 entrance                        |
| parent_station      | FK→stops | for school entrance/parking-loop pairing                               |
| **stx_stop_kind**   | enum     | `pickup` \| `school` \| `transfer` \| `daycare` \| `hazard_relocation` |
| **stx_hazard_zone** | bool     | flagged as inside hazard zone                                          |

### 4.5 `stop_times`

| field                      | type | notes                                                  |
| -------------------------- | ---- | ------------------------------------------------------ |
| trip_id                    | FK   | composite PK with stop_sequence                        |
| arrival_time               | time | HH:MM:SS, may exceed 24:00                             |
| departure_time             | time |                                                        |
| stop_id                    | FK   |                                                        |
| stop_sequence              | int  |                                                        |
| pickup_type, drop_off_type | int  | `2` = phone-agency-only used for "courtesy seat" stops |
| **stx_dwell_seconds**      | int  | scheduled dwell (board+alight time)                    |

### 4.6 `calendar` and `calendar_dates`

GTFS standard. Service IDs map to **school calendars** (instructional days minus PD days, holidays, weather cancellations). One `service_id` per board per academic year is the default; per-school overrides are supported via `calendar_dates` exceptions.

### 4.7 `shapes`

GTFS standard (`shape_id`, `shape_pt_lat`, `shape_pt_lon`, `shape_pt_sequence`, `shape_dist_traveled?`). **Required** for every route in Phase 1 — the driver app, parent app, and geofencing all depend on a navigation path.

Provenance is tracked on `routes.stx_shape_source`:

- `sta_import` — points came from the STA's CSV import (preferred).
- `sbtm_generated` — STA did not supply shapes; SBTM auto-generated by OSRM road-snapping sequential `stop_times` coordinates at import time. Flagged for STA Admin review.
- `sta_admin_edited` — an STA Admin saved an edited shape via the Route Planner UI (see `RoutePlanner.md`). Subsequent re-imports do **not** overwrite this value unless explicitly chosen.

In v1, route alignment lived in a single `Route.polyline` text column. v2 replaces this with the `shapes` table; per the aggressive cutover in `SchemaAudit-And-Migration.md`, the `Route.polyline` column is **dropped** — no dual-write retention window.

### 4.8 Omitted GTFS files (Phase 1)

`fare_*`, `pathways`, `levels`, `frequencies`, `transfers`, `feed_info` (kept), `attributions` (kept), `translations` (kept for FR/EN).

## 5. School Transport Extension (STX)

Tables prefixed `stx_`. All carry `tenant_school_id` and `created_at`/`updated_at`/`deleted_at`.

### 5.1 `stx_schools`

| field                | type                  | notes                                                                                                                                   |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| id                   | uuid PK               |                                                                                                                                         |
| board_id             | FK→stx_boards         |                                                                                                                                         |
| name                 | text                  |                                                                                                                                         |
| address              | text                  |                                                                                                                                         |
| location             | geography(Point)      |                                                                                                                                         |
| time_zone            | text                  |                                                                                                                                         |
| **bell_schedule_id** | FK→stx_bell_schedules | default; per-day overrides via `stx_bell_schedule_dates`                                                                                |
| **alerts_enabled**   | bool                  | per-school opt-in: when `true`, SBTM is the parent alert channel; when `false`, STA app remains primary and SBTM emits read-only mirror |
| external_ids         | jsonb                 | `{ "sta_school_code": "...", "board_school_code": "..." }`                                                                              |

### 5.2 `stx_bell_schedules` / `stx_bell_schedule_dates`

School start/end (and optional kindergarten/midday) times. Drives validation of `stop_times.arrival_time` for the school stop.

### 5.3 `stx_sta`, `stx_boards`

`stx_sta` is the top of the tenant tree — one row per Student Transportation Authority (OSTA, STEO, RCJTC, …). `stx_boards.sta_id` is a `NOT NULL` FK.

`stx_sta` columns:

| field                              | type        | notes                                                                          |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| id                                 | uuid PK     |                                                                                |
| name                               | text        | `Ottawa Student Transportation Authority`                                      |
| short_code                         | text UNIQUE | `OSTA`, `STEO`, `RCJTC`                                                        |
| region                             | text        | free text, e.g. `Ottawa`, `Eastern Ontario`                                    |
| time_zone                          | text        | `America/Toronto`                                                              |
| languages                          | text[]      | `['en','fr']`                                                                  |
| **boarding_event_retention_days**  | int         | default 395; configurable per STA Admin; drives purge of `stx_boarding_events` |
| **alert_retention_days**           | int         | default 730; per-STA configurable                                              |
| import_cadence                     | text        | default `quarterly`; informational only — actual cadence is contractual        |
| external_ids                       | jsonb       | `{ "legal_entity_id": "..." }`                                                 |
| created_at, updated_at, deleted_at | timestamptz |                                                                                |

The single-tenant assumption of v1 (one consortium = OSTA) is dropped. The `stx_consortium` name from the first draft is **superseded** by `stx_sta`.

### 5.4 `stx_operators` and `stx_operator_contracts`

Bus operators (vendors). `stx_operator_contracts` links operator ↔ STA (and optionally board) with effective dates and route count. The same physical operator (e.g. `Stock Transportation`) can hold contracts with multiple STAs; their `stx_operators` row is shared, contracts are not.

### 5.5 `stx_vehicles`

| field               | type    | notes                                                           |
| ------------------- | ------- | --------------------------------------------------------------- |
| id                  | uuid PK |                                                                 |
| operator_id         | FK      |                                                                 |
| license_plate       | text    |                                                                 |
| capacity_seated     | int     |                                                                 |
| capacity_wheelchair | int     |                                                                 |
| equipment           | jsonb   | `{ "camera": true, "gps_device_id": "...", "har_alert": true }` |
| status              | enum    | `active` \| `maintenance` \| `inactive`                         |

### 5.6 `stx_drivers`

| field                                                 | type             | notes                                            |
| ----------------------------------------------------- | ---------------- | ------------------------------------------------ |
| id                                                    | uuid PK          |                                                  |
| operator_id                                           | FK               |                                                  |
| user_id                                               | FK→users         | login identity                                   |
| license_number                                        | text (encrypted) |                                                  |
| license_class                                         | text             |                                                  |
| license_expiry, medical_expiry, background_check_date | date             | mirrored read-model from `compliance-management` |

### 5.7 `stx_runs` (operational pairing)

A **run** is the realised execution of one or more GTFS trips on a given service date by a specific vehicle and driver.
| field | type | notes |
|---|---|---|
| id | uuid PK | |
| service_date | date | |
| trip_ids | text[] | one or more `trips.trip_id` (block) |
| vehicle_id | FK→stx_vehicles | |
| driver_id | FK→stx_drivers | |
| backup_driver_id | FK | optional |
| status | enum | `scheduled` \| `in_progress` \| `completed` \| `cancelled` \| `delayed` |
| cancellation_reason | text | |

`stx_runs` replaces the v1 `FleetAssignment` entity and is the join point for live tracking, alerts, and ridership.

### 5.8 `stx_students`

| field                      | type             | notes                                                        |
| -------------------------- | ---------------- | ------------------------------------------------------------ |
| id                         | uuid PK          |                                                              |
| school_id                  | FK               |                                                              |
| board_student_number       | text (encrypted) | PII — board-issued                                           |
| legal_name, preferred_name | text (encrypted) |                                                              |
| grade                      | text             | JK..12                                                       |
| date_of_birth              | date (encrypted) |                                                              |
| home_address               | text (encrypted) |                                                              |
| home_location              | geography(Point) | for walk-zone calc                                           |
| status                     | enum             | `enrolled` \| `inactive` \| `graduated` \| `withdrawn`       |
| medical_flags              | jsonb            | `{ "epipen": true, "seizure_plan": "..." }` — encrypted      |
| transport_flags            | jsonb            | `{ "cs_seat": true, "harness": true, "ac_required": false }` |
| external_ids               | jsonb            |                                                              |

### 5.9 `stx_guardians` and `stx_student_guardians`

Many-to-many. `stx_student_guardians.relationship` (parent, guardian, emergency-contact, daycare-provider). `is_primary_pickup` flag drives notification routing. Daycare providers can be guardians-of-record for pickup/drop-off authorization.

### 5.10 `stx_eligibility`

Per-student, per-direction eligibility derived from board policy + walk-zone + courtesy-seat status.
| field | type |
|---|---|
| student_id | FK |
| direction | enum am/pm/midday |
| eligibility_kind | enum `mandatory` \| `courtesy` \| `hazard_exemption` \| `medical` \| `none` |
| effective_from, effective_to | date |
| approved_by_user_id | FK→users |

### 5.11 `stx_ridership` (assignment of student to stop on a trip)

| field                        | type     | notes                                    |
| ---------------------------- | -------- | ---------------------------------------- |
| id                           | uuid PK  |                                          |
| student_id                   | FK       |                                          |
| trip_id                      | FK→trips | the GTFS trip the student is assigned to |
| stop_id                      | FK→stops |                                          |
| direction_id                 | int      | 0/1                                      |
| effective_from, effective_to | date     |                                          |
| status                       | enum     | `active` \| `pending` \| `revoked`       |

This is the **canonical "who rides what bus where"** table. The driver-app roster panel reads from this joined to `stx_students`.

### 5.12 `stx_boarding_events` (driver-confirmed)

| field                 | type             | notes                                                                      |
| --------------------- | ---------------- | -------------------------------------------------------------------------- |
| id                    | uuid PK          |                                                                            |
| run_id                | FK→stx_runs      |                                                                            |
| stop_id               | FK→stops         |                                                                            |
| student_id            | FK→stx_students  |                                                                            |
| event_kind            | enum             | `boarded` \| `alighted` \| `no_show` \| `boarded_at_alt_stop` \| `refused` |
| recorded_at           | timestamptz      |                                                                            |
| recorded_by_driver_id | FK               |                                                                            |
| source                | enum             | `driver_app` (Phase 1 only); RFID/SMARTTAG reserved                        |
| location              | geography(Point) | vehicle GPS at time of event                                               |
| notes                 | text             |                                                                            |

State machine on the driver-app side is unchanged: `not_boarded → boarded → alighted` (per `apps/driver-app/src/services/roster.service.ts`).

### 5.13 `stx_student_absences`

Pre-reported absences. v1 entity is migrated unchanged in shape; relocated from api-gateway into student domain. Closes the loop with `stx_boarding_events` by suppressing `no_show` alerts.

### 5.14 `stx_alerts`, `stx_alert_subscriptions`, `stx_alert_deliveries`

See `Alerts.md` for the full alert schema. The data-model surface is:

- `stx_alerts` — one row per alert (route cancellation, delay, deviation, emergency, weather closure).
- `stx_alert_subscriptions` — per-user, per-route or per-student opt-ins; default is "all routes my student rides".
- `stx_alert_deliveries` — per-channel send log (push / SMS / email / in-app).

### 5.15 `stx_calendar_link`

Maps GTFS `calendar.service_id` ↔ `stx_schools.id` and `stx_boards.id`. Allows board-wide service IDs (most common) and per-school exceptions.

## 6. Ridership-to-Live-Tracking Join

The driver-app stop roster modal needs (for the current stop on the current run):

```
SELECT s.preferred_name, s.grade, s.transport_flags, r.status
FROM stx_ridership r
JOIN stx_students s ON s.id = r.student_id
JOIN trips t ON t.trip_id = r.trip_id
JOIN stx_runs run ON t.trip_id = ANY(run.trip_ids)
WHERE run.id = :current_run_id
  AND r.stop_id = :current_stop_id
  AND r.direction_id = :current_direction
  AND r.status = 'active'
  AND :service_date BETWEEN r.effective_from AND COALESCE(r.effective_to, '9999-12-31')
  AND NOT EXISTS (
    SELECT 1 FROM stx_student_absences a
    WHERE a.student_id = s.id AND a.trip_date = :service_date
      AND a.confirmation_status = 'confirmed'
      AND (a.route_type IN (:current_direction_label, 'BOTH'))
  );
```

Boarding state is overlaid from `stx_boarding_events` (latest event per student per run).

## 7. Realtime / Telemetry (not persisted as canonical)

The existing `gps-tracking` Prisma tables (`LocationPoint`, `RouteLifecycleEvent`, `RouteGeofence`, `RouteDeviationEvent`) remain in their own schema. They reference `stx_runs.id` (new column) instead of free-form `routeId`/`vehicleId` strings. A scheduled job emits a **GTFS-Realtime** projection (`vehicle_positions.pb`, `trip_updates.pb`, `service_alerts.pb`) for export.

## 8. Audit, PII, Retention

- Tables flagged with encrypted columns use envelope encryption (KMS-managed key per tenant board).
- Soft-delete (`deleted_at`) on all `stx_*` tables; hard-purge job after retention window per `DataRetention.md`.
- All writes against `stx_students`, `stx_guardians`, `stx_boarding_events`, `stx_alerts` produce an `audit_log` row (existing `compliance-management.audit_logs`, broadened scope).

## 9. GTFS Import / Export Contract

- **Import**: standard GTFS-Schedule ZIP. Unknown `stx_*` columns are tolerated; STA imports via CSV adapter (see `Integrations-STA.md` and `ImportMappings.md`) are normalised through this same code path.
- **Export**: `feed_info.txt` mandatory; STX columns prefixed `stx_` are emitted in the same files (per GTFS spec, additional fields are permitted). A "GTFS-only" export omits `stx_*` columns for downstream public-transit consumers.
- Export is **board-scoped by default** (one feed per board). STA-wide and Super-Admin-wide exports are supported and automatically exclude student/guardian PII.

## 10. Identity & RBAC (Phase 1)

| Role              | Anchor   | Visibility                                    |
| ----------------- | -------- | --------------------------------------------- |
| Super Admin       | global   | all STAs                                      |
| STA Admin         | STA      | own STA ↓ (all boards/schools under that STA) |
| Board Admin       | board    | own board ↓                                   |
| School Admin      | school   | own school ↓                                  |
| Operator Admin    | operator | own operator's runs/vehicles/drivers          |
| Driver            | driver   | own assigned runs (today + ±N days)           |
| Parent / Guardian | guardian | own students' runs, stops, alerts             |

The role enum (`/libs/common/src/decorators/roles.decorator.ts`) is rewritten to replace `OSTA_ADMIN` with `STA_ADMIN` and add `OPERATOR_ADMIN`. Per the aggressive cutover in `SchemaAudit-And-Migration.md`, `OSTA_ADMIN` is **deleted outright** — no runtime alias, no backward-compat shim. Any surviving reference is a compile error and is caught by the Phase E CI grep gate.

**OAuth federation**: A `users.identity_provider` column (`local` \| `oidc:ocsb` \| `oidc:ocdsb`) is added now but only `local` is wired in Phase 1.

## 11. Resolved Decisions & Deferred Items

Per session direction (2026-05-15):

1. **Operator-Board contracts** — Resolved: STAs assign routes to operators. `stx_operator_contracts` is scoped to `sta_id`; board is an optional refinement column.
2. **Courtesy-seat lifecycle** — Resolved: annual reassignment with mid-year revocation if a mandatory-eligible student requires the seat. Modelled via `stx_eligibility.eligibility_kind = 'courtesy'` with `effective_from/to`; no additional versioning needed.
3. **Daycare pickup** — Resolved (Phase 1): keep simple. A daycare is a `stops` row (`stx_stop_kind=daycare`) when it is a pickup point; a daycare contact, when one needs notifications, is entered as a `stx_guardians` row with `relationship='daycare-provider'`. No daycare-specific entities are introduced in Phase 1.
4. **Weather cancellation cascade** — Resolved: cascades follow the tenant tree. An STA-scoped alert reaches every board, school, and parent under that STA. See `Alerts.md` §5 for audience resolution at `scope_kind='sta'`.
5. **GTFS-Realtime publication** — Deferred: internal-only in Phase 1. Public publication endpoint is a separate design.
6. **Retention of `stx_boarding_events`** — Resolved: per-STA configurable via `stx_sta.boarding_event_retention_days` (default 395 = one academic year + ~30 days). Alert retention likewise per-STA (`alert_retention_days`, default 730).
7. **Per-school alert opt-in** — Resolved: `stx_schools.alerts_enabled` controls whether SBTM is the primary parent alert channel for that school. Lets boards/schools transition off the STA's existing app at their own pace.
8. **Stable IDs across academic years** — Recommendation to STAs: re-use `route_short_name` for the same physical route across years; persist `board_student_number` across grades within a board; additionally capture the Ontario Education Number (OEN) in `stx_students.external_ids.oen` for cross-board persistence.

Open items deferred to a later design:

- SMS provider selection (user: free tier for testing).
- STA webhook / event-feed contract (Phase 2).
- SBTM ↔ STA-app dual-send transition policy (defer; per-school `alerts_enabled` enables co-existence in the meantime).
- RFID / NFC tap-on/tap-off (Phase 2).
- Parent OAuth federation (OCSB/OCDSB) — stub only until those IdPs are confirmed.

## 12. Migration & Phasing

See `SchemaAudit-And-Migration.md` for the v1 → v2 mapping and rollout plan.
