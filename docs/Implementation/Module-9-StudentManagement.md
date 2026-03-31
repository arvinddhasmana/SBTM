# Module 9 - Student Management Service

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 2 and 4

## Location

- `services/student-management`

## Runtime

- **Port**: 3006 (docker-compose and code default)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- csv-parser v3.0.0 (bulk student import)

## APIs

- `POST /students`
- `GET /students` (filters: `school_id`, `route_id`, `parent_id`)
- `GET /students/:id`
- `PATCH /students/:id`
- `DELETE /students/:id`
- `PATCH /students/:id/assignment`
- `POST /students/bulk-import`

## Data Model

- `students` with `school_id`, route and stop references

## Integration Notes

- Proxied through API gateway (`/api/v1/students`).
- Gateway injects `school_id` and enforces tenant scope.

## Gaps / Next Steps

- Parent/driver integration for roster and presence display
- Invitation-aware onboarding and lifecycle integration
