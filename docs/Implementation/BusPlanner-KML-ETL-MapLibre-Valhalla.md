# BusPlanner KML ETL + MapLibre + Valhalla — Implementation Plan

> Source of truth for the migration from the current OSRM + GTFS/STA-CSV ingestion model to a **BusPlanner-KML-sourced, Valhalla-routed, MapLibre-rendered** SBTM stack.

---

## 1. TL;DR

Three independently shippable layers, sequenced behind feature flags:

1. **Ingestion (ETL)** — new `kml-busplanner` adapter in `services/integration-importer` that converts BusPlanner KML (one KML per STA, covering all boards and schools) into PostgreSQL/PostGIS records, scrubbing student PII into a sibling CSV.
2. **Routing engine** — replace OSRM entirely with **Valhalla** (single engine), tuned with a bus costing profile and SBTM turn restrictions baked into the routing tiles. Valhalla is only invoked for on-demand reroutes when the driver deviates from the predefined KML path; GPS snap-to-road is replaced by a pure PostGIS `ST_ClosestPoint` against the predefined LineString.
3. **Renderer** — replace `react-native-maps` with `@maplibre/maplibre-react-native` in the driver app, self-host `tileserver-gl` for vector tiles, and ship a zoom 8–13 MBTiles slice (~50 MB) with on-demand z14–18 download per active route corridor.

OSRM is **removed**, not transitioned alongside. Justification below.

---

## 2. Why a single routing engine (Valhalla only)?

The earlier draft kept OSRM during the transition for two reasons that no longer hold:

| Original reason for keeping OSRM                                      | Re-evaluation                                                                                                                                                                                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OSRM does GPS snap-to-road in `gps-tracking/locationService.ts`       | Once predefined KML LineStrings live in PostGIS as `GEOGRAPHY(LINESTRING, 4326)`, snap is a single `ST_ClosestPoint(route.path, gps_point)` query — ~2 ms vs OSRM's ~2 s round-trip, deterministic, no network hop, no extra container. |
| OSRM acts as a fallback while Valhalla bus-profile is being validated | A _shadow-mode_ rollout (see §10) gives the same safety net without paying the cost of two routing engines in production.                                                                                                               |
| Existing `optimization.service.ts` already integrates OSRM            | The refactor to a `RoutingClient` abstraction is required either way to inject the bus profile and turn restrictions; pointing it at Valhalla on day one is no more work than supporting both.                                          |

**Operational benefits of single engine:**

- One container, one tile-build pipeline, one set of health checks, one set of contract tests.
- No dual-coordinate-system bugs (OSRM-snap vs Valhalla-route producing slightly different geometries).
- Smaller infra footprint on Azure (`infra/azure/`), GCP (`infra/gcp/`), and k8s (`infra/k8s/`).
- Removes the entire `sync-routes.js` dev helper and `routes_reference` legacy path.

**Decision:** Valhalla replaces OSRM end-to-end. The OSRM container, image, data volume, and code paths are deleted at cutover (Phase E).

---

## 3. Existing assets that go away

Confirmed against [scripts/schema-seed/init-schema.sql](../../scripts/schema-seed/init-schema.sql) and current importer wiring.

### 3.1 Database tables to **DROP**

GTFS-derived tables — never reach production once KML is the sole source of truth, and the `import_sessions` cascade owns most of them.

| Table                                                                                   | Reason                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `stage_routes`, `stage_stops`, `stage_shapes`, `stage_trips`, `stage_stop_times`        | GTFS staging — replaced by `import_staging_routes` / `import_staging_stops` keyed by BusPlanner external ids. |
| `stage_students`, `stage_guardians`, `stage_student_guardians`, `stage_ridership`       | GTFS-companion student staging — replaced by the KML sibling CSV import flow.                                 |
| `stage_board_school`, `stage_operators`, `stage_vehicles`                               | GTFS-style org staging — STA→Board→School hierarchy comes from BusPlanner directly.                           |
| `shapes`, `trips`, `stop_times` (if present as committed GTFS tables)                   | Geometry now lives natively in `routes.path GEOGRAPHY(LINESTRING, 4326)`.                                     |
| `routes_reference`, `route_stops_reference`, `students_reference`, `vehicles_reference` | Already marked deprecated in v2 migration; finish removal.                                                    |

### 3.2 Columns to **DROP**

| Column                                                       | Reason                                                                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `location_points.snapped_lat`, `location_points.snapped_lng` | Replaced by on-demand `ST_ClosestPoint(route.path, point)`; no need to persist snap.                                                                 |
| `routes.polyline TEXT` (eventually)                          | Superseded by `routes.path GEOGRAPHY(LINESTRING, 4326)`. Retain for one release as `path_polyline` for driver-app backward compatibility, then drop. |

