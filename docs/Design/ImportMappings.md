# SBTM Import Mappings — Field-Level Reference

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Related: `DataModel-v2.md`, `Integrations-STA.md`, `templates/*.csv`, `samples/two-sta-bundle/`

## 0. Conventions

- UTF-8, header row required, comma-delimited, RFC 4180 quoting.
- Headers are normative; adapter accepts case-insensitive variations and trims whitespace.
- Dates: ISO 8601 (`YYYY-MM-DD`). Times: GTFS-style `HH:MM:SS` (may exceed 24:00:00).
- Coordinates: WGS84 decimal degrees, 6 decimal places (~0.11 m precision).
- All PII columns are encrypted at rest in `stage_*` tables and in canonical `stx_*` tables.
- Manifest: every import session includes `manifest.json` with `sta_short_code`, `export_id`, `export_at`, per-file `sha256` and `row_counts`. Mismatch aborts the session.
- Template files (`docs/Design/templates/*.csv`) are header-only references; sample-row siblings live under `docs/Design/samples/two-sta-bundle/`.

There are **three onboarding layers**. Each layer has its own files, target tables, validation rules, and a sample row. STAs / Boards may submit any subset they own; missing layers can be populated via the Admin UI.

---

## Layer 1 — STA Transport Data (quarterly, STA → SBTM SFTP)

Owner: STA. Cadence: default quarterly, on-demand permitted.

### 1.1 `sta-routes.csv`

| column           | target                                                                 | required | validation                                            |
| ---------------- | ---------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| sta_route_number | `routes.route_short_name` (also `external_ids.{sta}_route_number`)     | yes      | unique per STA per academic year                      |
| description      | `routes.route_long_name`                                               | no       |                                                       |
| board_code       | resolves `routes.stx_school_id.board_id` via `external_ids.board_code` | yes      | must exist in `stx_boards` for this STA               |
| school_code      | `stx_schools.external_ids.{sta}_school_code`                           | yes      | one row per route-school pair                         |
| direction        | `routes.stx_direction_kind`                                            | yes      | one of `AM` \| `PM` \| `MIDDAY` \| `KG` \| `ACTIVITY` |
| operator_code    | `stx_operators.external_ids.{sta}_operator_code`                       | yes      | must exist or be created via `sta-operators.csv`      |
| effective_from   | `calendar.start_date`                                                  | yes      | ISO date                                              |
| effective_to     | `calendar.end_date`                                                    | yes      | ISO date ≥ `effective_from`                           |

Sample row: see `samples/two-sta-bundle/osta/sta-routes.csv`.

### 1.2 `sta-stops.csv`

| column      | target                              | required | validation                                                                                      |
| ----------- | ----------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| sta_stop_id | `stops.stop_id` (prefixed `{STA}-`) | yes      | stable across imports                                                                           |
| name        | `stops.stop_name`                   | yes      |                                                                                                 |
| latitude    | `stops.stop_lat`                    | yes      | −90..90                                                                                         |
| longitude   | `stops.stop_lon`                    | yes      | −180..180                                                                                       |
| stop_kind   | `stops.stx_stop_kind`               | no       | one of `pickup` \| `school` \| `transfer` \| `daycare` \| `hazard_relocation`; default `pickup` |
| hazard_zone | `stops.stx_hazard_zone`             | no       | bool; default false                                                                             |

### 1.3 `sta-stop-times.csv` (becomes `stop_times`)

| column              | target                         | required | validation                         |
| ------------------- | ------------------------------ | -------- | ---------------------------------- |
| sta_route_number    | join → `routes.route_id`       | yes      |                                    |
| sta_trip_id         | join → `trips.trip_id`         | no       | if absent, trip derived (see §1.4) |
| sta_stop_id         | join → `stops.stop_id`         | yes      |                                    |
| sequence            | `stop_times.stop_sequence`     | yes      | strictly increasing per trip       |
| scheduled_arrival   | `stop_times.arrival_time`      | yes      | GTFS HH:MM:SS                      |
| scheduled_departure | `stop_times.departure_time`    | yes      | ≥ arrival                          |
| dwell_seconds       | `stop_times.stx_dwell_seconds` | no       | int ≥ 0                            |

### 1.4 `sta-trips.csv`

| column           | target                   | required | validation                                                                    |
| ---------------- | ------------------------ | -------- | ----------------------------------------------------------------------------- |
| sta_trip_id      | `trips.trip_id`          | no       | if absent, derived deterministically from `route_id + service_id + direction` |
| sta_route_number | join → `routes.route_id` | yes      |                                                                               |
| service_id       | `trips.service_id`       | yes      | must exist in `calendar`                                                      |
| direction_id     | `trips.direction_id`     | yes      | 0 outbound (to school) / 1 inbound                                            |
| shape_id         | `trips.shape_id`         | no       | join → `sta-shapes.csv`                                                       |
| headsign         | `trips.trip_headsign`    | no       |                                                                               |
| block_id         | `trips.block_id`         | no       | only for chained AM→Midday→PM                                                 |

