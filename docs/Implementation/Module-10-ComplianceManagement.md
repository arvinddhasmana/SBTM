# Module 10 - Compliance Management Service

## Status
Implemented and running in Docker Compose.

## Location
- `services/compliance-management`

## Tech Stack
- NestJS + TypeORM + PostgreSQL

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
- Role-based access and audit policy enforcement