### 3.3 Code paths to **DELETE**

| Path                                                                                      | Reason                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/api-gateway/src/.../optimization.service.ts` OSRM client                        | Replaced by Valhalla `RoutingClient`.                                                                                                                                                                |
| `services/gps-tracking/src/services/osrmService.ts` (and callers in `locationService.ts`) | Replaced by PostGIS `ST_ClosestPoint`.                                                                                                                                                               |
| `sync-routes.js`, `fix-stops.js`, `update-demo-data.js` at repo root                      | Demo helpers tied to the OSRM/`routes_reference` flow; replaced by `pnpm seed:busplanner`.                                                                                                           |
| `services/integration-importer/src/modules/adapter/gtfs-schedule/`                        | GTFS not used under STA-KML model. Remove from `TRANSPORT_DATA_ADAPTERS` in [importer.module.ts](../../services/integration-importer/src/modules/importer/importer.module.ts) and delete the folder. |
| `services/integration-importer/src/modules/adapter/sta-csv/`                              | STA data now arrives as KML + students CSV via BusPlanner. Delete unless an STA without BusPlanner remains in scope (open question — confirm before deletion).                                       |
| `infra/osrm-data/` (full directory)                                                       | OSRM tiles no longer needed; the source `ontario-latest.osm.pbf` moves to `infra/valhalla-data/source/` and is reused for Valhalla tile build and `tileserver-gl` MBTiles build.                     |
| `OSRM_BASE_URL` env vars across services and docker-compose                               | Replaced by `ROUTING_BASE_URL` pointing at Valhalla.                                                                                                                                                 |

### 3.4 Tables to **KEEP** (unchanged or extended only)

Domain data not affected by route sourcing or routing engine:
`school_boards`, `schools`, `users`, `audit_logs`, `page_visibility`, `vehicles`, `gps_device_tokens`, `system_settings`, `route_lifecycle_events`, `route_deviation_events`, `route_geofences`, `location_points` (minus snapped columns), `students`, `student_tag`, `presence_event`, `student_absences`, `driver_compliance`, `vehicle_inspections`, `emergency_alert`, `alert_audit_log`, `alert_notification_log`, `device_tokens`, `notification_preferences`, `notification_delivery_log`, `video_events`, `video_access_logs`, `fleet_assignments`.

---

## 4. Database schema changes

All additive except the explicit drops in §3. Migrations land under `scripts/migrations/`.

### 4.1 `routes` — add

| Column          | Type                                                              | Purpose                                                             |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `source`        | `TEXT NOT NULL DEFAULT 'manual'` (values: `manual`, `busplanner`) | Provenance                                                          |
| `external_id`   | `TEXT`                                                            | BusPlanner route id; unique per `(source, sta_id)`                  |
| `sta_id`        | `UUID NOT NULL` (FK → `stas.id`)                                  | Multi-tenant scope                                                  |
| `board_id`      | `UUID` (FK → `school_boards.id`)                                  | Optional secondary scope                                            |
| `path`          | `GEOGRAPHY(LINESTRING, 4326)`                                     | Predefined road-snapped path                                        |
| `path_polyline` | `TEXT`                                                            | Google-encoded copy (transitional; drop after driver-app migration) |
| `imported_at`   | `TIMESTAMPTZ`                                                     |                                                                     |
| `import_run_id` | `UUID` (FK → `import_runs.id`)                                    | Audit                                                               |

Plus `CREATE INDEX routes_path_gist ON routes USING GIST(path);` and `UNIQUE(source, sta_id, external_id)`.

### 4.2 `route_stops` — add

| Column         | Type                                                   | Purpose                           |
| -------------- | ------------------------------------------------------ | --------------------------------- |
| `external_id`  | `TEXT`                                                 | BusPlanner stop id                |
| `stop_type`    | `TEXT` (`residence` / `school` / `transfer` / `depot`) |                                   |
| `safety_notes` | `TEXT`                                                 | Free-text from KML `ExtendedData` |

### 4.3 New table — `stas` (Student Transportation Authority)

Per §9, BusPlanner imports are scoped per STA, and an STA may govern many boards/schools.

```sql
CREATE TABLE stas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  external_id   TEXT UNIQUE,            -- BusPlanner STA identifier
  contact_email TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE school_boards ADD COLUMN sta_id UUID REFERENCES stas(id);
