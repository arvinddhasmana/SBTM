# Module 6 - Student Presence Detection

## Status
Implemented and running in Docker Compose.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/v1/UpgradePlan/GapAnalysis.md`
- Planned delivery phases: `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md` Phases 1 and 2

## Location
- `services/student-presence`

## Tech Stack
- NestJS + TypeORM + PostgreSQL
- Redis caching + BullMQ
- Socket.IO WebSockets

## APIs
- `POST /api/v1/presence-events` (BLE detections)
- `POST /api/v1/student-presence-events/manual`
- `GET /api/v1/routes/:routeId/students`
- `POST /api/v1/student-tags`

## Data Model
- `presence_events`, `student_tags`

## Integration Notes
- API gateway proxies manual presence events and route presence.
- Driver app roster is local-only; no presence API wiring.

## Gaps / Next Steps
- Parent notifications
- Driver app BLE integration
- Driver roster flow still needs authoritative API wiring.
