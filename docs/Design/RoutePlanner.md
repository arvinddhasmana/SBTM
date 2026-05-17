# Route Planner v2 — Design

- Document owner: Engineering and Architecture
- Status: **Draft for review** (feat/sbtm-refocus-data-model)
- Last reviewed: 2026-05-15
- Related: `DataModel-v2.md` (§4.7 shapes, §5.x routes/trips/stops), `Integrations-STA.md`, `ImportMappings.md`

## 1. Purpose

Provide STA / Board / School Admins (per RBAC) a map-based UI to inspect and refine the **navigation path** (GTFS `shapes`) and **stop layout** of imported routes, and to export those routes as a standard GTFS-Schedule ZIP or PDF map. The Route Planner does **not** assign students to routes; that remains in Student Management.

## 2. Scope (Phase 1)

| Capability                                | In scope | Notes                                                                      |
| ----------------------------------------- | -------- | -------------------------------------------------------------------------- |
| View routes on Leaflet map                | ✓        | Existing UI                                                                |
| Drag stop pin to new location             | ✓        | Existing                                                                   |
| Add stop pin                              | ✓        | RBAC-gated                                                                 |
| Remove stop pin                           | ✓        | RBAC-gated; prompts confirmation if `stx_ridership` rows reference it      |
| Reorder stops                             | ✓        | Updates `stop_times.stop_sequence`                                         |
| Edit route line via midpoint-drag handles | ✓        | Existing `PlannerMap.tsx`                                                  |
| Snap-to-road                              | ✓        | Existing                                                                   |
| Free-draw / manual vertex insert          | ✗        | Deferred. Editor abstraction kept pluggable                                |
| Edit student ↔ stop / route assignment    | ✗        | Read-only here; managed via Student Management UI or import                |
| Print route map (PDF)                     | ✓        | Server-side render; includes stops, line, bell-schedule annotation         |
| Export GTFS-Schedule ZIP                  | ✓        | Per route or per batch; emits required `.txt` files including `shapes.txt` |
| Save back to canonical model              | ✓        | Writes `stops`, `stop_times`, `shapes`                                     |

## 3. Existing Code to Reuse