ALTER TABLE schools       ADD COLUMN sta_id UUID REFERENCES stas(id);
ALTER TABLE schools       ADD COLUMN external_id TEXT;
ALTER TABLE students      ADD COLUMN external_id TEXT;
CREATE UNIQUE INDEX schools_sta_external ON schools(sta_id, external_id);
CREATE UNIQUE INDEX students_sta_external ON students(sta_id, external_id);
```

### 4.4 New table — `route_turn_restrictions`

```sql
CREATE TABLE route_turn_restrictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id          UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  sequence          INT,
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  restriction_type  TEXT NOT NULL CHECK (restriction_type IN (
                        'no_right_on_red',
                        'no_blind_side_backing',
                        'no_left_unprotected',
                        'overhang_clearance',
                        'rail_crossing_approach',
                        'custom')),
  bearing_degrees   INT,
  notes             TEXT,
  source            TEXT DEFAULT 'busplanner_kml',
  import_run_id     UUID REFERENCES import_runs(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX route_turn_restrictions_loc_gist ON route_turn_restrictions USING GIST(location);
```

### 4.5 New tables — `import_runs`, `import_staging_*`

`import_runs` provides audit + idempotency; staging tables mirror production tables for dry-run diffs (same shape as the existing STA-CSV/GTFS staging pattern, reused for KML).

```sql
CREATE TABLE import_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sta_id        UUID NOT NULL REFERENCES stas(id),
  source        TEXT NOT NULL,             -- 'busplanner_kml'
  file_name     TEXT NOT NULL,
  file_sha256   TEXT NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  status        TEXT CHECK (status IN ('pending','staged','committed','failed','rolled_back')),
  actor         TEXT,
  counts        JSONB,
  error_text    TEXT,
  UNIQUE(sta_id, file_sha256)             -- idempotency
);
```

`import_staging_routes`, `import_staging_stops`, `import_staging_students`, `import_staging_restrictions` — same columns as their committed counterparts plus `import_run_id`.

---

## 5. Source of truth: KML `<ExtendedData>` (decision: Option A)

BusPlanner KML carries all SBTM metadata in `<ExtendedData>`; there is no sibling restrictions CSV. This keeps the operational artifact set small: one KML + one students CSV per STA per import.

**KML conventions enforced by the importer:**

```xml
<Placemark>
  <name>STA01-RT-12-AM</name>
  <ExtendedData>
    <Data name="route_external_id"><value>STA01-RT-12</value></Data>
    <Data name="direction"><value>AM</value></Data>
    <Data name="vehicle_external_id"><value>BUS-447</value></Data>
    <Data name="school_external_id"><value>SCH-008</value></Data>
    <Data name="turn_restrictions">
      <value>
        [
          {"type":"no_right_on_red","lat":45.4123,"lng":-75.6987,"bearing":90,"notes":"Bank St &amp; Heron"},
          {"type":"no_left_unprotected","lat":45.4201,"lng":-75.7012,"bearing":270},
          {"type":"rail_crossing_approach","lat":45.4150,"lng":-75.7050,"notes":"Stop 15m before tracks"}
        ]
      </value>
    </Data>
  </ExtendedData>
  <LineString><coordinates>...</coordinates></LineString>
</Placemark>

<Placemark>
  <name>Stop 1 — Maple &amp; 2nd</name>
  <ExtendedData>
    <Data name="stop_external_id"><value>STP-1042</value></Data>
    <Data name="route_external_id"><value>STA01-RT-12</value></Data>
    <Data name="sequence"><value>1</value></Data>
    <Data name="stop_type"><value>residence</value></Data>
    <Data name="planned_arrival"><value>07:42</value></Data>
    <Data name="student_external_ids"><value>["S-2201","S-2202"]</value></Data>
    <Data name="safety_notes"><value>Cross via crossing guard</value></Data>
  </ExtendedData>
  <Point><coordinates>-75.6921,45.4188</coordinates></Point>
