# SBTM API Reference

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: Formal reference for externally consumed endpoints exposed through the API Gateway

## Scope

This reference describes the current API surface exposed by the API Gateway. All gateway routes are prefixed with `/api/v1`.

For downstream internal service endpoints and queue-driven contracts, use [ServiceContracts.md](ServiceContracts.md).

## Authentication and Authorization

- Authentication: JWT bearer token through the API Gateway
- Global prefix: `/api/v1`
- Primary roles: `OSTA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN`, `ADMIN`, `DRIVER`, `PARENT`, `SYSTEM`
- Tenant scoping: gateway and guards use `schoolId`, `boardId`, assigned route lists, and child route lists depending on persona

### Headers

| Header | Purpose |
| --- | --- |
| `Authorization: Bearer <token>` | Required for protected routes |
| `Content-Type: application/json` | Used on JSON POST and PATCH requests |

## Auth Endpoints

| Method | Path | Access | Request | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Public | `email`, `password` | Returns JWT-backed session payload |
| `POST` | `/api/v1/auth/logout` | Authenticated | none | Logout is currently client-side token discard |
| `GET` | `/api/v1/auth/me` | Authenticated | none | Returns current user profile |

### Login Request

```json
{
  "email": "operator@example.com",
  "password": "secret123"
}
```

## Organization and Tenancy Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/boards` | `OSTA_ADMIN` | none | List boards |
| `GET` | `/api/v1/boards/:id` | `OSTA_ADMIN`, `BOARD_ADMIN` | path `id` | Get board |
| `POST` | `/api/v1/boards` | `OSTA_ADMIN` | `name` | Create board |
| `GET` | `/api/v1/schools` | `OSTA_ADMIN`, `BOARD_ADMIN` | optional `boardId` | List schools or filter by board |
| `GET` | `/api/v1/schools/:id` | `OSTA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN` | path `id` | Get school |
| `POST` | `/api/v1/schools` | `OSTA_ADMIN`, `BOARD_ADMIN` | `name`, `boardId` | Create school |

## Route and Fleet Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/routes` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | `CreateRouteDto` | Creates route and optional stop list |
| `GET` | `/api/v1/routes` | Authenticated with tenant scope | none | Lists routes for `req.user.schoolId` |
| `GET` | `/api/v1/routes/:id` | Authenticated with tenant scope | path `id` | Retrieves one route |
| `PATCH` | `/api/v1/routes/:id` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | `UpdateRouteDto` | Updates route metadata |
| `DELETE` | `/api/v1/routes/:id` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | path `id` | Deletes route |
| `POST` | `/api/v1/routes/optimize` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | array of `CreateRouteStopDto` | Currently returns mocked or placeholder optimization output |
| `POST` | `/api/v1/vehicles` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | `CreateVehicleDto` | Create vehicle |
| `GET` | `/api/v1/vehicles` | Authenticated with tenant scope | none | List vehicles by school |
| `GET` | `/api/v1/vehicles/:id` | Authenticated with tenant scope | path `id` | Get vehicle |
| `PATCH` | `/api/v1/vehicles/:id` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | `UpdateVehicleDto` | Update vehicle |
| `DELETE` | `/api/v1/vehicles/:id` | `SCHOOL_ADMIN`, `OSTA_ADMIN` | path `id` | Delete vehicle |

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

## GPS and Route Telemetry Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/routes/active` | Authenticated | none | Returns active routes visible to the current user |
| `GET` | `/api/v1/routes/locations` | Authenticated | none | Returns live locations for accessible routes |
| `GET` | `/api/v1/routes/:routeId/live-location` | Authenticated | path `routeId` | Route access enforced by role and assignment |
| `GET` | `/api/v1/routes/:routeId/history` | Authenticated | `from`, `to`, `granularity` | Historical route telemetry |
| `POST` | `/api/v1/routes/locations` | Authenticated | `CreateLocationDto` | Driver or admin ingest of location points |

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

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/alerts/active` | Authenticated | optional `schoolId` | `OSTA_ADMIN` may filter by school; others use own tenant scope |
| `GET` | `/api/v1/alerts/:id` | Authenticated | path `id` | Get alert detail |
| `POST` | `/api/v1/emergency-events` | `DRIVER`, `ADMIN` | `CreateEmergencyEventDto` | Gateway injects `schoolId` and may default `driverId` from token |

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

## Driver and Parent Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/driver/me/schedule` | `DRIVER` | none | Returns driver schedule and assigned route context |
| `GET` | `/api/v1/parent/children` | `PARENT` | none | Returns linked children and route context |

## Presence Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/routes/:routeId/students` | Authenticated | path `routeId` | Lists route students and presence state via presence gateway |
| `POST` | `/api/v1/student-presence-events` | Authenticated | presence event payload | Driver workflow entry point for presence updates |

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

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/students` | `ADMIN`, `OSTA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN` | flexible query object | Proxies filters such as `school_id`, `route_id`, `parent_id` |
| `GET` | `/api/v1/students/:id` | `ADMIN`, `OSTA_ADMIN`, `BOARD_ADMIN`, `SCHOOL_ADMIN`, `PARENT` | path `id` | Parent access is still subject to effective downstream policy expectations |
| `POST` | `/api/v1/students` | `ADMIN`, `SCHOOL_ADMIN` | student DTO | Enroll student |
| `PATCH` | `/api/v1/students/:id` | `ADMIN`, `SCHOOL_ADMIN` | update DTO | Update student |
| `PATCH` | `/api/v1/students/:id/assignment` | `ADMIN`, `SCHOOL_ADMIN` | route assignment payload | Updates AM or PM assignment |
| `POST` | `/api/v1/students/bulk-import` | `ADMIN`, `SCHOOL_ADMIN` | `file`, `school_id` | Bulk import via CSV string payload at the gateway layer |

## Compliance Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/inspections` | Authenticated with tenant guard | query object | Gateway injects `schoolId` where available |
| `POST` | `/api/v1/inspections` | Authenticated with tenant guard | inspection payload | Gateway injects `school_id` from user context where available |
| `GET` | `/api/v1/compliance/driver/:driverId` | Authenticated with tenant guard | path `driverId` | Driver compliance record |
| `GET` | `/api/v1/compliance` | Authenticated with tenant guard | query object | List compliance records |
| `GET` | `/api/v1/audit` | Authenticated with tenant guard | query object | List audit logs |

## Video Endpoints

| Method | Path | Access | Request or Query | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/video-events` | Authenticated | `schoolId`, `vehicleId`, `routeId`, `driverId`, `eventType`, `status`, `startDate`, `endDate`, `page`, `limit` | `OSTA_ADMIN` may supply explicit `schoolId`; others default to token school |
| `GET` | `/api/v1/video-events/:id` | Authenticated | path `id` | Get video event detail |
| `POST` | `/api/v1/video-events` | `DRIVER`, `ADMIN`, `SYSTEM` | `CreateVideoEventDto` | Creates event metadata and upload workflow |

## Contract Caveats

- The API reference documents the gateway-facing surface. Downstream services may use different internal paths and payload names.
- Parent and driver real-time workflows remain partially implemented even when corresponding endpoints exist.
- Board-level scoping is structurally present but not yet enforced consistently across all downstream services.
- Route optimization and several notification behaviors remain partial or placeholder quality.