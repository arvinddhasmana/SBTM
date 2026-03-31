# Module 5 - Video Capture Service

- Last reviewed: 2026-03-30

## Status

Implemented and tested (per status report).

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 4 and 5

## Location

- `services/video-service`

## Runtime

- **Port**: 3005 (docker-compose and code default)
- **Docker HEALTHCHECK**: Configured (only service with Docker-level health check)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- MinIO v8.0.2 / local storage
- Socket.IO v4.8.1 WebSockets
- Multer v1.4.5-lts.1 (file uploads)
- uuid v11.0.5

> **Note**: This service does **not** use BullMQ, unlike emergency-alerts and student-presence. Video event workflows are synchronous.

## APIs

- `POST /api/v1/video-events`
- `POST /api/v1/video-events/:id/complete`
- `POST /api/v1/video-events/:id/failed`
- `GET /api/v1/video-events`
- `GET /api/v1/video-events/:id`

## Data Model

- `video_events`, `video_access_logs`

## Integration Notes

- API gateway proxies video endpoints.
- Admin dashboard lists video events via gateway APIs.

## Gaps / Next Steps

- Real playback wiring in admin UI
- Tenant-aware access controls are enforced by `school_id`
- Retention policy enforcement