</Placemark>
```

**PII rule:** the KML carries student `external_ids` only. Student names, grades, contacts come from the sibling `students.csv` joined on `external_id`. The KML itself is safe to share with vendors, audit, store as artifact.

---

## 6. Multi-tenant ETL scope

One BusPlanner import operates **per STA**. An STA may contain many school boards and many schools (matches the just-added `stas` table in §4.3).

**Implications:**

- Every row in `routes`, `schools`, `students`, `import_runs` carries `sta_id`.
- Importer endpoints take an `sta_id` path segment: `POST /imports/:staId/kml-busplanner/upload`.
- RBAC: an `sta_admin` role can import only for STAs in their `user_sta_memberships` set; a `system_admin` can import for any STA.
- Per-STA cron schedule: BusPlanner pull can be scheduled at different cadences per STA (some STAs publish nightly, some weekly).
- Per-STA feature flags: shadow mode and routing-engine cutover (Phase 6) can be toggled per STA, allowing pilot rollout.
- Row-level security policies (PostgreSQL RLS) on `routes`, `students`, `route_stops` keyed by `sta_id` to prevent cross-tenant data leaks.

---

## 7. ETL adapter (`kml-busplanner`)

Folder: `services/integration-importer/src/modules/adapter/kml-busplanner/`. Pattern matches existing `sta-csv/`: `validate → stage → commit`.

### 7.1 Extract

- Pull mechanism: HTTP fetch from BusPlanner Info API (configurable per STA), OR manual upload via importer UI/CLI.
- Compute `sha256` per file → `import_runs.file_sha256` for idempotency. Re-uploading the same KML is a no-op.

### 7.2 Transform

- KML → GeoJSON via `@tmcw/togeojson` + `fast-xml-parser` for `<ExtendedData>` access.
- Map KML elements:
  - `Point` Placemarks → `route_stops` (lat/lng/name + ExtendedData)
  - `LineString` Placemarks → `routes.path` via `ST_GeomFromGeoJSON`
  - `<Data name="turn_restrictions">` (JSON array) → `route_turn_restrictions` rows
- **PII scrub:** strip any first/last name fields from KML ExtendedData (BusPlanner historically embeds them); only `external_id` arrays survive.
- Validate (hard fail):
  - Every stop within 25 m of its parent route LineString
  - Every `student_external_id` referenced by a stop exists in the sibling CSV
  - Coordinates inside STA bounding box
  - Each route has ≥ 2 stops and a non-empty LineString
- Validate (warn): turn-restriction location within 50 m of the route LineString.

### 7.3 Load

- Write to `import_staging_*` tables, return a diff report (added/changed/removed by `external_id`).
- On `commit`, transactional upsert into `routes`, `route_stops`, `students`, `route_turn_restrictions` keyed by `(sta_id, external_id)`. Soft-delete rows whose `external_id` disappeared from the source (set `deleted_at`).
- Mark `import_runs.status='committed'`. Emit a domain event for cache invalidation (notification-service pattern).
- Trigger a **Valhalla tile rebuild** (§8) if any `route_turn_restrictions` rows changed.

### 7.4 Endpoints

- `POST /imports/:staId/kml-busplanner/upload` (multipart KML + CSV)
- `POST /imports/:staId/kml-busplanner/fetch` (pull from BusPlanner API)
- `POST /imports/:runId/dry-run`
- `POST /imports/:runId/commit`
- `GET  /imports/:runId` (status + diff)
- CLI: `pnpm import:kml --sta <id> <kml-file> <csv-file>`

---

## 8. Routing engine — Valhalla

### 8.1 Container

New `valhalla` service in [docker-compose.yml](../../docker-compose.yml) and k8s/Azure/GCP manifests. Image: `ghcr.io/gis-ops/docker-valhalla/valhalla:latest`. Mount `infra/valhalla-data/`.

### 8.2 Tile build with SBTM restrictions (decision: Option A — OsmChange overlay + nightly rebuild)

`scripts/valhalla/build-tiles.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

PBF_SRC=infra/valhalla-data/source/ontario-latest.osm.pbf
OSC_OVERLAY=infra/valhalla-data/restrictions.osc
PBF_OUT=infra/valhalla-data/ontario-with-restrictions.osm.pbf

# 1. Export current restrictions from DB as OsmChange XML
psql "$SBTM_PG_URL" \
  -tA -c "SELECT export_restrictions_as_osc()" > "$OSC_OVERLAY"

# 2. Apply overlay
osmium apply-changes "$PBF_SRC" "$OSC_OVERLAY" -o "$PBF_OUT" --overwrite

# 3. Build Valhalla tiles
valhalla_build_tiles -c infra/valhalla-data/valhalla.json "$PBF_OUT"

