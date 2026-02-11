# Module 9 - Student Management Service

## Status
Implemented and running in Docker Compose.

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
