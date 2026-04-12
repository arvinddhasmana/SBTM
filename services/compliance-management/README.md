# Compliance Management Service

## Overview

The Compliance Management Service tracks driver compliance records, vehicle inspections, and audit logs for school transportation operations. It supports the operational safety layer of SBTM by recording whether drivers and vehicles meet the required readiness and accountability checks.

## Features

- Driver compliance records with expiry and status tracking
- Vehicle inspection creation and retrieval
- Audit log creation and query endpoints
- Tenant-aware queries by `schoolId`
- Separate compliance, inspection, and audit modules within one service boundary

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
│   ├── audit/                    # Audit log ingestion and retrieval
│   ├── compliance/               # Driver compliance status and expiry tracking
│   └── inspection/               # Vehicle inspection records
├── app.module.ts
└── main.ts
```

### Data Responsibilities

The service currently owns these primary persistence concerns:

- `driver_compliance` for driver expiry dates and readiness status
- `vehicle_inspections` for pre-trip, post-trip, and maintenance inspection records
- `audit_logs` for user actions and resource-level audit entries

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- Docker and Docker Compose for local full-stack runs

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
```

If `.env.example` is not present, provide the variables listed below directly in your shell or Docker configuration.

3. Start the development server:

```bash
pnpm run start:dev
```

### Running with Docker

```bash
docker compose up --build compliance-management
```

## API Endpoints

### Driver Compliance

- `GET /compliance` - List compliance records for a school using `schoolId`
- `GET /compliance/driver/:driverId` - Get a single driver compliance record
- `POST /compliance/driver/:driverId` - Create or update a driver compliance record
- `GET /compliance/expiring` - List compliance records that are expiring soon for a school

### Vehicle Inspections

- `POST /inspections` - Create an inspection record
- `GET /inspections` - List inspections for a school using `schoolId`
- `GET /inspections/vehicle/:id` - Get inspections for a vehicle
- `GET /inspections/latest` - Get the latest inspection for a vehicle using `vehicleId`

### Audit Logs

- `POST /audit` - Record an audit event
- `GET /audit` - List audit records for a school using `schoolId`
- `GET /audit/resource` - Filter audit records by `resource` and `resourceId`

## Testing

### Unit Tests

```bash
pnpm run test
```

### E2E Tests

```bash
pnpm run test:e2e
```

### Coverage

```bash
pnpm run test:cov
```

## Configuration

### Environment Variables

| Variable      | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `PORT`        | Service port. Docker Compose targets `3007`.                     |
| `DB_HOST`     | PostgreSQL host.                                                 |
| `DB_PORT`     | PostgreSQL port. Defaults to `5432` in the module configuration. |
| `DB_USERNAME` | PostgreSQL username.                                             |
| `DB_PASSWORD` | PostgreSQL password.                                             |
| `DB_DATABASE` | PostgreSQL database name.                                        |

## Integration Notes

- The API Gateway is expected to front this service for authenticated platform access.
- Audit entries are useful for compliance reporting, but the current implementation is service-local rather than a centralized cross-service audit pipeline.
- Compliance and inspection inputs currently use permissive DTO handling in several endpoints and should be tightened as the service matures.

## Security and Operational Notes

- Tenant scoping depends on `schoolId` query usage and upstream enforcement.
- Audit records include user, resource, and request-context fields that should be treated as operationally sensitive.
- The bootstrap file currently contains an incorrect log message and default port text inherited from another service. The deployed topology should follow Docker Compose and gateway configuration until the runtime code is corrected.

## Roadmap

- [x] Driver compliance status tracking
- [x] Vehicle inspection storage
- [x] Audit log persistence and queries
- [ ] Stronger DTO validation and explicit contracts
- [ ] Centralized audit pipeline across services
- [ ] Automated compliance expiry notifications and escalation workflows

## License

UNLICENSED - Private project
