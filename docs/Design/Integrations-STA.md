# STA Integration Design

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Related: `DataModel-v2.md`, `Alerts.md`, `ImportMappings.md`, `RoutePlanner.md`

## 1. Context

SBTM is designed to onboard **any Ontario Student Transportation Authority (STA)** — the consortia that plan and dispatch school transportation for one or more school boards. Examples:

- **OSTA** (Ottawa Student Transportation Authority) — OCDSB, OCSB. Public touchpoints: `ottawaschoolbus.ca`, "OSTA App" (<https://www.ottawaschoolbus.ca/get-ostas-app>).
- **STEO** (Student Transportation of Eastern Ontario).
- **RCJTC** (Renfrew County Joint Transportation Consortium).
- ~30 others across Ontario.

Most STAs run **BusPlanner Web** (vendor: GeoQuery / Edulog) or an equivalent internal route-planning system. **None publish a public REST API, GTFS feed, or event stream.**

**Implication**: Phase 1 integration assumes **batch import via files** with each STA's cooperation. A real-time event/API integration is designed for, not built, and is a Phase 2 ask of any STA that can supply one. The architecture is STA-agnostic: the same pipeline serves OSTA today and STEO/RCJTC/others tomorrow.

## 2. Goals

| #   | Goal                                                                                                | Phase |
| --- | --------------------------------------------------------------------------------------------------- | ----- |
| G1  | Import route, stop, vehicle, run, ridership, and **navigation-path shape** data from any STA        | 1     |
| G2  | Detect changes between two consecutive imports and apply deltas without losing tracking history     | 1     |
| G3  | SBTM is the **system of record for alerts to parents** for participating boards/schools per STA     | 1     |
| G4  | Allow STA-originated alert ingestion (fallback during transition; per-school `alerts_enabled` flag) | 1     |
| G5  | Bidirectional event/API integration when an STA exposes one                                         | 2     |

## 3. Non-goals

- Reverse-engineering, scraping, or unauthorised access to BusPlanner endpoints. Any integration requires a written data-sharing agreement with the STA.
- Replacing any STA's internal routing/optimisation. SBTM consumes their plan; it does not re-plan.

## 4. Integration Architecture

```
+------------------+      file drop       +-------------------+      idempotent import     +-----------+
|   STA / Board    |  ───────────────►    |   SBTM Importer    |  ──────────────────────►   |  SBTM DB  |
|   export job     |  SFTP / signed-S3    |   (adapter pattern)|                            |  (v2)     |
+------------------+                       +-------------------+                            +-----------+
        ▲                                          │
        │  alert webhook (Phase 2)                 ├── delta diff & dry-run report
        └──────────────────────────────────────────┴── audit log
```

The **Importer** is a new service/worker (`services/integration-importer`, name TBD) with a pluggable adapter interface so the same pipeline serves OSTA, STEO, RCJTC, and any future STA via either a vendor-specific CSV adapter or the standard GTFS adapter.

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

Adapters in scope:

| Adapter               | Source                                                         | Status                                           |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| `StaCsvAdapter`       | STA-supplied CSV/XLSX exports (see §5 and `ImportMappings.md`) | Phase 1 — covers OSTA, STEO, RCJTC, others       |
| `GtfsScheduleAdapter` | Standard GTFS-Schedule ZIP                                     | Phase 1 (reuses for STAs already producing GTFS) |
| `StaApiAdapter`       | STA REST/event feed                                            | Phase 2 stub                                     |

### 4.2 Why file-based first

- Zero dependency on each STA's engineering effort; only requires they email/SFTP a regular export.
- BusPlanner has standard "Routes / Stops / Students / Trips / Shapes" report exports already used by school boards.
- Files are auditable, replayable, diffable.
- Same pipeline regardless of which STA — `source` tag and adapter selection are the only differences.

## 5. STA CSV Import Contract

**Seven** files, UTF-8, header row required, comma-delimited, RFC 4180 quoting. Names are normative; the adapter accepts case-insensitive variations. Field-level mappings, validation rules, and per-STA aliasing live in `ImportMappings.md` and the matching `docs/Design/templates/*.csv` header files. The summary tables below are intentionally short.

| File                                      | Purpose                                                       | PII |
| ----------------------------------------- | ------------------------------------------------------------- | --- |
| `sta-routes.csv`                          | Route metadata, direction, operator                           | No  |
| `sta-stops.csv`                           | Stop locations, hazard flags                                  | No  |
| `sta-stop-times.csv`                      | Scheduled arrival/departure per (trip, stop)                  | No  |
| `sta-trips.csv`                           | Service-day patterns; deterministic `trip_id` if STA omits    | No  |
| `sta-shapes.csv`                          | **Navigation path** (GTFS-shapes); optional, fallback applies | No  |
| `students.csv`                            | Student core record; encrypted in transit and at rest         | Yes |
| `guardians.csv` + `student-guardians.csv` | Parent/guardian + M:N link with primary-pickup flag           | Yes |
| `ridership.csv`                           | Student ↔ trip ↔ stop ↔ direction                             | Yes |

`cancellations.csv` is an optional operational file (matches `stx_alerts` shape) used to seed delay/cancel alerts when the STA does not yet supply a webhook.

### 5.1 `sta-shapes.csv` — navigation path

GTFS-shapes columns: `shape_id`, `shape_pt_lat`, `shape_pt_lon`, `shape_pt_sequence`, `shape_dist_traveled?`. Each shape is joined to a route via `sta-trips.csv` (`shape_id` column).

If `sta-shapes.csv` is **absent or empty for a given route**:

1. Import succeeds — shapes are not a blocker.
2. SBTM auto-generates a shape by OSRM road-snapping the route's sequential `stop_times` coordinates.
3. The route is recorded with `stx_shape_source = 'sbtm_generated'` and surfaced in the STA Admin Route Planner queue for review.
4. Once an STA Admin edits and saves the shape, `stx_shape_source = 'sta_admin_edited'`. Subsequent re-imports do **not** overwrite an `sta_admin_edited` shape unless the operator explicitly opts in.

### 5.2 Required guarantees from the STA on the export

- Stable natural keys across exports (`board_student_number`, `sta_route_number`, `sta_stop_id`). Recommended: re-use route numbers for the same physical route across academic years; re-use `board_student_number` across grades within a board; capture the Ontario Education Number (OEN) for cross-board persistence.
- "Full snapshot" semantics: every export is a complete picture of currently-active records, not a delta. SBTM computes deltas.
- A `manifest.json` with `export_id`, `export_at`, `row_counts`, `sha256` per file, and a `sta_short_code` (e.g. `OSTA`, `RCJTC`) identifying the source STA.

## 6. Delta Detection & Idempotency

Each import is one transaction per file with an outer **import session**:

1. Stage all rows into `stage_*` tables keyed by `import_session_id`.
2. Compute three sets per entity: `inserts`, `updates`, `tombstones` (rows present last time, missing now).
3. Apply with these rules:
   - **Inserts** — direct insert, allocate UUIDs, populate `external_ids.sta_*` (the namespace key is the STA short code, e.g. `external_ids.osta_route_number`).
   - **Updates** — diff column-by-column; only changed columns written. Audit row records before/after.
   - **Tombstones** — `status='inactive'` + `deleted_at = now()`; never hard-delete. A re-appearing record is reactivated, preserving its UUID and history.
4. Emit a **dry-run report** before the second phase commits, e.g. "+12 stops, ~3 routes, −1 student". Reports go to STA Admin and Board Admin queues for approval when thresholds are exceeded (e.g. >5% student churn).

Idempotency: re-running the same `import_session_id` is a no-op. Manifest hash mismatch aborts the session.

## 7. Live Update Strategy

- **Phase 1** — scheduled imports. Default cadence **quarterly** per STA (the user-confirmed onboarding norm); STA Admins can trigger on-demand imports from the admin console. STAs with more frequent operational change can negotiate weekly or nightly drops.
- **Phase 2 (designed, not built)** — webhook endpoint `POST /integrations/sta/{sta_short_code}/events` with HMAC-signed payloads:

```json
{
  "event_id": "...",
  "event_type": "route.cancelled" | "route.delayed" | "stop.changed" | "ridership.changed",
  "occurred_at": "...",
  "payload": { ... }
}
```

The event handler queues a **partial import** that reuses the same canonical pipeline. No event type triggers a destructive action without a full snapshot reconciliation within 24h.

## 8. Replacing STA Alerts (G3)

Per session decision, SBTM sends its **own** cancellation/delay alerts to parents independently — not via the STA's app — for schools where `stx_schools.alerts_enabled = true`.

- **Trigger sources**: (a) STA/Board/School Admin manual entry, (b) STA CSV file `cancellations.csv` (Phase 1), (c) STA webhook (Phase 2), (d) automated weather rules (Phase 2).
- **Audience**: derived from `stx_ridership` ⨝ `stx_student_guardians` ⨝ `stx_alert_subscriptions`. STA-scoped alerts cascade to every board/school under the STA.
- **Channels**: parent app push, SMS (free tier in Phase 1), email, in-app.
- See `Alerts.md` §4 for the full pipeline.

### 8.1 Transition mode (G4)

For schools where `alerts_enabled = false`, the STA's existing app remains the primary parent channel. If the STA publishes a machine-readable cancellation feed (with written permission), a `StaAlertImporterAdapter` ingests it; ingested alerts are flagged `source=sta_import` and surfaced **read-only** in admin consoles to avoid duplicate sends. The dual-send transition policy (when and how to flip per-school) is deferred per user direction.

## 9. Security, Privacy, Compliance

- All PII files (`students.csv`, `guardians.csv`, `student-guardians.csv`, `ridership.csv`) are encrypted in transit (SFTP with key auth or signed S3 URL) and **at rest** within the staging tables (column-level encryption).
- A signed Data Sharing Agreement with each STA is a precondition for go-live for that STA.
- MFIPPA (Ontario Municipal Freedom of Information and Protection of Privacy Act) classification for student records.
- Audit log captures: STA short code, who ran the import, file hashes, row counts, deltas applied, approver of large-delta sessions.
- Importer service runs in a separate network segment with no direct internet egress except SFTP/S3 IPs of accredited STAs.

## 10. Resolved Decisions & Deferred Items

Per session direction (2026-05-15):

1. **Export cadence** — Resolved: default quarterly per STA; on-demand from STA Admin console.
2. **Stable route numbers across years** — Recommendation to STAs: re-use for the same physical route. SBTM does not require it; the importer treats a new number as a new route (old route tombstoned).
3. **`board_student_number` persistence** — Recommendation to STAs/boards: persistent across grades within a board. SBTM additionally captures `external_ids.oen` (Ontario Education Number) for cross-board continuity.
4. **Sole alert source vs. parallel apps** — Resolved: per-school via `stx_schools.alerts_enabled`. STAs/boards can transition at their own pace.
5. **Board-by-board vs. STA-wide opt-in** — Resolved: per-school (finest grain). Board Admin can mass-toggle; STA Admin can mass-toggle their own STA.
6. **Liability for conflicting alerts** — Deferred: addressed in each STA's Data Sharing Agreement. SBTM mitigates by showing `source` on every alert in admin consoles.

Open items deferred to a later design:

- STA webhook contract (Phase 2).
- SMS provider selection (user: free tier for testing).
- SBTM ↔ STA-app dual-send transition policy.

## 11. Out of Scope

- Routing/optimisation engine — STAs own this; SBTM is a downstream consumer.
- Driver dispatch instructions — operators continue to use their existing tools.
- Billing/finance integration with STA contracts.
