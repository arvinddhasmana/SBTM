# Module 6 - Student Presence Detection

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 1 and 2

## Location

- `services/student-presence`

## Runtime

- **Port**: 3004 (docker-compose); code default fallback is 3003 — always set `PORT=3004` via environment
- **Dockerfile EXPOSE**: 3003 (should be corrected to 3004)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- Redis caching (ioredis v5.4.2) + BullMQ v5.66.0
- Socket.IO v4.8.1 WebSockets

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

- Fix Dockerfile `EXPOSE 3003` → `EXPOSE 3004` to match docker-compose port
- Parent notifications
- Driver app BLE integration
- Driver roster flow still needs authoritative API wiring.