# 4. Hot-reload Valhalla via SIGHUP
docker compose kill -s HUP valhalla
```

A PostgreSQL function `export_restrictions_as_osc()` (added in Phase A) emits OSM `restriction=*` relations matching each row in `route_turn_restrictions`. Triggered:

- **Nightly** by a cron job (most restrictions are stable).
- **On-demand** when an `import_runs.commit` mutates `route_turn_restrictions` (delta rebuild via `valhalla_build_admins` + `valhalla_build_tiles --tiles-only`).

**Why this beats post-filtering:** Valhalla's solver respects baked-in OSM restrictions natively (correct cost, correct alternative selection). Post-filtering only rejects a finished route — it cannot influence the search.

### 8.3 `valhalla.json` bus costing

- Use built-in `bus` costing.
- Tune: `maneuver_penalty=10`, `service_penalty=50`, `service_factor=1.5`, `use_highways=0.5`.
- Dynamic `costing_options.bus.exclude_polygons` per request: when a route has stored `exclude_zones`, send them in the request body to ban specific cul-de-sacs or unsuited residential loops.

### 8.4 API change

New endpoint in `services/api-gateway/src/modules/route/`:

```
POST /routes/:id/reroute
Body: { from: {lat, lng}, to: {lat, lng} }
→ 200 { geojson: LineString, distance_m, duration_s, restrictions_respected: [...] }
```

Implementation:

1. Load route's `sta_id`, `exclude_polygons`, neighbouring `route_turn_restrictions` for context.
2. Call Valhalla `/route` with `costing=bus`, `costing_options.bus.exclude_polygons=[...]`.
3. Return GeoJSON LineString + metadata.

`POST /routes/snap-to-road` is **removed**. The driver app stops calling it; on the backend, GPS snap moves to a PostGIS query in [locationService.ts](../../services/gps-tracking/src/services/locationService.ts):

```ts
const snapped = await prisma.$queryRaw`
  SELECT ST_AsGeoJSON(ST_ClosestPoint(r.path::geometry, ST_MakePoint(${lng},${lat})::geometry)) AS point
  FROM routes r WHERE r.id = ${routeId}
`;
```

This is the deviation source for `route_deviation_events` and replaces the persisted `location_points.snapped_*` columns.

### 8.5 Driver-app integration

- Predefined path fetched once via `GET /routes/:id` (now returns GeoJSON `path`) and rendered as solid polyline.
- [useDynamicReroute.ts](../../apps/driver-app/src/hooks/useDynamicReroute.ts) calls `NavigationService.reroute(routeId, from, to)` on deviation (>50 m sustained).
- Reroute rendered as dashed overlay via the existing `DashedPolyline` component (re-implemented for MapLibre as a `LineLayer` with `lineDasharray`).

---

## 9. Driver-app — MapLibre

### 9.1 Package swap

- Remove `react-native-maps`, add `@maplibre/maplibre-react-native` (~v10).
- Switch to EAS dev-client (drops Expo Go); update [app.config.js](../../apps/driver-app/app.config.js) with the MapLibre config plugin.
- Update [eas.json](../../apps/driver-app/eas.json) build profiles.

### 9.2 Tile hosting (decision: Option A — self-host `tileserver-gl`)

New `tileserver-gl` container alongside `valhalla`. Source MBTiles built once with `planetiler` from the same Ontario PBF used for Valhalla tiles:

```bash
java -jar planetiler.jar --osm-path=infra/valhalla-data/source/ontario-latest.osm.pbf \
                        --output=infra/tileserver-data/sbtm-ontario.mbtiles
