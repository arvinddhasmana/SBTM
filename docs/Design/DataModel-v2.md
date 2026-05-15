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
  - OSTA (Ottawa Student Transportation Authority) does **not** publish a public schema, GTFS feed, or REST API. Their consortium platform (BusPlanner Web, by GeoQuery) uses an internal schema not publicly documented. Our import contract is therefore CSV/Excel-based; see `Integrations-OSTA.md`.
  - STN (Student Transportation News) industry surveys, NAPT (National Association for Pupil Transportation) routing software RFP templates, and BusPlanner Pro field exports inform the STX entity set (eligibility, hazard zones, courtesy seats, walk-zone exemption).

## 3. Tenancy & Identity

### 3.1 Hierarchy

```
Consortium (OSTA)
  └── Board (OCDSB, OCSB, CECCE, CEPEO, …)
        └── School
              └── Run / Trip / Stop / Student
Operator (Bus vendor) — independent; spans boards via Operator-Board contracts
```

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
| **stx_agency_kind**      | enum      | `consortium` \| `board` \| `operator`                       |
| **stx_parent_agency_id** | FK→agency | hierarchy                                                   |

### 4.2 `routes`

| field                         | type           | notes                                                    |
| ----------------------------- | -------------- | -------------------------------------------------------- |
| route_id                      | text PK        |                                                          |
| agency_id                     | FK             |                                                          |
| route_short_name              | text           | OSTA route number, e.g. `OCDSB-1234`                     |
| route_long_name               | text           |                                                          |
| route_type                    | int            | `712` (school bus) per GTFS extended types               |
| route_color, route_text_color | text           |                                                          |
| **stx_school_id**             | FK→stx_schools | primary tenant anchor                                    |
| **stx_direction_kind**        | enum           | `am` \| `pm` \| `midday` \| `kindergarten` \| `activity` |

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

GTFS standard. Imported from OSTA polylines; supplemented by GPS-derived snapped polylines (see `gps-tracking` Prisma `RouteGeofence`).

### 4.8 Omitted GTFS files (Phase 1)

`fare_*`, `pathways`, `levels`, `frequencies`, `transfers`, `feed_info` (kept), `attributions` (kept), `translations` (kept for FR/EN).

## 5. School Transport Extension (STX)

Tables prefixed `stx_`. All carry `tenant_school_id` and `created_at`/`updated_at`/`deleted_at`.

### 5.1 `stx_schools`

| field                | type                  | notes                                                       |
| -------------------- | --------------------- | ----------------------------------------------------------- |
| id                   | uuid PK               |                                                             |
| board_id             | FK→stx_boards         |                                                             |
| name                 | text                  |                                                             |
| address              | text                  |                                                             |
| location             | geography(Point)      |                                                             |
| time_zone            | text                  |                                                             |
| **bell_schedule_id** | FK→stx_bell_schedules | default; per-day overrides via `stx_bell_schedule_dates`    |
| external_ids         | jsonb                 | `{ "osta_school_code": "...", "board_school_code": "..." }` |

### 5.2 `stx_bell_schedules` / `stx_bell_schedule_dates`

School start/end (and optional kindergarten/midday) times. Drives validation of `stop_times.arrival_time` for the school stop.

### 5.3 `stx_boards`, `stx_consortium`

Tenant tree above `stx_schools`. `stx_consortium` is typically a single row (OSTA).

### 5.4 `stx_operators` and `stx_operator_contracts`

Bus operators (vendors). `stx_operator_contracts` links operator ↔ board with effective dates and route count.

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

- **Import**: standard GTFS-Schedule ZIP. Unknown `stx_*` columns are tolerated; OSTA imports via CSV adapter (see `Integrations-OSTA.md`) are normalised through this same code path.
- **Export**: `feed_info.txt` mandatory; STX columns prefixed `stx_` are emitted in the same files (per GTFS spec, additional fields are permitted). A "GTFS-only" export omits `stx_*` columns for downstream public-transit consumers.
- Export is **board-scoped by default** (one feed per board). Consortium-wide export is a Super Admin action and excludes student/guardian PII automatically.

## 10. Identity & RBAC (Phase 1)

| Role              | Anchor     | Visibility                           |
| ----------------- | ---------- | ------------------------------------ |
| Super Admin       | consortium | all                                  |
| OSTA Admin        | consortium | all (operational)                    |
| Board Admin       | board      | own board ↓                          |
| School Admin      | school     | own school ↓                         |
| Operator Admin    | operator   | own operator's runs/vehicles/drivers |
| Driver            | driver     | own assigned runs (today + ±N days)  |
| Parent / Guardian | guardian   | own students' runs, stops, alerts    |

Existing role enum (`/libs/common/src/decorators/roles.decorator.ts`) already includes SUPER_ADMIN, OSTA_ADMIN, BOARD_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT — no enum change needed; an OPERATOR_ADMIN value is added.

**OAuth federation**: A `users.identity_provider` column (`local` \| `oidc:ocsb` \| `oidc:ocdsb`) is added now but only `local` is wired in Phase 1.

## 11. Open Questions

1. **Operator-Board contracts** — does OSTA assign routes to operators, or do boards contract directly? This affects whether `stx_operator_contracts` is board-scoped or consortium-scoped.
2. **Courtesy-seat lifecycle** — daily reassignment vs. annual? Drives whether `stx_eligibility` needs versioning beyond `effective_from/to`.
3. **Daycare pickup** — is a daycare a kind of `stop` (location_type 0 with `stx_stop_kind=daycare`) or a kind of `guardian`? Phase 1 model supports both; pick one for consistency.
4. **Weather cancellation cascade** — is it always whole-board, or sometimes per-zone? Affects whether `stx_alerts.scope` needs a polygon vs. a board_id.
5. **GTFS-Realtime publication** — internal-only, or do we publish to a board-public endpoint (e.g., for board apps)?
6. **Retention of `stx_boarding_events`** — proposed 13 months (one academic year + 1) for incident investigation. Confirm with privacy/legal.

## 12. Migration & Phasing

See `SchemaAudit-And-Migration.md` for the v1 → v2 mapping and rollout plan.
