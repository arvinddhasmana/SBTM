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
- Not proxied through API gateway yet.
- No authentication or tenant guards at service level.

## Gaps / Next Steps
- API gateway routes for compliance APIs
- Role-based access and audit policy enforcement