### 1.5 `sta-shapes.csv` — navigation path (GTFS-shapes)

| column              | target                       | required | validation                           |
| ------------------- | ---------------------------- | -------- | ------------------------------------ |
| shape_id            | `shapes.shape_id`            | yes      |                                      |
| shape_pt_lat        | `shapes.shape_pt_lat`        | yes      | −90..90                              |
| shape_pt_lon        | `shapes.shape_pt_lon`        | yes      | −180..180                            |
| shape_pt_sequence   | `shapes.shape_pt_sequence`   | yes      | strictly increasing                  |
| shape_dist_traveled | `shapes.shape_dist_traveled` | no       | metres, monotonically non-decreasing |

**If the file is absent or empty for a route**, SBTM auto-generates a shape via OSRM road-snap and sets `routes.stx_shape_source = 'sbtm_generated'`. See `Integrations-STA.md` §5.1 and `RoutePlanner.md` §5.

### 1.6 `sta-operators.csv`

| column          | target                                           | required | validation                    |
| --------------- | ------------------------------------------------ | -------- | ----------------------------- |
| operator_code   | `stx_operators.external_ids.{sta}_operator_code` | yes      |                               |
| legal_name      | `stx_operators.legal_name`                       | yes      |                               |
| legal_entity_id | `stx_operators.external_ids.legal_entity_id`     | no       | de-dupes operator across STAs |
| contact_email   | `stx_operators.contact_email`                    | no       |                               |
| contact_phone   | `stx_operators.contact_phone`                    | no       |                               |

### 1.7 `sta-vehicles.csv`

| column              | target                                         | required | validation                                               |
| ------------------- | ---------------------------------------------- | -------- | -------------------------------------------------------- |
| vehicle_code        | `stx_vehicles.external_ids.{sta}_vehicle_code` | yes      |                                                          |
| operator_code       | join → `stx_operators`                         | yes      |                                                          |
| license_plate       | `stx_vehicles.license_plate`                   | yes      |                                                          |
| capacity_seated     | `stx_vehicles.capacity_seated`                 | yes      | int ≥ 0                                                  |
| capacity_wheelchair | `stx_vehicles.capacity_wheelchair`             | no       | int ≥ 0                                                  |
| equipment_json      | `stx_vehicles.equipment` (jsonb)               | no       | `{"camera":true,"har_alert":true,"gps_device_id":"..."}` |

---

## Layer 2 — Board / School (per-STA onboarding; updates on change)

Owner: STA or Board. Cadence: once at onboarding, then on change.

### 2.1 `board-school.csv`

| column              | target                                                  | required | validation                   |
| ------------------- | ------------------------------------------------------- | -------- | ---------------------------- |
| sta_short_code      | `stx_sta.short_code` (lookup; row must exist)           | yes      | e.g. `OSTA`, `RCJTC`         |
| board_code          | `stx_boards.external_ids.board_code`                    | yes      |                              |
| board_name          | `stx_boards.name`                                       | yes      |                              |
| school_code         | `stx_schools.external_ids.{sta}_school_code`            | yes      | unique per board             |
| school_name         | `stx_schools.name`                                      | yes      |                              |
| address             | `stx_schools.address`                                   | yes      |                              |
| latitude, longitude | `stx_schools.location`                                  | yes      | WGS84                        |
| bell_schedule_code  | `stx_bell_schedules.code` (lookup; auto-created if new) | no       |                              |
| alerts_enabled      | `stx_schools.alerts_enabled`                            | no       | bool; default false (opt-in) |

---

## Layer 3 — Students / Parents (board onboarding + ongoing)

Owner: Board (via STA passthrough) or School Admin (via UI). Cadence: on enrolment, on change. PII — encrypted in transit and at rest.

### 3.1 `students.csv`

| column               | target                                          | required | validation                                                                    |
| -------------------- | ----------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| board_student_number | `stx_students.board_student_number` (encrypted) | yes      | persistent across grades within board                                         |
| oen                  | `stx_students.external_ids.oen` (encrypted)     | no       | Ontario Education Number — cross-board persistence                            |
| legal_name           | `stx_students.legal_name` (encrypted)           | yes      |                                                                               |
| preferred_name       | `stx_students.preferred_name` (encrypted)       | no       |                                                                               |
| grade                | `stx_students.grade`                            | yes      | one of `JK,SK,1..12`                                                          |
| date_of_birth        | `stx_students.date_of_birth` (encrypted)        | no       |                                                                               |
| school_code          | `stx_students.school_id` (lookup)               | yes      | must exist                                                                    |
| home_address         | `stx_students.home_address` (encrypted)         | yes      |                                                                               |
| home_lat, home_lon   | `stx_students.home_location`                    | yes      |                                                                               |
| eligibility_kind     | `stx_eligibility.eligibility_kind`              | yes      | one of `mandatory` \| `courtesy` \| `hazard_exemption` \| `medical` \| `none` |
| medical_flags_json   | `stx_students.medical_flags` (encrypted)        | no       |                                                                               |
| transport_flags_json | `stx_students.transport_flags`                  | no       |                                                                               |

