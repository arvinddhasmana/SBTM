# Module 4 - Emergency Alerts Service

## Status
Implemented and running in Docker Compose.

## Location
- `services/emergency-alerts`

## Tech Stack
- NestJS + TypeORM + PostgreSQL
- BullMQ + Redis
- Socket.IO WebSockets

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
- Admin dashboard consumes alerts with mock fallback.

## Gaps / Next Steps
- Parent/driver notification integration
- Service-to-service authentication
- Tenant-aware filtering
