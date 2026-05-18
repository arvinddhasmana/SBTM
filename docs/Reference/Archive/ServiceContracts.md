# SBTM Service Contracts

> **⚠ Historical — v1 Era.** This document describes v1 internal service boundaries and payload shapes. For the current v2 service topology see [Architecture.md](../Design/Architecture.md).

- Document owner: Engineering
- Last reviewed: 2026-03-30
- Primary use: Internal service boundary reference, payload shapes, and ownership expectations

## Purpose

This document describes how the API Gateway and downstream services interact today. It is not an OpenAPI export. It is a maintainable contract reference for backend engineers, QA, and architecture work.

## Contract Model

| Layer                      | Responsibility                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| API Gateway                | Authenticates users, applies role checks, injects tenant context, proxies to domain services |
| Domain service             | Owns persistence and business logic for its domain                                           |
| Queue or real-time channel | Propagates selected operational state changes asynchronously                                 |

## Gateway to Downstream Mapping

| Gateway Surface                                                       | Downstream Service        | Downstream Path                                                                                         | Contract Notes                                                                                         |
| --------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/api/v1/routes/*` telemetry endpoints                                | GPS Tracking              | `/api/v1/locations`, `/api/v1/routes/:routeId/live-location`, `/api/v1/routes/:routeId/history`         | Access control enforced at gateway using role, assigned routes, or child route lists                   |
| `/api/v1/emergency-events`, `/api/v1/alerts/*`                        | Emergency Alerts          | `/api/v1/emergency-events`, `/api/v1/alerts/active`, `/api/v1/alerts/:alertId`                          | Gateway injects tenant and driver context                                                              |
| `/api/v1/routes/:routeId/students`, `/api/v1/student-presence-events` | Student Presence          | `/api/v1/routes/:routeId/students`, `/api/v1/student-presence-events/manual`, `/api/v1/presence-events` | Gateway-facing presence event payload and downstream manual or BLE flows are not yet perfectly unified |
| `/api/v1/students/*`                                                  | Student Management        | `/students`, `/students/:id`, `/students/:id/assignment`, `/students/bulk-import`                       | Gateway forwards query or body payloads with tenant context expectations                               |
| `/api/v1/inspections`, `/api/v1/compliance*`, `/api/v1/audit`         | Compliance Management     | `/inspections`, `/compliance`, `/compliance/driver/:driverId`, `/audit`                                 | Gateway injects `schoolId` or `school_id` in several flows                                             |
| `/api/v1/video-events*`                                               | Video Service             | `/api/v1/video-events`, `/api/v1/video-events/:id`                                                      | Downstream video service also exposes completion, failure, access-log, and upload endpoints            |
| `/api/v1/parent/children`                                             | Gateway-owned aggregation | Internal query logic plus downstream tracking                                                           | Parent experience is assembled at the gateway layer                                                    |
| `/api/v1/driver/me/schedule`                                          | Gateway-owned aggregation | Internal query logic plus route reference tables                                                        | Driver schedule is currently assembled within gateway-side logic                                       |

## Key Payload Contracts

### Login Contract

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

### GPS Location Ingest Contract

```json
{
  "vehicleId": "uuid",
  "routeId": "uuid",
  "timestamp": "ISO-8601",
  "lat": 43.6532,
  "lng": -79.3832,
  "speedKph": 42,
  "headingDeg": 270,
  "accuracyMeters": 5,
  "schoolId": "uuid"
}
```

### Emergency Event Contract

```json
{
  "schoolId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "driverId": "uuid",
  "timestamp": "ISO-8601",
  "lat": 43.6532,
  "lng": -79.3832,
  "eventType": "PANIC_BUTTON"
}
```

### Presence Contracts

Manual presence event:

```json
{
  "schoolId": "uuid",
  "studentId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "eventType": "BOARD",
  "timestamp": "ISO-8601"
}
```

BLE detection batch:

```json
{
  "schoolId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "timestamp": "ISO-8601",
  "detections": [
    {
      "tagId": "tag-123",
      "signalStrength": -55
    }
  ]
}
```

### Student Contract

```json
{
  "first_name": "Ava",
  "last_name": "Patel",
  "grade": "4",
  "address": "123 Main St",
  "school_id": "uuid",
  "parent_user_id": "uuid",
  "am_route_id": "uuid",
  "pm_route_id": "uuid",
  "external_student_id": "district-123",
  "status": "ENROLLED"
}
```

### Video Event Contract

```json
{
  "schoolId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "driverId": "uuid",
  "timestamp": "ISO-8601",
  "eventType": "EMERGENCY",
  "durationSeconds": 20
}
```

## Tenant and Auth Contract Rules

- Gateway remains the authoritative edge for JWT validation.
- `STA_ADMIN`, `ADMIN`, and `SYSTEM` currently have broad access in tenant guard logic.
- `BOARD_ADMIN` checks are only partially enforced because board-to-school validation is incomplete downstream.
- `SCHOOL_ADMIN` checks rely on `schoolId` alignment in params, query, or body.
- Parent access to route telemetry is controlled via `childRouteIds`.
- Driver access to route telemetry is controlled via `assignedRouteIds`.

## Real-Time and Event Contracts

| Producer         | Contract                                               | Channel                                          | Current State                                     |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| Emergency Alerts | `alert.created`-style alert payloads                   | BullMQ and SSE                                   | Producer exists; parent delivery still incomplete |
| Student Presence | `presence.boarded`, `presence.alighted`-style payloads | BullMQ                                           | Producer exists; mobile UI integration partial    |
| Emergency Alerts | alert stream                                           | SSE at `/api/v1/alerts/stream` in alerts service | Backend exists; parent client adoption incomplete |
| Video Service    | event status updates                                   | internal and WebSocket-oriented patterns         | Partial                                           |

## Contract Caveats

- The GPS, presence, and alert flows are ahead of some client behavior. Endpoint availability does not guarantee full user-facing completion.
- Compliance and student-management endpoints use a mix of `schoolId` and `school_id` naming across gateway and services.
- The notification service boundary is represented in architecture docs but not yet delivered as a complete standalone contract.
- Some downstream services accept permissive `any` payloads for update flows and should be tightened before formal external integration commitments.
