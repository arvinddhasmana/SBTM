# Module 8 - API Gateway

## Status
Implemented and running in Docker Compose.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 4 and 5

## Location
- `services/api-gateway`

## Tech Stack
- NestJS + TypeORM + PostgreSQL
- JWT auth + RBAC
- Throttling, logging, error filters

## APIs
### Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Organization
- `GET /api/v1/boards`, `POST /api/v1/boards`
- `GET /api/v1/schools`, `POST /api/v1/schools`

### Fleet
- `GET /api/v1/vehicles`, `POST /api/v1/vehicles`, `PATCH /api/v1/vehicles/:id`, `DELETE /api/v1/vehicles/:id`

### Routes
- `GET /api/v1/routes`, `POST /api/v1/routes`, `PATCH /api/v1/routes/:id`, `DELETE /api/v1/routes/:id`
- `POST /api/v1/routes/optimize` (mock optimization)

### Proxies
- GPS: live-location, history, ingest (`POST /routes/locations`)
- Alerts: active list, detail, create
- Presence: route students, manual events
- Video: list, detail, create
- Students: list, detail, enroll, assignment, bulk import
- Compliance: inspections, compliance, audit
- Parent: child list
- Driver: schedule

## Data Model
- `school_boards`, `schools`, `users`, `routes`, `route_stops`, `vehicles`

## Multi-Tenant Notes
- Guards enforce `boardId` and `schoolId` on gateway endpoints.
- Downstream services enforce `school_id` tenant isolation.

## Gaps / Next Steps
- Organization management UI (board/school admin)
- Map provider integration for route optimization
- Service-to-service trust and deeper tenant hardening remain future work.
