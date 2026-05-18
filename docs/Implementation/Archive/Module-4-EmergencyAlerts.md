# Module 4 - Emergency Alerts Service

> **⚠ Historical — v1 Era.** This module document describes the v1 `emergency-alerts` service (`EmergencyAlert`, `AlertAuditLog`). In v2 these tables are replaced by `stx_alerts` and `stx_alert_audit` in the API Gateway. For the current alert design see [Alerts.md](../Design/Alerts.md).

- Last reviewed: 2026-04-09

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

- `POST /api/v1/emergency-events` — create a new emergency event
- `GET /api/v1/alerts` — list all alerts (with optional `schoolId` filter)
- `GET /api/v1/alerts/active` — list operationally active alerts (ACTIVE, PENDING_CONFIRMATION, CONFIRMED, AUTO_ESCALATED)
- `GET /api/v1/alerts/:alertId` — get a single alert
- `GET /api/v1/alerts/parent-view/:routeId` — parent-facing alert view for a route
- `GET /api/v1/alerts/by-routes?routeIds=...` — batch lookup by route IDs
- `GET /api/v1/alerts/audit/:alertId` — full lifecycle audit trail for an alert
- `PATCH /api/v1/alerts/:alertId/confirm` — confirm a Tier 1 alert (triggers parent notification)
- `PATCH /api/v1/alerts/:alertId/false-alarm` — mark as false alarm (suppresses parent notification)
- `PATCH /api/v1/alerts/:alertId/request-info` — request more information (escalation timers continue)
- `PATCH /api/v1/alerts/:alertId/status-update` — add a status update with notes to an active alert
- `PATCH /api/v1/alerts/:alertId/resolve` — resolve an alert (accepts optional notes, actorUserId, actorRole)

## Data Model

- `emergency_alerts`: route/vehicle/driver, location, status, tier, escalation level, confirmation details
- `alert_audit_logs`: full lifecycle audit trail (events: CREATED, PENDING_CONFIRMATION, CONFIRMED, AUTO_ESCALATED, FALSE_ALARM, PARENT_NOTIFIED, BOARD_ESCALATED, OSTA_ESCALATED, RESOLVED, INFO_REQUESTED, STATUS_UPDATE)
- `alert_notification_logs`: notification delivery records per channel

## Alert Lifecycle

```
PENDING_CONFIRMATION → CONFIRMED → RESOLVED
PENDING_CONFIRMATION → FALSE_ALARM
PENDING_CONFIRMATION → AUTO_ESCALATED → RESOLVED
ACTIVE → RESOLVED
```

- **CONFIRMED**: Active working state. Admins can add status updates (notes) and eventually resolve with resolution notes.
- **RESOLVED / FALSE_ALARM**: Terminal states. Removed from Dashboard, still accessible on the full Alerts page.

## Integration Notes

- API gateway proxies alert endpoints with RBAC enforcement.
- Admin dashboard consumes alerts via gateway APIs.
- Dashboard (Info and Action mode) filters out terminal alerts (RESOLVED, FALSE_ALARM) and their associated routes, buses, and students.

## Gaps / Next Steps

- Parent/driver notification delivery via push/SMS providers
- Queue consumers and provider-backed delivery are still incomplete
