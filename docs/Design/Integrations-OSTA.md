# OSTA Integration Design

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Related: `DataModel-v2.md`, `Alerts.md`

## 1. Context

OSTA (Ottawa Student Transportation Authority) operates the consortium that plans and dispatches school transportation for OCDSB and OCSB. Their public touchpoints are:

- `ottawaschoolbus.ca` — public information site, route delay/cancellation page.
- "OSTA App" (proprietary mobile app) — push alerts, route status lookup. Reference: <https://www.ottawaschoolbus.ca/get-ostas-app>.
- BusPlanner Web (vendor: GeoQuery / Edulog) — internal route-planning system. **No public REST API, no GTFS feed, no event stream.**

**Implication**: Phase 1 integration must assume **batch import via files** with the consortium's cooperation. A real-time event/API integration is a Phase 2 ask of OSTA and is **designed for, not built**.

## 2. Goals

| #   | Goal                                                                                            | Phase |
| --- | ----------------------------------------------------------------------------------------------- | ----- |
| G1  | Import route, stop, vehicle, run, ridership data from OSTA into SBTM                            | 1     |
| G2  | Detect changes between two consecutive imports and apply deltas without losing tracking history | 1     |
| G3  | SBTM is the **system of record for alerts to parents** for participating boards/schools         | 1     |
| G4  | Allow OSTA-originated alert ingestion (fallback during transition)                              | 1     |
| G5  | Bidirectional event/API integration when OSTA exposes one                                       | 2     |

## 3. Non-goals

- Reverse-engineering, scraping, or unauthorised access to BusPlanner endpoints. Any integration requires written data-sharing agreement with OSTA.
- Replacing OSTA's internal routing/optimisation. SBTM consumes their plan; it does not re-plan.

## 4. Integration Architecture

```
+------------------+      file drop       +-------------------+      idempotent import     +-----------+
|   OSTA / Board   |  ───────────────►    |   SBTM Importer    |  ──────────────────────►   |  SBTM DB  |
|   export job     |  SFTP / signed-S3    |   (adapter pattern)|                            |  (v2)     |
+------------------+                       +-------------------+                            +-----------+
        ▲                                          │
        │  alert webhook (Phase 2)                 ├── delta diff & dry-run report
        └──────────────────────────────────────────┴── audit log
```

The **Importer** is a new service/worker (`services/integration-importer`, name TBD) with a pluggable adapter interface so the same pipeline serves OSTA today and other consortia tomorrow.

### 4.1 Adapter interface

```ts
interface TransportDataAdapter {
  readonly source: string; // 'osta-csv', 'gtfs-zip', 'busplanner-api'
  validate(input: SourceFiles): Promise<ValidationReport>;
  toCanonical(input: SourceFiles): AsyncIterable<CanonicalRecord>;
  // CanonicalRecord = discriminated union over the v2 entities (Route, Trip,
  // Stop, StopTime, Run, Student, Guardian, Ridership, …)
}
```

Three adapters in scope:

| Adapter               | Source                                  | Status                                             |
| --------------------- | --------------------------------------- | -------------------------------------------------- |
| `OstaCsvAdapter`      | OSTA-supplied CSV/XLSX exports (see §5) | Phase 1                                            |
| `GtfsScheduleAdapter` | Standard GTFS-Schedule ZIP              | Phase 1 (reuses for boards already producing GTFS) |
| `OstaApiAdapter`      | OSTA REST/event feed                    | Phase 2 stub                                       |

### 4.2 Why file-based first

- Zero dependency on OSTA engineering effort; only requires they email/SFTP a regular export.
- BusPlanner has standard "Routes / Stops / Students / Trips" report exports already used by school boards.
- Files are auditable, replayable, diffable.

## 5. OSTA CSV Import Contract

Five files, UTF-8, header row required, comma-delimited, RFC 4180 quoting. Names are normative; the adapter accepts case-insensitive variations.

### 5.1 `routes.csv`

| column            | maps to                                         | notes                    |
| ----------------- | ----------------------------------------------- | ------------------------ |
| osta_route_number | `routes.route_short_name`                       | natural key              |
| description       | `routes.route_long_name`                        |                          |
| board_code        | `agency_id` lookup                              | OCDSB/OCSB/CECCE/CEPEO   |
| school_code       | `stx_schools.external_ids.osta_school_code`     | one row per route-school |
| direction         | `routes.stx_direction_kind`                     | AM/PM/MIDDAY/KG          |
| operator_code     | `stx_operators.external_ids.osta_operator_code` |                          |
| effective_from    | `calendar.start_date`                           |                          |
| effective_to      | `calendar.end_date`                             |                          |

### 5.2 `stops.csv`

| column              | maps to                            |
| ------------------- | ---------------------------------- |
| osta_stop_id        | `stops.stop_id` (prefix `OSTA-`)   |
| name                | `stops.stop_name`                  |
| latitude, longitude | `stops.stop_lat`, `stops.stop_lon` |
| stop_kind           | `stops.stx_stop_kind`              |
| hazard_zone         | `stops.stx_hazard_zone`            |

### 5.3 `route_stops.csv` (becomes `stop_times`)

| column              | maps to                        |
| ------------------- | ------------------------------ |
| osta_route_number   | join → `routes.route_id`       |
| osta_stop_id        | join → `stops.stop_id`         |
| sequence            | `stop_times.stop_sequence`     |
| scheduled_arrival   | `stop_times.arrival_time`      |
| scheduled_departure | `stop_times.departure_time`    |
| dwell_seconds       | `stop_times.stx_dwell_seconds` |

