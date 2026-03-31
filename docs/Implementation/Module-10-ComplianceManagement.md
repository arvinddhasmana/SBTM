# Module 10 - Compliance Management Service

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phase: `docs/prd/PhaseWiseImplementationPlan.md` Phase 5

## Location

- `services/compliance-management`

## Runtime

- **Port**: 3007 (docker-compose); code default fallback is 3006 — always set `PORT=3007` via environment
- **Dockerfile EXPOSE**: Currently set to 3006 (should be corrected to 3007)
- **Bootstrap log**: Currently prints "Student Management Service" instead of "Compliance Management Service" (copy-paste error in `src/main.ts`)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- `@nestjs/schedule` v6.1.1 (scheduled tasks)
- `csv-parser` v3.0.0 (data import)

## APIs

- `GET /compliance`, `GET /compliance/driver/:driverId`, `POST /compliance/driver/:driverId`
- `GET /inspections`, `GET /inspections/latest`, `POST /inspections`
- `GET /audit`, `GET /audit/resource`, `POST /audit`

## Data Model

- `driver_compliance`, `vehicle_inspections`, `audit_logs`

## Integration Notes

- Proxied through API gateway (`/api/v1/compliance`, `/api/v1/inspections`, `/api/v1/audit`).
- Gateway injects `school_id` and enforces tenant scope.

## Gaps / Next Steps

- Fix copy-paste error: `main.ts` log message says "Student Management Service" instead of "Compliance Management Service"
- Fix Dockerfile `EXPOSE 3006` → `EXPOSE 3007` to match docker-compose port
- Role-based access and audit policy enforcement
- Centralized cross-service audit pipeline and retention integration
