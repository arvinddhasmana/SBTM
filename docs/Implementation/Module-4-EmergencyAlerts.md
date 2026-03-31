# Module 4 - Emergency Alerts Service

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phase: `docs/prd/PhaseWiseImplementationPlan.md` Phase 1

## Location

- `services/emergency-alerts`

## Runtime

- **Port**: 3003 (docker-compose); code default fallback is 3000 — always set `PORT=3003` via environment
- **Dockerfile EXPOSE**: 3003

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- BullMQ v5.66.0 + Redis
- Socket.IO v4.8.1 WebSockets
- class-validator v0.14.3 + class-transformer v0.5.1

## APIs

- `POST /api/v1/emergency-events`
- `GET /api/v1/alerts/active`
- `GET /api/v1/alerts/:alertId`
- `GET /api/v1/alerts/parent-view/:routeId`

## Data Model

- `emergency_alerts`: route/vehicle/driver, location, status
- `alert_notification_logs`

## Integration Notes

- API gateway proxies alert endpoints.
- Admin dashboard consumes alerts via gateway APIs.

## Gaps / Next Steps

- Parent/driver notification integration
- Service-to-service authentication
- Tenant-aware filtering is enforced by `school_id`
- Queue consumers and provider-backed delivery are still incomplete.