A trip per (route × service-day pattern) is synthesised; if OSTA exports do not name trips, we derive `trip_id` deterministically from `route_id + service_id + direction`.

### 5.4 `students.csv` (PII — encrypted in transit and at rest)

| column               | maps to                                         |
| -------------------- | ----------------------------------------------- |
| board_student_number | `stx_students.board_student_number` (encrypted) |
| legal_name           | `stx_students.legal_name` (encrypted)           |
| grade                | `stx_students.grade`                            |
| school_code          | `stx_students.school_id`                        |
| home_address         | `stx_students.home_address` (encrypted)         |
| home_lat, home_lon   | `stx_students.home_location`                    |
| eligibility_kind     | `stx_eligibility.eligibility_kind`              |
| medical_flags_json   | `stx_students.medical_flags` (encrypted)        |

### 5.5 `ridership.csv`

| column                       | maps to                             |
| ---------------------------- | ----------------------------------- |
| board_student_number         | `stx_ridership.student_id` (lookup) |
| osta_route_number            | join → `trip_id`                    |
| osta_stop_id                 | `stx_ridership.stop_id`             |
| direction                    | `stx_ridership.direction_id`        |
| effective_from, effective_to | same                                |

### 5.6 Required guarantees from OSTA on the export

- Stable natural keys across exports (`board_student_number`, `osta_route_number`, `osta_stop_id`).
- "Full snapshot" semantics: every export is a complete picture of currently-active records, not a delta. SBTM computes deltas.
- A `manifest.json` with `export_id`, `export_at`, `row_counts`, `sha256` per file.

## 6. Delta Detection & Idempotency

Each import is one transaction per file with an outer **import session**:

1. Stage all rows into `stage_*` tables keyed by `import_session_id`.
2. Compute three sets per entity: `inserts`, `updates`, `tombstones` (rows present last time, missing now).
3. Apply with these rules:
   - **Inserts** — direct insert, allocate UUIDs, populate `external_ids.osta_*`.
   - **Updates** — diff column-by-column; only changed columns written. Audit row records before/after.
   - **Tombstones** — `status='inactive'` + `deleted_at = now()`; never hard-delete. A re-appearing record is reactivated, preserving its UUID and history.
4. Emit a **dry-run report** before the second phase commits, e.g. "+12 stops, ~3 routes, −1 student". Reports go to OSTA Admin and Board Admin queues for approval when thresholds are exceeded (e.g. >5% student churn).

Idempotency: re-running the same `import_session_id` is a no-op. Manifest hash mismatch aborts the session.

## 7. Live Update Strategy

- **Phase 1** — scheduled imports (proposed: nightly at 02:00 ET; manual on-demand from OSTA Admin console).
- **Phase 2 (designed, not built)** — webhook endpoint `POST /integrations/osta/events` with HMAC-signed payloads:

```json
{
  "event_id": "...",
  "event_type": "route.cancelled" | "route.delayed" | "stop.changed" | "ridership.changed",
  "occurred_at": "...",
  "payload": { ... }
}
```

The event handler queues a **partial import** that reuses the same canonical pipeline. No event type triggers a destructive action without a full snapshot reconciliation within 24h.

## 8. Replacing OSTA Alerts (G3)

Per session decision, SBTM sends its **own** cancellation/delay alerts to parents independently — not via OSTA's app.

- **Trigger sources**: (a) Board/School Admin manual entry, (b) OSTA CSV file `cancellations.csv` (Phase 1), (c) OSTA webhook (Phase 2), (d) automated weather rules (Phase 2).
- **Audience**: derived from `stx_ridership` ⨝ `stx_student_guardians` ⨝ `stx_alert_subscriptions`.
- **Channels**: parent app push, SMS (opt-in), email, in-app.
- See `Alerts.md` §4 for the full pipeline.

### 8.1 Transition mode (G4)

For schools/boards still on OSTA's app during rollout, an `OstaAlertImporterAdapter` ingests their published cancellation page (only with OSTA's written permission and a stable feed contract). Ingested alerts are flagged `source=osta` and surfaced read-only in admin consoles to avoid duplicate sends.

## 9. Security, Privacy, Compliance

- All PII files (`students.csv`, `ridership.csv`) are encrypted in transit (SFTP with key auth or signed S3 URL) and **at rest** within the staging tables (column-level encryption).
- A signed Data Sharing Agreement with OSTA is a precondition for go-live.
- MFIPPA (Ontario Municipal Freedom of Information and Protection of Privacy Act) classification for student records.
- Audit log captures: who ran the import, file hashes, row counts, deltas applied, approver of large-delta sessions.
- Importer service runs in a separate network segment with no direct internet egress except SFTP/S3 IPs.

## 10. Open Questions for OSTA

1. Will OSTA agree to a scheduled SFTP/S3 export of the five files in §5? Frequency?
2. What is the **stable** form of `osta_route_number` across academic years? Reused or new?
3. Are student `board_student_number` values persistent across grades? Across schools?
4. Will OSTA agree to be the sole alert source for participating boards (G3), or will their app continue in parallel?
5. Is there a board-by-board opt-in mechanism, or is this a consortium-wide switch?
6. Webhook timeline (Phase 2)?
7. Liability split when SBTM-sent alerts conflict with OSTA-sent alerts?

## 11. Out of Scope

- Routing/optimisation engine — OSTA owns this; SBTM is a downstream consumer.
- Driver dispatch instructions — operators continue to use their existing tools.
- Billing/finance integration with OSTA contracts.
