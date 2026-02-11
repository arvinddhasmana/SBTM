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
- Not proxied through API gateway yet.
- No authentication or tenant guards at service level.

## Gaps / Next Steps
- API gateway routes for student management
- Tenant-aware enforcement
- Parent/driver integration for roster and presence display
