# ADR-0001: Active-Run Projection for Live Dashboard

- **Status**: Implemented
- **Date**: 2026-05-29
- **Decision Makers**: System Architecture Team
- **Supersedes**: prior implicit definition of "active route" in `gps.gateway.service.ts:getActiveRoutes`
- **Related Documents**:
  - `docs/Design/DataModel-v2.md`
  - `docs/Design/SystemArchitecture.md`
  - `services/api-gateway/migrations/20260529_active_run_projection.sql`
  - `scripts/migrations/sweep-stale-in-progress-runs.sql`

## Context

The Admin Dashboard's primary purpose is **live tracking of buses currently on the road** and surfacing alerts on those buses. The view polls the gateway every 2 seconds and, in production, will fan out across many concurrent admin users and many thousands of vehicles per region.

Two endpoints back the dashboard:

- `GET /api/v1/routes/active` — the list of "active" routes (one card + one bus marker per route)
- `GET /api/v1/routes/locations` — live GPS positions; the dashboard intersects them with the active-route set

### The bug we observed

On 2026-05-29 the dashboard showed two routes (and two bus markers) when the operator had only started a single bus that morning:

```text
DB truth — route_lifecycle_events (latest per route):
  R-OCSB-201      ROUTE_STARTED    2026-05-28 19:42 UTC   ← in-progress
  R-OCSB-201-PM   ROUTE_COMPLETED  2026-05-27 00:16 UTC   ← not in-progress

Dashboard showed:
  R-OCSB-201      (AM)   ✓ correct
  R-OCSB-201-PM   (PM)   ✗ stale — completed yesterday
```

### Why it happened

`gps.gateway.service.ts:getActiveRoutes` defined "active" as:

```sql
FROM stx_runs run
WHERE run.service_date = today
  AND run.status NOT IN ('completed', 'cancelled')
```

i.e. "any run scheduled for today that has not been explicitly completed or cancelled". The seeded `stx_runs` rows for both AM and PM directions had `status = 'scheduled'`, so both satisfied the predicate, and `route_lifecycle_events` (the actual source of truth for _what is rolling right now_) was never consulted.

Two compounding issues hid the bug for a while:

1. A second `@Controller('routes')` (`route.controller.ts`) had had an unrelated `@Get('active')` added during debugging. Nest binds only one of two duplicate handlers; the dead handler made it look like a fix had been applied when it had not.
2. The admin dashboard was assumed to be running with `VITE_USE_MOCK=true`. It was not — `.env` has no such flag — so changes to mock data had no effect on observed behaviour.

### What "active" must mean

The product definition the team confirmed:

> _Active = the driver has tapped "Start route" and has not yet tapped "End route"._

This corresponds to `route_lifecycle_events`: latest event per `(route_id, run_id)` is `ROUTE_STARTED` (no later `ROUTE_COMPLETED`).

### Why we did not query lifecycle events directly

The dashboard polls every 2 s × many concurrent clients × growing event log. A query that finds "latest event per group" over an append-only log requires window functions (`DISTINCT ON` / `ROW_NUMBER()`) and degrades with the size of `route_lifecycle_events`, which grows monotonically with every `ROUTE_STARTED`, `STOP_REACHED`, and `ROUTE_COMPLETED` ever recorded. A year of operation produces millions of rows for what is fundamentally a question about the small set of buses moving _right now_.

## Decision

Treat `stx_runs.status` as a **maintained projection** of the lifecycle event log, optimised for the read path:

1. Reserve a dedicated enum value `'in_progress'` (already present in `stx_run_status_enum`).
2. The GPS-tracking lifecycle endpoint flips `stx_runs.status` as a side-effect of recording the event:
   - `ROUTE_STARTED` → `UPDATE stx_runs SET status = 'in_progress' WHERE vehicle_id = ? AND service_date = today AND status != 'cancelled'`
   - `ROUTE_COMPLETED` → `UPDATE stx_runs SET status = 'completed' …`
3. `route_lifecycle_events` remains the **immutable audit trail and source of truth**; the projection update is best-effort (logged on failure) — the projection can always be rebuilt from the event log.
4. `getActiveRoutes` filters on the projection:
   ```sql
   WHERE run.service_date = today
     AND run.status       = 'in_progress'
   ```