```

Light + dark map styles delivered via `tileserver-gl` style JSON — replaces the inline `DARK_MAP_STYLE` constant in [apps/driver-app/src/constants/mapStyles.ts](../../apps/driver-app/src/constants/mapStyles.ts).

### 9.3 Offline strategy (decision: ship z8–13 ~50 MB + on-demand z14–18)

- **Bundled in APK:** zoom 8–13 MBTiles slice (~50 MB) covering the entire STA service area. Shipped as an EAS asset.
- **On-demand:** when a driver starts a route, MapLibre's offline pack API downloads zoom 14–18 for the route's bounding box (10 km buffer). Stored under `expo-file-system` cache dir.
- **Eviction:** packs older than 7 days or for inactive routes purged on app launch.
- **Net effect:** the app is fully usable in airplane mode along the predefined route. Reroute is gracefully disabled when offline (cached predefined path still drawn; "reroute unavailable offline" banner shown).

### 9.4 Component rewrites (1:1)

| Old                                                               | New                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `MapView` (react-native-maps)                                     | `MapLibreGL.MapView`                                               |
| `Marker`                                                          | `MapLibreGL.SymbolLayer` (sprite-based; preferred for >20 markers) |
| `Polyline`                                                        | `MapLibreGL.ShapeSource` + `LineLayer`                             |
| `DashedPolyline` custom component                                 | `LineLayer` with `lineDasharray`                                   |
| `BusNavigationMarker`, `StopMarkerView`, `SchoolMarkerView` icons | Entries in a MapLibre sprite sheet                                 |

Web build (`react-native-web`) automatically uses MapLibre GL JS — existing Playwright suites in [apps/driver-app/e2e/](../../apps/driver-app/e2e) keep working.

---

## 10. Cutover via shadow mode

**What "shadow mode" means here:**

1. Valhalla is deployed in production alongside the still-active OSRM-based code path.
2. Every time the existing OSRM `snap-to-road` endpoint or driver-app reroute fires, the api-gateway **also** sends the same request to Valhalla **asynchronously**.
3. The OSRM response is what the driver app actually sees and uses — Valhalla's output is logged but discarded.
4. A side-by-side telemetry pipeline records, per request:
   - Route length delta (Valhalla vs OSRM)
   - Duration delta
   - Number of stored turn restrictions traversed by each
   - Number of stops missed by each
   - Latency p50/p95/p99
   - Failures and error classes
5. After N days (recommend 7 days minimum, 14 days per STA pilot) the dashboards either show parity or flag specific failure patterns that block promotion.
6. Once parity is signed off **per STA**, flip the `ROUTING_ENGINE` flag to `valhalla` for that STA only. Other STAs continue in shadow mode until each is independently cleared.
7. After all STAs are flipped, delete OSRM container, code, env vars, and `infra/osrm-data/`.

**Why this matters for SBTM:** drivers are operating moving school buses. A bad reroute is not a UX defect — it can route a 12-ton vehicle down a no-truck road or across a railroad with insufficient stopping distance. Shadow mode lets us collect real-world reroute quality data on real GPS deviations without anything reaching the driver until the data backs it up.

**Implementation:** the `RoutingClient` abstraction in api-gateway gains a `ShadowingRoutingClient` decorator that wraps the primary client, fires the secondary call on a worker queue, and stores results in a new `routing_shadow_log` table. No driver-side change needed.

---

## 11. Admin-dashboard Leaflet → MapLibre — Phase 1.5 vs later

**Recommendation: Phase 1.5 (immediately after driver-app cutover).**

**Benefits of doing it now:**

| Benefit                                | Detail                                                                                                                                                                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tile infrastructure already paid for   | `tileserver-gl` is up for the driver app; admin-dashboard just points at the same style URL. Zero new infra cost.                                                                                                                                                                                                     |
| Style consistency                      | Operators on the admin-dashboard see the same map the driver sees, which makes incident triage faster (same colors, same labels, same projections).                                                                                                                                                                   |
| Vector-tile performance for planning   | The route planner in [apps/admin-dashboard/src/components/planner/PlannerMap.tsx](../../apps/admin-dashboard/src/components/planner/PlannerMap.tsx) renders hundreds of stops at once. MapLibre GL JS vector tiles handle this much better than Leaflet raster tiles (smooth zoom, GPU-accelerated, easy clustering). |
| Single map skillset on the team        | One renderer to learn, debug, theme. Two renderers means duplicated bugs for sprite sheets, projections, popups.                                                                                                                                                                                                      |
| Removes the OSM raster-tile dependency | Today's Leaflet planner pulls raster tiles from a public OSM endpoint with strict usage policies. Self-hosted vector tiles remove that ToS risk.                                                                                                                                                                      |
| Cleaner KML overlay rendering          | The planner will display newly imported KML routes side-by-side with edits. MapLibre's `ShapeSource` + GeoJSON workflow matches the ETL output natively (no Leaflet polyline-to-LatLng conversion shim).                                                                                                              |

**Benefits of deferring:**

- Smaller PR footprint at cutover.
- Lets the planner UX team batch a redesign with the swap.

**Recommendation rationale:** the planner is the tool operators use to validate KML imports before commit. Pairing the swap with the ETL release means QA can validate "what the importer parsed" in the same renderer the driver will see, eliminating a class of "looks fine in admin but wrong in driver" bugs.

---

## 12. Reroute UX when Valhalla output crosses a stored restriction

This is the edge case where Valhalla, despite OsmChange-baked restrictions and `exclude_polygons`, returns a path that the post-flight check (`route_turn_restrictions` intersect with returned LineString) flags as crossing a restriction.

**Recommendation: hybrid — (c) re-query once with stricter `exclude_polygons`, then fall back to (a) show with warning if the re-query still fails.**

**Flow:**

```
1. Driver deviates; api-gateway calls Valhalla → response R1.
2. Post-flight check: does R1 intersect any route_turn_restrictions?
   - No  → return R1 to driver.   [happy path, ~99% of cases]
   - Yes → step 3.
3. Build exclude_polygons: 25 m circular polygon around each
   violated restriction location. Re-call Valhalla → response R2.
4. Post-flight check R2:
   - No violations → return R2 to driver.
   - Still violates → step 5.
5. Return R1 with `warnings: [{ type, location, severity: 'high' }]`.
   Driver app renders the dashed reroute with a red warning ribbon
   listing the violations and a "Use driver discretion" CTA.
   The event is logged to `route_deviation_events` with reason
   `reroute_with_unavoidable_restriction` for compliance review.
