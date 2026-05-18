# SBTM Reference Guide - Complete Reference

All reference documentation for the School Bus Transportation Management (SBTM) platform, consolidated into a single document. Covers the reference overview, the full API reference for gateway-exposed endpoints, and internal service contracts.

---

## Table of Contents

1. [Reference Overview](#sbtm-reference-documentation)
2. [API Reference](#sbtm-api-reference)
3. [Service Contracts](#sbtm-service-contracts)

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Reference/README.md                                         -->
<!-- ======================================================================== -->

# SBTM Reference Documentation

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: API and service boundary reference for developers, QA, and integrators

## Documents

- [APIReference.md](APIReference.md) - externally consumed API surface through the API Gateway
- [ServiceContracts.md](ServiceContracts.md) - downstream service boundaries, payload contracts, and routing expectations

## Scope

This section focuses on interface reference rather than business intent or architecture rationale. Use it when you need to know which endpoint exists, what payload shape it expects, which role can call it, or which service owns the data behind it.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Reference/APIReference.md                                   -->
<!-- ======================================================================== -->

# SBTM API Reference

- Document owner: Engineering
- Last reviewed: 2026-04-06
- Primary use: Formal reference for externally consumed endpoints exposed through the API Gateway

## Scope

This reference describes the current API surface exposed by the API Gateway. All gateway routes are prefixed with `/api/v1`.

For downstream internal service endpoints and queue-driven contracts, use [ServiceContracts.md](ServiceContracts.md).

## Authentication and Authorization

- Authentication: JWT bearer token through the API Gateway
- Global prefix: `/api/v1`
- Primary roles: `STA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN`, `ADMIN`, `DRIVER`, `PARENT`, `SYSTEM`
- Tenant scoping: gateway and guards use `schoolId`, `boardId`, assigned route lists, and child route lists depending on persona

### Headers

| Header                           | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `Authorization: Bearer <token>`  | Required for protected routes        |
| `Content-Type: application/json` | Used on JSON POST and PATCH requests |

## Auth Endpoints

| Method  | Path                                | Access        | Request                                        | Notes                                         |
| ------- | ----------------------------------- | ------------- | ---------------------------------------------- | --------------------------------------------- |
| `POST`  | `/api/v1/auth/login`                | Public        | `email`, `password`                            | Returns JWT-backed session payload            |
| `POST`  | `/api/v1/auth/logout`               | Authenticated | none                                           | Logout is currently client-side token discard |
| `GET`   | `/api/v1/auth/me`                   | Authenticated | none                                           | Returns current user profile                  |
| `POST`  | `/api/v1/auth/invite`               | `STA_ADMIN`+  | `email`, `role`, `schoolId?`, `boardId?`       | Invite user                                   |
| `POST`  | `/api/v1/auth/activate`             | Public        | `token`, `password`, `firstName?`, `lastName?` | Activate invited account                      |
| `GET`   | `/api/v1/auth/users`                | `STA_ADMIN`+  | none                                           | List users (scoped by caller tenant)          |
| `PATCH` | `/api/v1/auth/users/:id/deactivate` | `STA_ADMIN`+  | path `id`                                      | Deactivate user                               |
| `PATCH` | `/api/v1/auth/users/:id/reactivate` | `STA_ADMIN`+  | path `id`                                      | Reactivate user                               |

### Login Request

```json
{
  "email": "operator@example.com",
  "password": "secret123"
}
```

### Invite Request

```json
{
  "email": "teacher@school.edu",
  "role": "SCHOOL_ADMIN",
  "schoolId": "uuid",
  "boardId": "uuid"
}
```

### Activate Request

```json
{
  "token": "invite-token",
  "password": "NewPassword1!",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

## Organization and Tenancy Endpoints

| Method  | Path                             | Access                                     | Request or Query   | Notes                           |
| ------- | -------------------------------- | ------------------------------------------ | ------------------ | ------------------------------- |
| `GET`   | `/api/v1/boards`                 | `STA_ADMIN`+                               | none               | List boards                     |
| `GET`   | `/api/v1/boards/:id`             | `STA_ADMIN`, `BOARD_ADMIN`                 | path `id`          | Get board                       |
| `POST`  | `/api/v1/boards`                 | `STA_ADMIN`+                               | `name`             | Create board                    |
| `PATCH` | `/api/v1/boards/:id`             | `STA_ADMIN`+                               | update payload     | Update board                    |
| `GET`   | `/api/v1/schools`                | `STA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN` | optional `boardId` | List schools or filter by board |
| `GET`   | `/api/v1/schools/:id`            | `STA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN` | path `id`          | Get school                      |
| `POST`  | `/api/v1/schools`                | `STA_ADMIN`, `BOARD_ADMIN`                 | `name`, `boardId`  | Create school                   |
| `PATCH` | `/api/v1/schools/:id`            | `STA_ADMIN`, `BOARD_ADMIN`                 | update payload     | Update school                   |
| `PATCH` | `/api/v1/schools/:id/deactivate` | `STA_ADMIN`, `BOARD_ADMIN`                 | path `id`          | Deactivate school               |

## Route and Fleet Endpoints

| Method   | Path                      | Access                          | Request or Query              | Notes                                                       |
| -------- | ------------------------- | ------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `POST`   | `/api/v1/routes`          | `SCHOOL_ADMIN`, `STA_ADMIN`     | `CreateRouteDto`              | Creates route and optional stop list                        |
| `GET`    | `/api/v1/routes`          | Authenticated with tenant scope | none                          | Lists routes for `req.user.schoolId`                        |
| `GET`    | `/api/v1/routes/:id`      | Authenticated with tenant scope | path `id`                     | Retrieves one route                                         |
| `PATCH`  | `/api/v1/routes/:id`      | `SCHOOL_ADMIN`, `STA_ADMIN`     | `UpdateRouteDto`              | Updates route metadata                                      |
| `DELETE` | `/api/v1/routes/:id`      | `SCHOOL_ADMIN`, `STA_ADMIN`     | path `id`                     | Deletes route                                               |
| `POST`   | `/api/v1/routes/optimize` | `SCHOOL_ADMIN`, `STA_ADMIN`     | array of `CreateRouteStopDto` | Currently returns mocked or placeholder optimization output |
| `POST`   | `/api/v1/vehicles`        | `SCHOOL_ADMIN`, `STA_ADMIN`     | `CreateVehicleDto`            | Create vehicle                                              |
| `GET`    | `/api/v1/vehicles`        | Authenticated with tenant scope | none                          | List vehicles by school                                     |
| `GET`    | `/api/v1/vehicles/:id`    | Authenticated with tenant scope | path `id`                     | Get vehicle                                                 |
| `PATCH`  | `/api/v1/vehicles/:id`    | `SCHOOL_ADMIN`, `STA_ADMIN`     | `UpdateVehicleDto`            | Update vehicle                                              |
| `DELETE` | `/api/v1/vehicles/:id`    | `SCHOOL_ADMIN`, `STA_ADMIN`     | path `id`                     | Delete vehicle                                              |

### Create Route Request

```json
{
  "name": "AM Route 12",
  "direction": "AM",
  "vehicleId": "uuid",
  "schoolId": "uuid",
  "startTime": "07:30",
  "estimatedDuration": 55,
  "stops": [
    {
      "sequence": 0,
      "address": "123 Main St",
      "location": "POINT(-79.3832 43.6532)"
    }
  ]
}
```

## Fleet Assignment Endpoints

| Method  | Path                                   | Access                      | Request or Query                                                            | Notes                     |
| ------- | -------------------------------------- | --------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| `POST`  | `/api/v1/fleet-assignments`            | `STA_ADMIN`                 | `schoolId`, `routeId`, `vehicleId`, `driverId?`, `effectiveDate?`, `notes?` | Propose fleet assignment  |
| `GET`   | `/api/v1/fleet-assignments`            | `STA_ADMIN`, `SCHOOL_ADMIN` | none                                                                        | List assignments (scoped) |
| `GET`   | `/api/v1/fleet-assignments/:id`        | `STA_ADMIN`, `SCHOOL_ADMIN` | path `id`                                                                   | Get assignment by ID      |
| `PATCH` | `/api/v1/fleet-assignments/:id/accept` | `SCHOOL_ADMIN`              | path `id`                                                                   | Accept assignment         |
| `PATCH` | `/api/v1/fleet-assignments/:id/reject` | `SCHOOL_ADMIN`              | path `id`, `notes?`                                                         | Reject assignment         |

### Propose Fleet Assignment Request

```json
{
  "schoolId": "uuid",
  "routeId": "uuid",
  "vehicleId": "uuid",
  "driverId": "uuid",
  "effectiveDate": "2026-04-10",
  "notes": "New bus assigned for spring term"
}
```

## GPS and Route Telemetry Endpoints

| Method | Path                                    | Access        | Request or Query            | Notes                                             |
| ------ | --------------------------------------- | ------------- | --------------------------- | ------------------------------------------------- |
| `GET`  | `/api/v1/routes/active`                 | Authenticated | none                        | Returns active routes visible to the current user |
| `GET`  | `/api/v1/routes/locations`              | Authenticated | none                        | Returns live locations for accessible routes      |
| `GET`  | `/api/v1/routes/:routeId/live-location` | Authenticated | path `routeId`              | Route access enforced by role and assignment      |
| `GET`  | `/api/v1/routes/:routeId/history`       | Authenticated | `from`, `to`, `granularity` | Historical route telemetry                        |
| `POST` | `/api/v1/routes/locations`              | Authenticated | `CreateLocationDto`         | Driver or admin ingest of location points         |

### Create Location Request

```json
{
  "vehicleId": "uuid",
  "routeId": "uuid",
  "timestamp": "2026-03-24T12:30:00Z",
  "lat": 43.6532,
  "lng": -79.3832,
  "speedKph": 42,
  "headingDeg": 270,
  "accuracyMeters": 5
}
```

## Alerts and Incident Endpoints

| Method  | Path                              | Access            | Request or Query                     | Notes                                                            |
| ------- | --------------------------------- | ----------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `GET`   | `/api/v1/alerts/active`           | Authenticated     | optional `schoolId`                  | `STA_ADMIN` may filter by school; others use own tenant scope    |
| `GET`   | `/api/v1/alerts/:id`              | Authenticated     | path `id`                            | Get alert detail                                                 |
| `PATCH` | `/api/v1/alerts/:id/confirm`      | `SCHOOL_ADMIN`+   | `actorUserId`, `actorRole`           | Confirm a Tier 1 alert (sends parent notifications)              |
| `PATCH` | `/api/v1/alerts/:id/false-alarm`  | `SCHOOL_ADMIN`+   | `actorUserId`, `actorRole`, `notes?` | Mark alert as false alarm                                        |
| `PATCH` | `/api/v1/alerts/:id/request-info` | `SCHOOL_ADMIN`+   | `actorUserId`, `actorRole`           | Request more info from driver                                    |
| `GET`   | `/api/v1/alerts/audit/:alertId`   | `SCHOOL_ADMIN`+   | path `alertId`                       | Get audit trail for an alert                                     |
| `POST`  | `/api/v1/emergency-events`        | `DRIVER`, `ADMIN` | `CreateEmergencyEventDto`            | Gateway injects `schoolId` and may default `driverId` from token |

### Create Emergency Event Request

```json
{
  "vehicleId": "uuid",
  "routeId": "uuid",
  "driverId": "uuid",
  "timestamp": "2026-03-24T12:31:00Z",
  "lat": 43.6532,
  "lng": -79.3832,
  "eventType": "PANIC_BUTTON"
}
```

### Confirm Alert Request

```json
{
  "actorUserId": "uuid",
  "actorRole": "SCHOOL_ADMIN"
}
```

### False Alarm Request

```json
{
  "actorUserId": "uuid",
  "actorRole": "SCHOOL_ADMIN",
  "notes": "Driver confirmed no issue on-site"
}
```

## Absence Endpoints

| Method   | Path                           | Access                    | Request or Query                               | Notes                      |
| -------- | ------------------------------ | ------------------------- | ---------------------------------------------- | -------------------------- |
| `POST`   | `/api/v1/absences`             | `PARENT`                  | `studentId`, `tripDate`, `routeType`, `notes?` | Report absence for a child |
| `GET`    | `/api/v1/absences`             | `DRIVER`, `SCHOOL_ADMIN`+ | query `date` (YYYY-MM-DD)                      | List absences for a date   |
| `GET`    | `/api/v1/absences/admin`       | `SCHOOL_ADMIN`+           | none                                           | Admin view of absences     |
| `PATCH`  | `/api/v1/absences/:id/confirm` | `SCHOOL_ADMIN`            | path `id`                                      | Confirm absence            |
| `PATCH`  | `/api/v1/absences/:id/reject`  | `SCHOOL_ADMIN`            | path `id`, `notes?`                            | Reject absence             |
| `DELETE` | `/api/v1/absences/:id`         | `PARENT`, `SCHOOL_ADMIN`+ | path `id`                                      | Cancel absence             |

### Report Absence Request

```json
{
  "studentId": "uuid",
  "tripDate": "2026-04-07",
  "routeType": "AM",
  "notes": "Doctor appointment"
}
```

## Driver and Parent Endpoints

| Method | Path                         | Access   | Request or Query | Notes                                              |
| ------ | ---------------------------- | -------- | ---------------- | -------------------------------------------------- |
| `GET`  | `/api/v1/driver/me/schedule` | `DRIVER` | none             | Returns driver schedule and assigned route context |
| `GET`  | `/api/v1/parent/children`    | `PARENT` | none             | Returns linked children and route context          |

## Presence Endpoints

| Method | Path                               | Access        | Request or Query       | Notes                                                        |
| ------ | ---------------------------------- | ------------- | ---------------------- | ------------------------------------------------------------ |
| `GET`  | `/api/v1/routes/:routeId/students` | Authenticated | path `routeId`         | Lists route students and presence state via presence gateway |
| `POST` | `/api/v1/student-presence-events`  | Authenticated | presence event payload | Driver workflow entry point for presence updates             |

### Presence Event Request

```json
{
  "studentId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "eventType": "BOARD",
  "source": "MANUAL",
  "timestamp": "2026-03-24T12:32:00Z"
}
```

## Student Management Endpoints

| Method  | Path                              | Access                                                        | Request or Query         | Notes                                                                      |
| ------- | --------------------------------- | ------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `GET`   | `/api/v1/students`                | `ADMIN`, `STA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN`           | flexible query object    | Proxies filters such as `school_id`, `route_id`, `parent_id`               |
| `GET`   | `/api/v1/students/:id`            | `ADMIN`, `STA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN`, `PARENT` | path `id`                | Parent access is still subject to effective downstream policy expectations |
| `POST`  | `/api/v1/students`                | `ADMIN`, `SCHOOL_ADMIN`                                       | student DTO              | Enroll student                                                             |
| `PATCH` | `/api/v1/students/:id`            | `ADMIN`, `SCHOOL_ADMIN`                                       | update DTO               | Update student                                                             |
| `PATCH` | `/api/v1/students/:id/assignment` | `ADMIN`, `SCHOOL_ADMIN`                                       | route assignment payload | Updates AM or PM assignment                                                |
| `POST`  | `/api/v1/students/bulk-import`    | `ADMIN`, `SCHOOL_ADMIN`                                       | `file`, `school_id`      | Bulk import via CSV string payload at the gateway layer                    |

## Compliance Endpoints

| Method | Path                                  | Access                          | Request or Query   | Notes                                                         |
| ------ | ------------------------------------- | ------------------------------- | ------------------ | ------------------------------------------------------------- |
| `GET`  | `/api/v1/inspections`                 | Authenticated with tenant guard | query object       | Gateway injects `schoolId` where available                    |
| `POST` | `/api/v1/inspections`                 | Authenticated with tenant guard | inspection payload | Gateway injects `school_id` from user context where available |
| `GET`  | `/api/v1/compliance/driver/:driverId` | Authenticated with tenant guard | path `driverId`    | Driver compliance record                                      |
| `GET`  | `/api/v1/compliance`                  | Authenticated with tenant guard | query object       | List compliance records                                       |
| `GET`  | `/api/v1/audit`                       | Authenticated with tenant guard | query object       | List audit logs                                               |

## Video Endpoints

| Method | Path                       | Access                      | Request or Query                                                                                               | Notes                                                                      |
| ------ | -------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET`  | `/api/v1/video-events`     | Authenticated               | `schoolId`, `vehicleId`, `routeId`, `driverId`, `eventType`, `status`, `startDate`, `endDate`, `page`, `limit` | `STA_ADMIN` may supply explicit `schoolId`; others default to token school |
| `GET`  | `/api/v1/video-events/:id` | Authenticated               | path `id`                                                                                                      | Get video event detail                                                     |
| `POST` | `/api/v1/video-events`     | `DRIVER`, `ADMIN`, `SYSTEM` | `CreateVideoEventDto`                                                                                          | Creates event metadata and upload workflow                                 |

## Document Generation Endpoints

| Method | Path                                         | Access                      | Request or Query | Notes                            |
| ------ | -------------------------------------------- | --------------------------- | ---------------- | -------------------------------- |
| `GET`  | `/api/v1/documents/fleet-assignment/:id/pdf` | `STA_ADMIN`, `SCHOOL_ADMIN` | path `id`        | Download fleet assignment as PDF |
| `GET`  | `/api/v1/documents/route-plan/:routeId/pdf`  | `STA_ADMIN`, `SCHOOL_ADMIN` | path `routeId`   | Download route plan as PDF       |

## Contract Caveats

- The API reference documents the gateway-facing surface. Downstream services may use different internal paths and payload names.
- Parent and driver real-time workflows remain partially implemented even when corresponding endpoints exist.
- Board-level scoping is structurally present but not yet enforced consistently across all downstream services.
- Route optimization and several notification behaviors remain partial or placeholder quality.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Reference/ServiceContracts.md                               -->
<!-- ======================================================================== -->

# SBTM Service Contracts

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
