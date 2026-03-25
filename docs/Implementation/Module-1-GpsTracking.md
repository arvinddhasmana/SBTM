# Module 1 - GPS Tracking Service

## Status
Implemented and running in Docker Compose.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phase: `docs/prd/PhaseWiseImplementationPlan.md` Phase 3

## Location
- `services/gps-tracking`

## Tech Stack
- Express + TypeScript
- Prisma + PostgreSQL
- Zod validation

## APIs
- `POST /api/v1/locations` - ingest GPS point
- `GET /api/v1/routes/:routeId/live-location` - latest position
- `GET /api/v1/routes/:routeId/history` - full route history

## Data Model
- `location_points`: `vehicle_id`, `route_id`, `timestamp`, `lat`, `lng`, telemetry fields

## Integration Notes
- API gateway proxies live/history endpoints and ingests GPS via `/api/v1/routes/locations`.
- Driver app posts to gateway endpoints when configured.

## Gaps / Next Steps
- No geofencing or route deviation detection.
- No aggregation endpoints (route list, live fleet view).
- No `location.updated` event publication yet.
