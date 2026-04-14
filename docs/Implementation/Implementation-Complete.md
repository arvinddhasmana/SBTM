# SBTM Implementation Guide - Complete Reference

All module implementation documentation for the School Bus Transportation Management (SBTM) platform, consolidated into a single reference document. Each section contains the full content of its source file, covering status, tech stack, APIs, data models, integration notes, and known gaps for every service and application module.

---

## Table of Contents

1. [Module 1 - GPS Tracking Service](#module-1---gps-tracking-service)
2. [Module 2 - Parent App (Web)](#module-2---parent-app-web)
3. [Module 3 - Driver App (Mobile)](#module-3---driver-app-mobile)
4. [Module 4 - Emergency Alerts Service](#module-4---emergency-alerts-service)
5. [Module 5 - Video Capture Service](#module-5---video-capture-service)
6. [Module 6 - Student Presence Detection](#module-6---student-presence-detection)
7. [Module 7 - Admin Dashboard](#module-7---admin-dashboard)
8. [Module 8 - API Gateway](#module-8---api-gateway)
9. [Module 9 - Student Management Service](#module-9---student-management-service)
10. [Module 10 - Compliance Management Service](#module-10---compliance-management-service)
11. [Module 11 - Notification Service](#module-11---notification-service)

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-1-GpsTracking.md                      -->
<!-- ======================================================================== -->

# Module 1 - GPS Tracking Service

- Last reviewed: 2026-03-30

## Status

Implemented — Phase 3 GPS eventing, geofencing and optimization complete.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Phase delivery: `docs/prd/UpgradePlan/Phase-3-GpsEventingGeofencing.md`

## Location

- `services/gps-tracking`

## Runtime

- **Port**: 3002 (docker-compose); code default is 3001 — always set `PORT=3002` via environment
- **Database**: Uses `DATABASE_URL` connection string (Prisma pattern), unlike other services which use separate `DB_HOST`/`DB_PORT` variables

## Tech Stack

- Express + TypeScript
- Prisma v5.22.0 + PostgreSQL (PostGIS for spatial queries)
- Zod validation
- BullMQ v5.71.1 + ioredis v5.10.1 (event publication)
- Axios (HTTP client for downstream calls)
- jsonwebtoken (JWT verification for internal service auth)

## APIs

- `POST /api/v1/locations` — Ingest GPS point; validates coordinate ranges; publishes `location.updated` to `gps` queue; runs geofence deviation check
- `GET /api/v1/routes/:routeId/live-location` — Latest position
- `GET /api/v1/routes/:routeId/history` — Full route history
- `POST /api/v1/routes/lifecycle` — Record route lifecycle event
- `GET /api/v1/routes/:routeId/lifecycle` — Get lifecycle events
- `PUT /api/v1/geofences` — Create or update geofence thresholds for a route
- `GET /api/v1/routes/:routeId/geofence` — Get geofence config for a route
- `GET /api/v1/routes/:routeId/deviations` — List deviation audit events for a route

## Data Model

- `location_points`: `vehicle_id`, `route_id`, `school_id`, `timestamp`, `lat`, `lng`, telemetry fields
- `route_lifecycle_events`: route execution events (start, stop, completion)
- `route_geofences`: per-route configurable corridor/stop-proximity/deviation thresholds
- `route_deviation_events`: immutable deviation audit log written by geofence service

## Event Publication

After each `POST /api/v1/locations`:

1. `location.updated` published to the `gps` BullMQ queue — payload matches the v1 Event Catalog envelope (vehicleId, routeId, schoolId, lat, lng, speed, heading, accuracy).
2. `route.deviation` published to the `gps` queue when vehicle exceeds configured `deviationThresholdMeters` (defaults to 300 m).

Both events are fire-and-forget — publication failures are logged but do not block the ingest response.

## Geofencing

- `GeofenceService.checkDeviation` runs a PostGIS `ST_Distance(geography)` query to find the minimum distance from the incoming point to any prior breadcrumb on the route.
- If distance exceeds configured `deviationThresholdMeters`, a `route_deviation_events` record is written and a `route.deviation` event is published.
- Threshold defaults: corridor 200 m, stop proximity 50 m, deviation alert 300 m — all configurable per route via `PUT /api/v1/geofences`.

## Coordinate Validation

Zod schema validates:

- `lat`: must be in `[-90, 90]`
- `lng`: must be in `[-180, 180]`
- `speedKph` and `accuracyMeters`: must be ≥ 0
- `headingDeg`: must be in `[0, 360]`

## Integration Notes

- API gateway proxies live/history and ingest endpoints.
- `REDIS_HOST` and `REDIS_PORT` env vars must be set for event publication (configured in docker-compose).
- Driver app posts to gateway endpoints when configured.

## Gaps / Next Steps

- ETA calculation based on current position and route progress (FR-GEO-003) is not yet implemented.
- Geofence corridor is approximated by route breadcrumbs, not a pre-defined polyline from a route planning system. A dedicated route geometry table would improve accuracy.
- BullMQ `gps` queue consumers (notification, analytics) are not yet implemented.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-2-ParentApp.md                        -->
<!-- ======================================================================== -->

# Module 2 - Parent App (Web)

- Last reviewed: 2026-03-30

## Status

Implemented with live gateway integration.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phase: `docs/prd/PhaseWiseImplementationPlan.md` Phase 1

## Location

- `apps/parent-app/web`

## Runtime

- **Port**: 3000 (dev Vite), 80 (production Nginx)
- **docker-compose**: Maps 3000→80

## Tech Stack

- React 19.2.0 + Vite 7.2.4
- TailwindCSS 3.4.17
- React Router DOM 7.10.1 + Leaflet 1.9.4 + React Leaflet 5.0.0
- Axios 1.13.2 (HTTP client)
- Lucide React (icons)
- Testing: Vitest 4.0.15 + React Testing Library 16.3.0
- TypeScript 5.9.3

## Functionality

- Gateway login
- Child cards with status
- Live map with polling for route location

## Integration Notes

- Uses `VITE_API_URL` and calls `/api/v1/auth/login`, `/api/v1/parent/children`, and `/api/v1/routes/:routeId/live-location`.

## Gaps / Next Steps

- Live notifications from backend services
- SSE-based alert delivery and notification history
- Multi-child/multi-school data from student management

## Mobile App

- `apps/parent-app/mobile` contains a Flutter scaffold only.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-3-DriverApp.md                        -->
<!-- ======================================================================== -->

# Module 3 - Driver App (Mobile)

- Last reviewed: 2026-03-30

## Status

Implemented with live gateway integration (Phase 2 complete).

## Source of Truth

- Current implementation: this document
- Upgrade deliverables: `docs/prd/UpgradePlan/Phase-2-DriverPresence.md`
- Phase plan: `docs/prd/PhaseWiseImplementationPlan.md`

## Location

- `apps/driver-app`

## Tech Stack

- React Native 0.81.5 + Expo ~54.0.29
- React 19.1.0
- Zustand 5.0.9 (state management)
- React Navigation 7.1.25 + Native Stack 7.8.6
- React Native Maps 1.26.20
- Expo Location 19.0.8, Expo Secure Store 15.0.8
- react-native-ble-plx 3.5.1 (BLE SmartTag scanning)
- Axios 1.13.2 (HTTP client)
- AsyncStorage 3.0.1 (offline queue persistence)
- Testing: Jest 29.7.0 + jest-expo 54.0.16
- TypeScript ~5.9.2
- Expo New Architecture enabled (`newArchEnabled: true`)

## Functionality

- Gateway login
- Schedule and route selection
- GPS tracking via `expo-location`; `vehicleId` sourced from route assignment (no hardcoded values)
- Route lifecycle recording: ROUTE_STARTED and ROUTE_COMPLETED events sent to backend via `route-lifecycle.service.ts`
- Roster fetched from `GET /driver/me/routes/:routeId/students` at route start (server-authoritative, not local-only)
- Manual presence event toggling with optimistic update + server confirmation; `pendingSync` / `serverConfirmed` visual indicators in RosterScreen
- BLE/SmartTag scanning via `ble.service.ts`: deduplication (5 s window), batching (50 detections / 10 s), battery-safe stop-on-unmount; detections forwarded to `POST /presence-events`
- Panic button posting to emergency endpoint
- Offline queueing for GPS, emergency, presence, and lifecycle submissions

## Integration Notes

- Base URL is configured via `EXPO_PUBLIC_API_URL`.
- GPS and emergency posts use gateway endpoints.
- Presence events (both manual toggles and BLE detections) use gateway `POST /student-presence-events` and `POST /presence-events` respectively.
- Route lifecycle events use gateway `POST /routes/lifecycle-events`.
- Roster is fetched from `GET /driver/me/routes/:routeId/students`; `schoolId` is always sourced from the authenticated JWT, never from the client payload.
- BLE permissions: iOS requires `NSBluetoothAlwaysUsageDescription`; Android requires `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`.

## Services

| Service                 | File                                  | Role                                                     |
| ----------------------- | ------------------------------------- | -------------------------------------------------------- |
| `ApiService`            | `services/api.service.ts`             | HTTP client with auth token injection                    |
| `AuthService`           | `services/auth.service.ts`            | Login, token storage, profile                            |
| `GpsService`            | `services/gps.service.ts`             | Expo Location wrapper, tracking loop                     |
| `PresenceService`       | `services/presence.service.ts`        | Manual presence events + BLE batch upload + roster fetch |
| `RosterService`         | `services/roster.service.ts`          | Fetches route student roster from gateway                |
| `RouteLifecycleService` | `services/route-lifecycle.service.ts` | Records ROUTE_STARTED / ROUTE_COMPLETED                  |
| `BleService`            | `services/ble.service.ts`             | BLE SmartTag scanning state machine                      |
| `OfflineQueueService`   | `services/offline-queue.service.ts`   | Durable offline buffer                                   |

## Gaps / Next Steps

- None for Phase 2 scope. Remaining roadmap items captured in `docs/prd/PhaseWiseImplementationPlan.md`.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-4-EmergencyAlerts.md                  -->
<!-- ======================================================================== -->

# Module 4 - Emergency Alerts Service

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

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-5-VideoService.md                     -->
<!-- ======================================================================== -->

# Module 5 - Video Capture Service

- Last reviewed: 2026-03-30

## Status

Implemented and tested (per status report).

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 4 and 5

## Location

- `services/video-service`

## Runtime

- **Port**: 3005 (docker-compose and code default)
- **Docker HEALTHCHECK**: Configured (only service with Docker-level health check)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- MinIO v8.0.2 / local storage
- Socket.IO v4.8.1 WebSockets
- Multer v1.4.5-lts.1 (file uploads)
- uuid v11.0.5

> **Note**: This service does **not** use BullMQ, unlike emergency-alerts and student-presence. Video event workflows are synchronous.

## APIs

- `POST /api/v1/video-events`
- `POST /api/v1/video-events/:id/complete`
- `POST /api/v1/video-events/:id/failed`
- `GET /api/v1/video-events`
- `GET /api/v1/video-events/:id`

## Data Model

- `video_events`, `video_access_logs`

## Integration Notes

- API gateway proxies video endpoints.
- Admin dashboard lists video events via gateway APIs.

## Gaps / Next Steps

- Real playback wiring in admin UI
- Tenant-aware access controls are enforced by `school_id`
- Retention policy enforcement

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-6-StudentPresence.md                  -->
<!-- ======================================================================== -->

# Module 6 - Student Presence Detection

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 1 and 2

## Location

- `services/student-presence`

## Runtime

- **Port**: 3004 (docker-compose); code default fallback is 3003 — always set `PORT=3004` via environment
- **Dockerfile EXPOSE**: 3003 (should be corrected to 3004)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- Redis caching (ioredis v5.4.2) + BullMQ v5.66.0
- Socket.IO v4.8.1 WebSockets

## APIs

- `POST /api/v1/presence-events` (BLE detections)
- `POST /api/v1/student-presence-events/manual`
- `GET /api/v1/routes/:routeId/students`
- `POST /api/v1/student-tags`

## Data Model

- `presence_events`, `student_tags`

## Integration Notes

- API gateway proxies manual presence events and route presence.
- Driver app roster is local-only; no presence API wiring.

## Gaps / Next Steps

- Fix Dockerfile `EXPOSE 3003` → `EXPOSE 3004` to match docker-compose port
- Parent notifications
- Driver app BLE integration
- Driver roster flow still needs authoritative API wiring.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-7-AdminDashboard.md                   -->
<!-- ======================================================================== -->

# Module 7 - Admin Dashboard

- Last reviewed: 2026-03-30

## Status

Implemented with live gateway integration.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 3 and 4

## Location

- `apps/admin-dashboard`

## Runtime

- **Port**: 5173 (dev Vite), 80 (production Nginx)
- **docker-compose**: Maps 5173→80

## Tech Stack

- React 19.0.0 + Vite 6.3.1
- TailwindCSS 3.4.17
- Leaflet 1.9.4 + React Leaflet 5.0.0 (maps)
- Recharts 2.15.3 (charts)
- Axios 1.13.2 (HTTP client)
- Socket.IO Client 4.8.3 (real-time alerts and presence updates)
- Lucide React (icons)
- Testing: Vitest 4.1.1 + React Testing Library 16.3.0

## Functionality

- Login screen and auth context
- Dashboard, alerts, routes, students, videos pages
- Gateway-backed data with token persistence

## Integration Notes

- Uses `VITE_API_URL` and calls `/api/v1/*` endpoints.
- Presence views aggregate by route using gateway presence data.

## Gaps / Next Steps

- Multi-tenant admin views (board/school scopes)
- Organization management UI
- Route optimization is still backed by placeholder provider output.

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-8-ApiGateway.md                       -->
<!-- ======================================================================== -->

# Module 8 - API Gateway

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 4 and 5

## Location

- `services/api-gateway`

## Runtime

- **Port**: 3001 (default and docker-compose)
- **NODE_ENV**: `production` in docker-compose (other services use `development`)

## Tech Stack

- NestJS **v10.4.15** + TypeORM **v10.0.2** + PostgreSQL
- JWT auth (`@nestjs/jwt` v10.2.0) + Passport (`@nestjs/passport` v10.0.3) + RBAC
- Throttling (`@nestjs/throttler` v6.3.0), structured logging (`LoggingInterceptor`), error filters (`HttpExceptionFilter`)
- Axios for downstream service proxying

> **Note**: This service uses NestJS **v10**, while all other NestJS services have been upgraded to **v11.0.1**. Upgrading api-gateway to v11 is a known gap.

## APIs

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Organization

- `GET /api/v1/boards`, `POST /api/v1/boards`
- `GET /api/v1/schools`, `POST /api/v1/schools`

### Fleet

- `GET /api/v1/vehicles`, `POST /api/v1/vehicles`, `PATCH /api/v1/vehicles/:id`, `DELETE /api/v1/vehicles/:id`

### Routes

- `GET /api/v1/routes`, `POST /api/v1/routes`, `PATCH /api/v1/routes/:id`, `DELETE /api/v1/routes/:id`
- `POST /api/v1/routes/optimize` (mock optimization)

### Proxies

- GPS: live-location, history, ingest (`POST /routes/locations`)
- Alerts: active list, detail, create
- Presence: route students, manual events
- Video: list, detail, create
- Students: list, detail, enroll, assignment, bulk import
- Compliance: inspections, compliance, audit
- Parent: child list
- Driver: schedule

## Data Model

- `school_boards`, `schools`, `users`, `routes`, `route_stops`, `vehicles`

## Multi-Tenant Notes

- Guards enforce `boardId` and `schoolId` on gateway endpoints.
- Downstream services enforce `school_id` tenant isolation.

## Gaps / Next Steps

- Upgrade NestJS from v10 to v11 – version mismatch with other services
- Organization management UI (board/school admin)
- Map provider integration for route optimization
- Service-to-service trust and deeper tenant hardening remain future work.
- NODE_ENV inconsistency: api-gateway runs `production` in docker-compose while all other services run `development`

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-9-StudentManagement.md                -->
<!-- ======================================================================== -->

# Module 9 - Student Management Service

- Last reviewed: 2026-03-30

## Status

Implemented and running in Docker Compose.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/GapAnalysis.md`
- Planned delivery phases: `docs/prd/PhaseWiseImplementationPlan.md` Phases 2 and 4

## Location

- `services/student-management`

## Runtime

- **Port**: 3006 (docker-compose and code default)

## Tech Stack

- NestJS v11.0.1 + TypeORM v11.0.0 + PostgreSQL
- csv-parser v3.0.0 (bulk student import)

## APIs

- `POST /students`
- `GET /students` (filters: `school_id`, `route_id`, `parent_id`)
- `GET /students/:id`
- `PATCH /students/:id`
- `DELETE /students/:id`
- `PATCH /students/:id/assignment`
- `POST /students/bulk-import`

## Data Model

- `students` with `school_id`, route and stop references

## Integration Notes

- Proxied through API gateway (`/api/v1/students`).
- Gateway injects `school_id` and enforces tenant scope.

## Gaps / Next Steps

- Parent/driver integration for roster and presence display
- Invitation-aware onboarding and lifecycle integration

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-10-ComplianceManagement.md            -->
<!-- ======================================================================== -->

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

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Implementation/Module-11-NotificationService.md             -->
<!-- ======================================================================== -->

# Module 11 - Notification Service

- Last reviewed: 2026-04-03

## Status

Implemented as part of Phase A (Parent Safety Communication). Channel adapters run in dry-run mode until production provider credentials are configured.

## Source of Truth

- Current implementation: this document
- Upgrade gaps: `docs/prd/v4/GapAnalysis.md` (GAP-ALERT-002, GAP-ALERT-004, GAP-ALERT-005, GAP-ROLE-006)
- Planned delivery phase: `docs/prd/v4/UpgradePlan.md` Phase A

## Location

- `services/notification-service`

## Runtime

- **Port**: 3008
- **Health check**: `GET /health`
- **BullMQ queue**: `notifications` (concurrency 5, 3 retries, exponential backoff 1s)

## Tech Stack

- NestJS v11 + TypeORM + PostgreSQL
- `@nestjs/bullmq` + Redis (BullMQ job processing)
- `firebase-admin` (FCM push notifications)
- `nodemailer` (SMTP email)
- `twilio` (SMS delivery)
- `nestjs-pino` (structured logging)
- `@sbtm/common` (shared auth guards, tracing)

## Architecture

The Notification Service consumes `notification-request` jobs from the BullMQ `notifications` queue. Jobs are published by:

- **Student Presence Service**: on BOARD/ALIGHT events
- **Emergency Alerts Service**: on EMERGENCY events

### Processing Flow

1. `NotificationProcessor` receives job, validates required fields
2. `NotificationRouterService` determines enabled channels from `PreferencesService`
3. For each enabled channel, the router:
   - **PUSH**: Fetches device tokens -> `FcmAdapter.send()` -> deactivates invalid tokens
   - **EMAIL**: Fetches user email from DB -> `EmailAdapter.send()`
   - **SMS**: Fetches user phone from DB -> `SmsAdapter.send()`
4. Each delivery attempt is logged in `notification_delivery_log`
5. For EMERGENCY: if PUSH fails and SMS not already attempted, auto-escalates to SMS

### Privacy

- Only entity IDs are stored in BullMQ job payloads
- Contact info (email, phone, FCM tokens) is fetched from DB at processing time
- No PII is cached in Redis or logged

## Database Tables

| Table                       | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `device_tokens`             | FCM registration tokens per user/device. UNIQUE(userId, token)         |
| `notification_preferences`  | Parent opt-in/out per event type and channel. EMERGENCY always enabled |
| `notification_delivery_log` | Unified delivery audit trail with status tracking                      |

## API Endpoints

All endpoints are guarded by `InternalServiceAuthGuard` and proxied through the API Gateway with `@Roles(Role.PARENT)`.

| Method | Path                               | Description                                       |
| ------ | ---------------------------------- | ------------------------------------------------- |
| GET    | `/api/v1/notification-preferences` | Get user's notification preferences               |
| PUT    | `/api/v1/notification-preferences` | Update preferences (EMERGENCY cannot be disabled) |
| POST   | `/api/v1/device-tokens`            | Register a device token                           |
| DELETE | `/api/v1/device-tokens/:id`        | Deactivate a device token                         |
| GET    | `/api/v1/device-tokens`            | List user's device tokens                         |
| GET    | `/api/v1/delivery-log`             | Query delivery log for user                       |

## Configuration

| Environment Variable                                              | Purpose                               | Default |
| ----------------------------------------------------------------- | ------------------------------------- | ------- |
| `PORT`                                                            | Service port                          | 3008    |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL connection                 | -       |
| `REDIS_HOST`, `REDIS_PORT`                                        | Redis/BullMQ connection               | -       |
| `FCM_DRY_RUN`                                                     | Skip actual FCM sends                 | `true`  |
| `FCM_SERVICE_ACCOUNT_PATH`                                        | Path to Firebase service account JSON | -       |
| `EMAIL_DRY_RUN`                                                   | Skip actual email sends               | `true`  |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`   | SMTP configuration                    | -       |
| `SMS_DRY_RUN`                                                     | Skip actual SMS sends                 | `true`  |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`   | Twilio configuration                  | -       |

## Test Coverage

30 unit tests across 8 spec files:

- `tokens.service.spec.ts` (5 tests)
- `preferences.service.spec.ts` (6 tests)
- `delivery-log.service.spec.ts` (3 tests)
- `fcm.adapter.spec.ts` (2 tests)
- `email.adapter.spec.ts` (1 test)
- `sms.adapter.spec.ts` (1 test)
- `notification.processor.spec.ts` (4 tests)
- `notification-router.service.spec.ts` (8 tests)

## Modified Upstream Services

### Student Presence Service

- `presence.processor.ts`: Publishes `notification-request` jobs to `notifications` queue after persisting presence events
- Status changed from `SENT` to `PENDING` (delivery now handled by notification-service)

### Emergency Alerts Service

- `alerts.processor.ts`: For each parent on a route, publishes `notification-request` job with `eventType='EMERGENCY'`
- Status changed from `SENT` to `PENDING`

### API Gateway

- New `NotificationSettingsController` proxies preference and device token endpoints to notification-service
- New `NotificationSettingsGatewayService` handles HTTP calls to notification-service

### Parent App (Web)

- Settings page: Notification preference toggles (BOARD/ALIGHT toggleable, EMERGENCY locked)
- API client: `getNotificationPreferences()`, `updateNotificationPreferences()`, `registerDeviceToken()`
- Layout: Settings nav link in desktop and mobile menus
