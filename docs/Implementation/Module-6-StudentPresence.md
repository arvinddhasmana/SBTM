# Module 6 - Student Presence Detection

## Status
Implemented and running in Docker Compose.

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
- Tenant-aware filtering
- Parent notifications
- Driver app BLE integration