| Path                                                                       | Reuse                                                                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/admin-dashboard/src/components/planner/RoutePlannerForm.tsx` (1–451) | Form chrome, route metadata fields                                                                 |
| `apps/admin-dashboard/src/components/planner/PlannerMap.tsx` (1–679)       | Leaflet map; midpoint-drag handles; snap-to-road wrapper                                           |
| `apps/admin-dashboard/src/utils/polyline.ts` (1–42)                        | Google-encoded polyline decoder; repurposed as the GTFS `shapes.txt` encoder/decoder (no v1 reads) |
| `services/api-gateway/src/modules/auth/entities/route.entity.ts`           | `polyline` column **dropped** in the Phase A cutover; route alignment lives in `shapes` only       |
| `services/gps-tracking/prisma/schema.prisma` (51–66) `RouteGeofence`       | Reads `shapes` directly (the `polylineSource` indirection is removed)                              |
| `services/gps-tracking/src/services/geofenceService.ts` (86–158)           | Deviation detection — geometry contract unchanged                                                  |

## 4. v2 Persistence Changes

- New GTFS table `shapes` (one row per `(shape_id, shape_pt_sequence)`). One `shape_id` per `routes.route_id` is the common case; multi-shape routes are supported.
- `routes.stx_shape_source` enum tracks provenance: `sta_import` | `sbtm_generated` | `sta_admin_edited`. Edits in the Route Planner UI set it to `sta_admin_edited` and the import pipeline will not overwrite without explicit operator opt-in.
- `Route.polyline` (v1 text column) is read-only after Phase B dual-read flip; removed in Phase C.

### 4.1 Editor abstraction

`PlannerMap.tsx` exposes a `LineEditorHandler` interface (existing). Phase 1 ships one implementation: `MidpointDragEditor`. A future `FreeDrawEditor` can be added without changing the form; both produce the same shape-points output. This keeps the door open for the user's stated future option without forcing it now.

## 5. Auto-Generated Shape Fallback

When the STA import omits shapes for a route:

1. Import succeeds; the route is created with `stx_shape_source = 'sbtm_generated'`.
2. A worker calls OSRM (`/route/v1/driving/{coords}`) over the route's `stop_times` coordinates in sequence; OSRM returns a polyline that the worker inserts into `shapes`.
3. The route appears in the STA Admin Route Planner queue with a "Review generated shape" badge.
4. Saving an edited shape flips provenance to `sta_admin_edited`; re-imports respect this unless the operator explicitly overrides.

## 6. GTFS-Schedule Export

The Export action emits a ZIP per selected route(s) with:

| File                                  | Source                                              |
| ------------------------------------- | --------------------------------------------------- |
| `agency.txt`                          | `agency` (STA, board acting-as-agency, or operator) |
| `routes.txt`                          | `routes` (omits `stx_*` columns for portability)    |
| `trips.txt`                           | `trips`                                             |
| `stops.txt`                           | `stops`                                             |
| `stop_times.txt`                      | `stop_times`                                        |
| `shapes.txt`                          | `shapes`                                            |
| `calendar.txt` + `calendar_dates.txt` | `calendar` / `calendar_dates`                       |
| `feed_info.txt`                       | Auto-generated: feed publisher, version, contact    |

PII (`stx_students`, `stx_guardians`, `stx_ridership`) is **never** included; integration tests assert their absence on every export.

### 6.1 Print (PDF)

Server-side render via headless Chromium of the same map component at a fixed zoom/extent computed from the route bounding box. Includes route name, direction, school bell time, an ordered stop list, and a generation timestamp. Watermark identifies STA + board for routing.

## 7. RBAC

| Action                                   | Allowed roles                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| View Route Planner                       | Super Admin, STA Admin (own STA), Board Admin (own board), School Admin (own school) |
| Edit stop location / line geometry       | STA Admin, Board Admin                                                               |
| Add / remove stop                        | STA Admin, Board Admin                                                               |
| Export GTFS / print PDF                  | Same as view                                                                         |
| Override `sta_admin_edited` on re-import | STA Admin only                                                                       |

School Admin sees the planner read-only on their school's routes; they raise tickets to Board/STA Admin for changes.

## 8. Out of Scope

- Routing/optimisation engine (vehicle routing problem solver) — STAs own this.
- Bulk route generation from scratch — Route Planner edits imported routes; it does not create routes from a blank canvas in Phase 1.
- Live (in-progress run) overlay — that view lives in the Driver/Parent apps, not the planner.
- Free-draw line editing — deferred per §2; the editor abstraction is the seam.

## 9. Non-destructive stop edits & student↔stop warnings

Reaffirms §2: Route Planner **never** mutates student↔stop or student↔route assignments. When a stop is moved, renamed, or removed, existing `stx_ridership` rows that reference it are left intact — even if the new location is far enough from the old that the previously assigned students would, in practice, no longer be served by it.

The reason is jurisdictional: the decision to reassign a student to a different stop, walk them to the moved one, or split a route is an STA Admin policy call (with parent communication implications). The Planner is a geometry tool, not a roster tool.

To prevent silent drift, stop edits raise warnings that surface to STA Admin out-of-band:

| Trigger                                                                | Warning row                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Stop dragged > `STOP_MOVE_WARN_METERS` (default 100m) from prior coord | `stop_moved` — one row per affected `stx_ridership.stop_id = <moved stop>`                    |
| Stop removed and `stx_ridership` rows still reference it               | Save is blocked at the API; UI prompts admin to either keep stop or open the warning workflow |
| Stop reordered such that travel time delta > 10 min for any rider      | `schedule_drift` — one row per affected ridership                                             |

**Schema sketch** (lands with the Route Planner save-path implementation, not in this doc):

```sql
CREATE TABLE stx_student_stop_warnings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ridership_id   uuid NOT NULL REFERENCES stx_ridership(id) ON DELETE CASCADE,
  stop_id        uuid NOT NULL REFERENCES stops(stop_id),
  reason         text NOT NULL,            -- 'stop_moved' | 'schedule_drift' | ...
  details        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- prev_lat/lng, new_lat/lng, distance_m, ...
  raised_at      timestamptz NOT NULL DEFAULT now(),
  raised_by      uuid REFERENCES users(id),
  acked_at       timestamptz,
  acked_by       uuid REFERENCES users(id),
  ack_note       text
);
CREATE INDEX ON stx_student_stop_warnings (acked_at) WHERE acked_at IS NULL;
```

The admin-dashboard surface is a separate "Stop Change Review" screen — **not** part of the Planner UI — so the Planner remains a pure geometry tool. STA Admin acks each warning with a free-text note recording the chosen remedy (reassign in Student Management UI, leave as-is, contact parent, etc.); the ack is the audit trail, not an automatic mutation of `stx_ridership`.

This means the Planner save-path implementation has two responsibilities beyond writing `stops`/`stop_times`/`shapes`:

1. Diff old vs new stop coords; for each moved stop, query `stx_ridership` and emit one warning row per affected rider.
2. Refuse to delete a stop with non-zero `stx_ridership` references (return 409 with the rider count); UI funnels admin to the review screen.

## 10. Verification

- Round-trip test: import GTFS ZIP → render in Planner → export GTFS ZIP → diff. Output ZIP must equal input modulo `feed_info.txt` timestamps and `stx_*` extension columns.
- Fallback test: import a sample route with no `sta-shapes.csv`; assert `stx_shape_source='sbtm_generated'` and a non-empty `shapes` row set within 60 s.
- RBAC test: School Admin cannot save geometry edits via API even if the UI exposes the button.
- PII-exclusion test: export ZIP run through a column-name scanner; fail on any `stx_student*`, `stx_guardian*`, `stx_ridership*` token.
