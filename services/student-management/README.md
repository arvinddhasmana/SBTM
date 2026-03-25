# Student Management Service

## Overview

The Student Management Service owns student enrollment records, route assignments, and bulk roster import for the School Bus Transport Management System. It provides the backend record of which students belong to a school, which parent account is linked, and which AM or PM route and stop assignments apply.

## Features

- Student record creation, update, retrieval, and deletion
- Tenant-aware filtering by `school_id`
- Route and stop assignment updates for AM and PM runs
- Parent-linked student lookups via `parent_user_id`
- Bulk roster import from CSV content

## Architecture

### Tech Stack
- Framework: NestJS (TypeScript)
- Database: PostgreSQL with TypeORM
- Validation: class-validator and Nest global validation pipe
- Testing: Jest (unit and e2e)

### Module Structure
```text
src/
├── modules/
│   └── student/
│       ├── dto/                 # Request DTOs for create and update flows
│       ├── entities/            # Student entity and enum definitions
│       ├── student.controller.ts
│       ├── student.module.ts
│       └── student.service.ts
├── app.module.ts
└── main.ts
```

### Data Responsibilities

The service persists the `students` table and currently owns these key fields:

- Student identity: `id`, `first_name`, `last_name`, `external_student_id`
- Tenant boundary: `school_id`
- Parent linkage: `parent_user_id`
- Transportation assignment: `am_route_id`, `pm_route_id`, `am_stop_id`, `pm_stop_id`
- Lifecycle state: `status`

The table enforces uniqueness on `school_id + external_student_id`.

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL
- Docker and Docker Compose for local full-stack runs

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

If `.env.example` is not present, provide the variables listed below directly in your shell or Docker configuration.

3. Start the development server:
```bash
npm run start:dev
```

### Running with Docker

```bash
docker compose up --build student-management
```

## API Endpoints

- `POST /students` - Create a student record
- `GET /students` - List students, optionally filtered by `school_id`, `route_id`, or `parent_id`
- `GET /students/:id` - Get a student by identifier
- `PATCH /students/:id` - Update an existing student record
- `DELETE /students/:id` - Remove a student record
- `PATCH /students/:id/assignment` - Update AM or PM route and stop assignments
- `POST /students/bulk-import` - Bulk import student records from CSV content or uploaded file

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Coverage
```bash
npm run test:cov
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Service port. Defaults to `3006`. |
| `DB_HOST` | PostgreSQL host. |
| `DB_PORT` | PostgreSQL port. Defaults to `5433` when running outside Docker in the local code configuration, `5432` in Docker Compose. |
| `DB_USERNAME` | PostgreSQL username. |
| `DB_PASSWORD` | PostgreSQL password. |
| `DB_DATABASE` | PostgreSQL database name. |

## Integration Notes

- The API Gateway is expected to front this service and enforce authentication, authorization, and broader route or stop validation.
- The current service trusts upstream callers for cross-service consistency checks such as whether a route or stop belongs to the same school.
- Bulk import currently parses simple CSV rows and is best suited to controlled imports rather than untrusted files.

## Security and Tenant Boundaries

- Tenant filtering is based on `school_id` and must be preserved by upstream request routing.
- Input validation is enabled globally through Nest validation pipes.
- Additional DB-level tenant hardening and stronger service-to-service trust controls are planned, but not yet implemented here.

## Roadmap

- [x] Student CRUD and basic filtering
- [x] Route and stop assignment updates
- [x] Bulk CSV import
- [ ] Stronger validation against route and stop ownership
- [ ] Invitation and provisioning workflows for linked parent accounts
- [ ] Improved import validation, reporting, and rollback controls

## License

UNLICENSED - Private project