### 3.2 `guardians.csv`

| column             | target                                     | required | validation                  |
| ------------------ | ------------------------------------------ | -------- | --------------------------- |
| guardian_code      | `stx_guardians.external_ids.guardian_code` | yes      | stable across imports       |
| legal_name         | `stx_guardians.legal_name` (encrypted)     | yes      |                             |
| email              | `stx_guardians.email` (encrypted)          | no       | one of email/phone required |
| phone              | `stx_guardians.phone` (encrypted)          | no       | E.164 preferred             |
| preferred_language | `stx_guardians.preferred_language`         | no       | `en` \| `fr`; default `en`  |

### 3.3 `student-guardians.csv` (M:N link)

| column               | target                                    | required | validation                                                                 |
| -------------------- | ----------------------------------------- | -------- | -------------------------------------------------------------------------- |
| board_student_number | join → `stx_students`                     | yes      |                                                                            |
| guardian_code        | join → `stx_guardians`                    | yes      |                                                                            |
| relationship         | `stx_student_guardians.relationship`      | yes      | one of `parent` \| `guardian` \| `emergency-contact` \| `daycare-provider` |
| is_primary_pickup    | `stx_student_guardians.is_primary_pickup` | no       | bool; default false                                                        |
| effective_from       | `stx_student_guardians.effective_from`    | no       | ISO date                                                                   |

### 3.4 `ridership.csv`

| column               | target                              | required | validation |
| -------------------- | ----------------------------------- | -------- | ---------- |
| board_student_number | `stx_ridership.student_id` (lookup) | yes      |            |
| sta_route_number     | join → `trip_id`                    | yes      |            |
| sta_stop_id          | `stx_ridership.stop_id`             | yes      |            |
| direction            | `stx_ridership.direction_id`        | yes      | 0/1        |
| effective_from       | `stx_ridership.effective_from`      | yes      |            |
| effective_to         | `stx_ridership.effective_to`        | no       |            |

---

## Operational (ad-hoc) — `cancellations.csv`

Owner: STA / Board / School Admin. Used when no webhook exists.

| column           | target                                             | required | validation                                                                           |
| ---------------- | -------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| sta_event_id     | `stx_alerts.source_ref`                            | yes      | unique per `source` for idempotency                                                  |
| event_type       | `stx_alerts.event_type`                            | yes      | one of `route_cancelled` \| `route_delayed` \| `stop_relocated` \| `weather_closure` |
| severity         | `stx_alerts.severity`                              | yes      | one of `info` \| `notice` \| `warning` \| `critical`                                 |
| scope_kind       | `stx_alerts.scope_kind`                            | yes      | one of `sta` \| `board` \| `school` \| `route` \| `run` \| `stop`                    |
| scope_code       | resolves to `stx_alerts.scope_id` via external_ids | yes      |                                                                                      |
| service_date     | `stx_alerts.service_date`                          | yes      |                                                                                      |
| effective_from   | `stx_alerts.effective_from`                        | yes      |                                                                                      |
| effective_to     | `stx_alerts.effective_to`                          | yes      |                                                                                      |
| body_template    | i18n template key                                  | yes      | must exist in `libs/i18n`                                                            |
| body_params_json | template params                                    | no       |                                                                                      |

---

## Validation lifecycle

1. **Schema check** — header parity, type coercion, mandatory-column presence.
2. **Foreign-key resolution** — `board_code`, `school_code`, `sta_route_number`, etc. resolve to UUIDs; missing parents fail the row.
3. **Business rules** — bell-schedule plausibility (`stop_times.arrival_time` at `stx_stop_kind='school'` within 30 min of bell time), eligibility validity (`mandatory` ↔ `stx_students.home_location` outside walk-zone), ridership coverage (every active student has at most one AM and one PM ridership row).
4. **Dry-run report** — counts of inserts/updates/tombstones per entity; flagged when thresholds exceeded (default >5% student churn requires STA Admin approval).
5. **Commit** — within an `import_session`; rollback on any fatal violation.

## Per-STA aliasing

The literal `sta_*` prefixes in the file headers may be replaced by an STA-specific synonym defined in `adapter-config.yaml` (e.g. an OSTA export may use `osta_route_number`). The canonical `stx_*` target columns do not change.
