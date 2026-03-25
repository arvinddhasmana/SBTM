# Module 1 - GPS Tracking Service

## Status
Implemented — Phase 3 GPS eventing, geofencing and optimization complete.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Phase delivery: `docs/prd/UpgradePlan/Phase-3-GpsEventingGeofencing.md`

## Location
- `services/gps-tracking`

## Tech Stack
- Express + TypeScript
- Prisma + PostgreSQL (PostGIS for spatial queries)
- Zod validation
- BullMQ + ioredis (event publication)

## APIs
- `POST /api/v1/locations` — Ingest GPS point; validates coordinate ranges; publishes `location.updated` to `gps` queue; runs geofence deviation check
- `GET /api/v1/routes/:routeId/live-location` — Latest position
- `GET /api/v1/routes/:routeId/history` — Full route history
- `POST /api/v1/routes/lifecycle` — Record route lifecycle event
- `GET /api/v1/routes/:routeId/lifecycle` — Get lifecycle events
- `PUT /api/v1/geofences` — Create or update geofence thresholds for a route
- `GET /api/v1/routes/:routeId/geofence` — Get geofence config for a route
- `GET /api/v1/routes/:routeId/deviations` — List deviation audit events for a route

## Data Model
- `location_points`: `vehicle_id`, `route_id`, `school_id`, `timestamp`, `lat`, `lng`, telemetry fields
- `route_lifecycle_events`: route execution events (start, stop, completion)
- `route_geofences`: per-route configurable corridor/stop-proximity/deviation thresholds
- `route_deviation_events`: immutable deviation audit log written by geofence service

## Event Publication
After each `POST /api/v1/locations`:
1. `location.updated` published to the `gps` BullMQ queue — payload matches the v1 Event Catalog envelope (vehicleId, routeId, schoolId, lat, lng, speed, heading, accuracy).
2. `route.deviation` published to the `gps` queue when vehicle exceeds configured `deviationThresholdMeters` (defaults to 300 m).

Both events are fire-and-forget — publication failures are logged but do not block the ingest response.

## Geofencing
- `GeofenceService.checkDeviation` runs a PostGIS `ST_Distance(geography)` query to find the minimum distance from the incoming point to any prior breadcrumb on the route.
- If distance exceeds configured `deviationThresholdMeters`, a `route_deviation_events` record is written and a `route.deviation` event is published.
- Threshold defaults: corridor 200 m, stop proximity 50 m, deviation alert 300 m — all configurable per route via `PUT /api/v1/geofences`.

## Coordinate Validation
Zod schema validates:
- `lat`: must be in `[-90, 90]`
- `lng`: must be in `[-180, 180]`
- `speedKph` and `accuracyMeters`: must be ≥ 0
- `headingDeg`: must be in `[0, 360]`

## Integration Notes
- API gateway proxies live/history and ingest endpoints.
- `REDIS_HOST` and `REDIS_PORT` env vars must be set for event publication (configured in docker-compose).
- Driver app posts to gateway endpoints when configured.

## Gaps / Next Steps
- ETA calculation based on current position and route progress (FR-GEO-003) is not yet implemented.
- Geofence corridor is approximated by route breadcrumbs, not a pre-defined polyline from a route planning system. A dedicated route geometry table would improve accuracy.
- BullMQ `gps` queue consumers (notification, analytics) are not yet implemented.
