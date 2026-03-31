# Module 8 - API Gateway

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 4 and 5

## Location

- `services/api-gateway`

## Runtime

- **Port**: 3001 (default and docker-compose)
- **NODE_ENV**: `production` in docker-compose (other services use `development`)

## Tech Stack

- NestJS **v10.4.15** + TypeORM **v10.0.2** + PostgreSQL
- JWT auth (`@nestjs/jwt` v10.2.0) + Passport (`@nestjs/passport` v10.0.3) + RBAC
- Throttling (`@nestjs/throttler` v6.3.0), structured logging (`LoggingInterceptor`), error filters (`HttpExceptionFilter`)
- Axios for downstream service proxying

> **Note**: This service uses NestJS **v10**, while all other NestJS services have been upgraded to **v11.0.1**. Upgrading api-gateway to v11 is a known gap.

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

- Upgrade NestJS from v10 to v11 – version mismatch with other services
- Organization management UI (board/school admin)
- Map provider integration for route optimization
- Service-to-service trust and deeper tenant hardening remain future work.
- NODE_ENV inconsistency: api-gateway runs `production` in docker-compose while all other services run `development`
