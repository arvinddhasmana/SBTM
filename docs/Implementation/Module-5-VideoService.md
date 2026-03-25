# Module 5 - Video Capture Service

## Status
Implemented and tested (per status report).

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 4 and 5

## Location
- `services/video-service`

## Tech Stack
- NestJS + TypeORM + PostgreSQL
- MinIO/local storage
- Socket.IO WebSockets

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