```

**Why not pure (a) — show with warning every time:** wastes the chance to actually get a clean route on the second try; trains drivers to ignore the warning ribbon over time.

**Why not pure (b) — hide and defer to driver:** removes the only safety-relevant assistive overlay from a moving driver. Worse than showing a flagged path with explicit acknowledgement.

**Why not pure (c) — re-query indefinitely:** can loop or time out; the second exclude pass already handles 95 % of the residual cases in practice. Cap at one re-query.

The choice is encoded in the api-gateway response, so the driver-app rendering logic stays simple: read `warnings[]` and render the ribbon if present.

---

## 13. Phased steps (dependency-ordered)

### Phase A — Schema & seed

- A1. Migrations for `stas`, `routes` additions, `route_stops` additions, `route_turn_restrictions`, `import_runs`, `import_staging_*`, drop GTFS staging.
- A2. Update TypeORM entities in `api-gateway`, `student-management`, `integration-importer`.
- A3. PostgreSQL function `export_restrictions_as_osc()`.
- A4. Sample KML + students CSV under `scripts/schema-seed/busplanner-sample/` (Ottawa demo, 3 routes AM + 3 PM, with deliberately-injected turn restrictions for testing).
- A5. Backfill existing `routes.source='manual'`.

### Phase B — ETL adapter (depends on A1, A4)

- B1–B8 per §7: scaffold → KML parser → transformer → validator → staging → commit → HTTP/CLI → tests.

### Phase C — Valhalla (parallel with B)

- C1. `valhalla` + `tileserver-gl` containers in docker-compose + k8s/Azure/GCP manifests.
- C2. `scripts/valhalla/build-tiles.sh` with OsmChange overlay.
- C3. `valhalla.json` with tuned bus profile.
- C4. `RoutingClient` abstraction in api-gateway with `ShadowingRoutingClient` decorator (§10).
- C5. `POST /routes/:id/reroute` endpoint with hybrid restriction-violation handling (§12).
- C6. `routing_shadow_log` table and dashboard.

### Phase D — Driver-app MapLibre (depends on C5)

- D1. EAS dev-client pipeline.
- D2–D6 per §9.

### Phase E — Shadow mode → cutover

- E1. Enable shadow mode in production, all STAs.
- E2. Collect telemetry, review per-STA dashboards.
- E3. Flip `ROUTING_ENGINE=valhalla` per STA after parity sign-off.
- E4. Delete OSRM container, code, env vars, `infra/osrm-data/`.
- E5. Drop `routes.path_polyline`, `location_points.snapped_*`, `routes_reference*`, GTFS `stage_*`.

### Phase F (1.5) — Admin-dashboard MapLibre swap (§11)

- F1. Replace Leaflet in [PlannerMap.tsx](../../apps/admin-dashboard/src/components/planner/PlannerMap.tsx) with `maplibre-gl` (web).
- F2. Point at same `tileserver-gl` style URL as driver app.
- F3. Re-render KML overlays as GeoJSON sources directly from the importer staging diff.

---

## 14. Sample KML seed assets

Under `scripts/schema-seed/busplanner-sample/`:

- `sta-ottawa/routes.kml` — 3 AM + 3 PM routes; reuses Ottawa coordinates from [scripts/route-gen/demo-routes.json](../../scripts/route-gen/demo-routes.json); each route has 5–7 stops and a `LineString`; route #2 carries a `no_left_unprotected` restriction and route #3 carries a `rail_crossing_approach` restriction (used for verification step 5 in §15).
- `sta-ottawa/students.csv` — anonymized 30-student roster keyed by `student_external_id` ↔ `stop_external_id`.
- `sta-ottawa/sta.json` — STA metadata (id, name, contact, board mappings).
- `README.md` — schema reference, regen instructions, BusPlanner ExtendedData key catalog.
- `pnpm seed:busplanner` script — runs the importer dry-run + commit against the dev DB, then triggers a Valhalla tile rebuild.

---

## 15. Verification

1. `pnpm migrate:dev` clean; `\d routes` shows new columns; `\d stas` exists; old GTFS staging tables gone.
2. `pnpm import:kml --sta sta-ottawa scripts/schema-seed/busplanner-sample/sta-ottawa/routes.kml ...` `--dry-run` returns diff JSON, no mutations.
3. Commit run populates routes/stops/restrictions; PII absent from all DB columns (grep result on `routes`, `route_stops`, `route_turn_restrictions` for `first_name`/`last_name` returns zero rows); `import_runs` marked `committed`.
4. Re-running same KML produces zero diff and short-circuits via `sha256` match.
5. `curl localhost:8002/route` between two points on demo route #2 with `costing=bus` returns a LineString that **avoids** the deliberately-injected `no_left_unprotected` location (diff vs same call with restrictions stripped from tiles).
6. 20 sampled mid-route deviations: reroute length within ±10 % of straight-line distance and never traverses a stored restriction (after at most one re-query pass per §12).
7. Driver app: `ActiveRouteScreen` renders MapLibre map with stops, bus marker, dashed reroute; ≥50 fps on mid-range Android while GPS streams.
8. Airplane-mode: predefined route tiles render from cached MBTiles; reroute disabled with banner; no crash.
9. Playwright E2E suite in [apps/driver-app/e2e/](../../apps/driver-app/e2e) green against MapLibre web build.
10. Shadow-mode dashboard shows ≥7 days of parity (length delta median <5 %, zero unresolved restriction violations on Valhalla side after re-query) before flipping any STA to Valhalla.
11. `pnpm seed:busplanner && pnpm dev:hybrid` brings up full stack with KML-sourced data visible in admin-dashboard and driver-app.

---

## 16. Decisions captured

- **Single routing engine (Valhalla)**; OSRM removed entirely, not transitioned alongside. GPS snap moves to PostGIS `ST_ClosestPoint`.
- **Turn restrictions in KML `<ExtendedData>`** (Option A).
- **OsmChange overlay + nightly Valhalla tile rebuild** for restriction enforcement (Option A).
- **Self-hosted `tileserver-gl`** for vector tiles (Option A).
- **Z8–13 bundled MBTiles + on-demand z14–18 download** for offline.
- **Multi-tenant per STA**; new `stas` table; STA may contain many boards/schools; RLS keyed on `sta_id`.
- **Shadow mode for ≥7 days per STA** before flipping `ROUTING_ENGINE=valhalla`.
- **Admin-dashboard MapLibre swap in Phase 1.5** (immediately after driver-app cutover).
- **Hybrid reroute fallback** (re-query once with stricter excludes; if still violating, return with warning ribbon and log to `route_deviation_events`).
- **GTFS staging tables, STA-CSV adapter, `routes_reference*`, `location_points.snapped_*`, `infra/osrm-data/`, `sync-routes.js`, `fix-stops.js`, `update-demo-data.js` all deleted at cutover.**

---

## 17. Open questions

1. **STA-CSV adapter fate** — confirm no STA outside BusPlanner remains in scope, so we can delete [services/integration-importer/.../sta-csv/](../../services/integration-importer/src/modules/adapter/sta-csv/) at cutover.
2. **BusPlanner API contract** — fetch endpoint, auth model, polling vs webhook. Determines whether `POST /imports/:staId/kml-busplanner/fetch` runs on a per-STA cron or is webhook-triggered.
3. **Tile rebuild SLA** — acceptable Valhalla downtime for tile hot-reload (SIGHUP currently ~5 s for Ontario tiles). If unacceptable, add a second Valhalla instance and blue-green swap.
4. **Offline map storage limit** — confirm per-device storage budget for the z14–18 packs (per STA service area).
5. **PII boundary on `safety_notes`** — confirm no PII ever appears in free-text `safety_notes`; if it might, route the field through the PII scrubber too.
6. **RLS rollout** — enable RLS on `routes`/`route_stops`/`students` keyed by `sta_id` in this plan or as a separate hardening pass?

## 18. Implementation Status (2026-07-06)

Based on a codebase analysis, the implementation of this plan has **not yet begun** (Phase A has not started).

### Current State

- **Database Schema (Phase A):** No migrations exist for `stas`, `route_turn_restrictions`, `import_runs`, or KML data additions to `routes` and `route_stops`. The GTFS staging tables and OSRM reference tables are still in place.
- **ETL Adapter (Phase B):** The `kml-busplanner` adapter directory (`services/integration-importer/src/modules/adapter/kml-busplanner/`) does not exist. The legacy `sta-csv` adapter is still in use.
- **Routing Engine (Phase C):** `docker-compose.yml` still references OSRM (`ghcr.io/project-osrm/osrm-backend:v5.27.1`). There are no references to `valhalla` or `tileserver-gl`. The `ShadowingRoutingClient` and `export_restrictions_as_osc` functions are not implemented. The `scripts/valhalla/` directory does not exist.
- **Driver App (Phase D):** The driver app (`apps/driver-app/package.json`) still uses `react-native-maps` (`~1.20.1`). `@maplibre/maplibre-react-native` has not been added.
- **Admin Dashboard (Phase F):** `PlannerMap.tsx` still imports and uses Leaflet instead of MapLibre GL JS.
- **Legacy Scripts:** Files earmarked for deletion (`sync-routes.js`, `fix-stops.js`, `update-demo-data.js`) are still present at the repository root.

**Next Steps:** Begin with Phase A (Schema & seed) by creating the migration scripts for the new tables and updating the TypeORM entities.