5. A partial index makes the read an index-only scan over **only the live rows**:
   ```sql
   CREATE INDEX idx_stx_runs_in_progress
     ON stx_runs (service_date)
     WHERE status = 'in_progress';
   ```
6. A nightly sweeper closes "stuck" runs where a driver forgot to end the route:
   `scripts/migrations/sweep-stale-in-progress-runs.sql`.

## Consequences

### Positive

- **Constant-cost reads.** The dashboard's hot path scans an index that contains exactly _N_ entries for _N_ currently-rolling buses, independent of event-log growth. This is what enables 2 s polling at fleet scale.
- **Single, unambiguous definition of "active"** shared by API, dashboard, and ops queries.
- **Audit trail preserved.** `route_lifecycle_events` is unchanged; the projection is derived state, not a replacement.
- **Cheap remediation for orphans.** A single `UPDATE … WHERE service_date < today AND status = 'in_progress'` clears stuck rows nightly.
- **Idempotent writers.** Re-delivery of a `ROUTE_STARTED` event leaves the projection in the same state.

### Negative / trade-offs

- The projection can drift from the event log if a writer crashes mid-call. Mitigation: the event INSERT happens _before_ the `UPDATE`, so the audit trail is always at least as complete as the projection; a periodic reconciliation job can rebuild the projection from the log if drift is ever observed.
- Drivers who forget "End route" leave the projection stale until the nightly sweep. Acceptable: the dashboard reflects what the driver app reported; the sweep guarantees same-day-next-day correctness.
- Two writers can race on the same `(vehicle_id, service_date)` row (e.g. a re-delivered `ROUTE_STARTED` arriving after `ROUTE_COMPLETED`). The `UPDATE` is unconditional except for `'cancelled'`, so out-of-order events can flip status backwards. **Follow-up (out of scope for this ADR):** add a CHECK constraint or an `event_time` column on `stx_runs` so the update only applies when the new event is newer than the recorded transition.

### Why not the alternatives

| Option                                                                        | Why rejected                                                                                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aggregate `route_lifecycle_events` on every dashboard poll**                | Cost grows unbounded with event-log size; aggregations are hostile to caching; would not survive fleet-scale 2 s polling.                    |
| **Time-of-day window (AM 06–12, PM 14–18) — the throw-away patch we deleted** | Approximated correctness on demo data but did not reflect actual operations; a route still rolling at 12:01 would vanish from the dashboard. |
| **Materialised view refreshed on event insert**                               | Strictly more machinery (refresh job, locking, staleness window) for the same outcome a single-row `UPDATE` already gives us.                |

## Implementation

### Code changes

- `services/gps-tracking/src/controllers/lifecycleController.ts`
  Adds a best-effort `stx_runs.status` projection update after each `ROUTE_STARTED` / `ROUTE_COMPLETED` event.
- `services/api-gateway/src/modules/gateway/services/gps.gateway.service.ts`
  `getActiveRoutes` now filters on `run.status = 'in_progress'`.
- `services/api-gateway/src/modules/route/route.controller.ts`
  Removed the duplicate `@Get('active')` handler that was shadowed by `gps.controller.ts` and never reachable.
- `apps/admin-dashboard/src/services/mock/handlers/routes.mock.ts`
  Mock layer reverted to a simple `status === 'active'` filter (the prior throw-away AM/PM time window was removed).

### Schema changes

- `services/api-gateway/migrations/20260529_active_run_projection.sql`
  Creates the partial index `idx_stx_runs_in_progress`.
- `scripts/schema-seed/init-db.sh`
  Wires the migration into the local dev bootstrap.

### Operational artefacts

- `scripts/migrations/sweep-stale-in-progress-runs.sql`
  Nightly cron candidate to close orphaned in-progress runs.

## Verification

After deploying the changes, with the demo seed showing two scheduled runs for today:

```bash
# Truth — only R-OCSB-201 is in-progress per lifecycle events
docker exec sbtm-postgres-1 psql -U postgres -d sbms -c \
  "UPDATE stx_runs SET status='in_progress'
   WHERE id='962c641c-6848-4ca8-a267-7d22b31050b2';"   # the AM run

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/routes/active \
  | jq 'length, .[].id'
# → 1
#   "R-OCSB-201"
```

The dashboard now shows exactly one route and one bus marker, matching the lifecycle source of truth.
