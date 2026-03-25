# Module 9 - Student Management Service

## Status
Implemented and running in Docker Compose.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 2 and 4

## Location
- `services/student-management`

## Tech Stack
- NestJS + TypeORM + PostgreSQL

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
