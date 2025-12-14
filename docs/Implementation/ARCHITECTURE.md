## 1. `ARCHITECTURE.md` — System architecture (prototype + enterprise)

### 1.1 Overview

The system is a cloud‑hosted, modular School Bus Transport Management Platform with:

- **Client apps:**  
  - Driver mobile app (prototype: smartphone)  
  - Parent web/app  
  - Admin dashboard (web)
- **Backend services:**  
  - API gateway  
  - Tracking service (GPS + geo‑fence)  
  - Video service  
  - Student presence service  
  - Notification service  
  - Auth & user management  
- **Data stores:**  
  - Primary relational DB (PostgreSQL recommended)  
  - Object storage for video/media (S3‑compatible)  
  - Time‑series or log storage (optional, e.g., OpenSearch)

All services communicate via REST/JSON initially; later can be extended with async messaging (e.g., Kafka/Event Bus) for enterprise scale.

---

### 1.2 Prototype architecture

**Key decisions:**

- Use **smartphones** (driver device) for:
  - GPS tracking  
  - Basic video capture  
  - Panic button  
- Use **consumer dashcams** where needed (local SD storage, manual retrieval or limited cloud sync).
- Use **Apple/Samsung tags** for student presence in experimental fashion (not safety‑critical; treated as “nice‑to‑have” prototype only).

**Components:**

- **Driver App (mobile)**  
  - Sends GPS updates to `Tracking API`.  
  - Can start/stop route, trigger panic, optionally record video.  

- **Parent App/Web**  
  - Subscribes to bus positions via backend APIs.  
  - Shows live map + receives notifications.

- **Admin Dashboard**  
  - Monitors buses, routes, alerts, incidents.  

- **Backend Services (monolith or small set of services in prototype):**  
  - `Auth Service` (JWT, OAuth2 later).  
  - `Tracking Service`: stores GPS tracks, calculates ETA, detects route deviation.  
  - `Student Service`: manages students, tags, presence logs.  
  - `Video Service`: stores metadata and links to media.  
  - `Notification Service`: push/email/SMS.  

Deployment:  
- Cloud: single region (e.g., Azure/AWS/GC) with Canadian data residency.  
- Simple deployment via Docker + a managed PaaS (App Service / ECS / Cloud Run).

---

### 1.3 Enterprise architecture

Incremental transformation from prototype:

- **Replace smartphones for GPS with telematics units**:
  - Dedicated vehicle GPS, CAN bus data, driver hours, etc.
- **Replace ad‑hoc dashcams with multi‑camera HD systems**:
  - Interior + exterior cameras, DVR, cloud upload.
- **Split backend into clear microservices**:
  - Tracking, Routing, Notifications, Video, Student Management, Compliance, Reporting.
- **Introduce event bus / message broker**:
  - For scalable handling of events (GPS points, panic events, video triggers).

Non‑functional targets (enterprise):

- **Availability:** ≥ 99.9%  
- **Latency:**  
  - GPS ingest ≤ 1 second end‑to‑end  
  - Notifications ≤ 5 seconds after event  
- **Scalability:**  
  - Able to support thousands of buses, tens of thousands of concurrent parent sessions.  
- **Security:**  
  - End‑to‑end TLS  
  - RBAC, audit logs  
  - Compliance with Canadian privacy laws (PIPEDA) and Ontario school board policies.

---

### 1.4 Cross‑cutting concerns & best practices

- **Security:**  
  - HTTPS everywhere, no plain HTTP.  
  - JWT‑based auth for APIs, short‑lived access tokens.  
  - Least privilege access to DBs and buckets.  
  - Encrypt data at rest (KMS‑managed keys).

- **Privacy & legal (Canada/Ontario focus):**  
  - Treat all student data as sensitive.  
  - Minimize personal data (only what’s strictly needed).  
  - Data residency in Canadian regions.  
  - Clear data retention policies (e.g., location/history 90 days, video 30–90 days max).  
  - Log access to video and student records (audit trail).  
  - Provide mechanisms for data subject access requests (DSARs) and parental consent tracking.

- **Observability:**  
  - Structured logging (JSON).  
  - Centralized log collection.  
  - Basic metrics (request rate, error rate, GPS ingest lag, notification latency).  
  - Health checks and readiness endpoints.

- **Code quality:**  
  - Clean architecture (domain logic separated from controllers).  
  - Automated tests: unit, integration, end‑to‑end where feasible.  
  - Static analysis, linting, formatting enforced via CI.

---

## 2. `API_DESIGN.md` — API design for GPS, video, and student tracking

Use REST/JSON, versioned (`/api/v1/...`), with consistent conventions.

### 2.1 Authentication & common headers

- **Auth:** Bearer JWT in `Authorization` header.  
- **Content type:** `application/json`.  
- **Error format:**

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Route not found",
    "details": {}
  }
}
```

---

### 2.2 GPS / tracking APIs

#### 2.2.1 POST `/api/v1/locations`

**Purpose:** Driver app sends location updates.

**Request:**

```json
{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "driverId": "driver-789",
  "timestamp": "2025-01-10T14:23:45Z",
  "lat": 45.4215,
  "lng": -75.6972,
  "speedKph": 35,
  "headingDeg": 180,
  "accuracyMeters": 8
}
```

**Response:**

```json
{ "status": "ok" }
```

---

#### 2.2.2 GET `/api/v1/routes/{routeId}/live-location`

**Purpose:** Parent/admin gets current bus position.

**Response:**

```json
{
  "routeId": "route-456",
  "vehicleId": "bus-123",
  "lastUpdate": "2025-01-10T14:24:05Z",
  "position": { "lat": 45.4215, "lng": -75.6972 },
  "etaToNextStopMinutes": 3
}
```

---

#### 2.2.3 GET `/api/v1/routes/{routeId}/history`

Query parameters: `from`, `to`, `granularity` (e.g., `raw | 1min`).

---

### 2.3 Video APIs

Prototype: we store **metadata** + URLs to media; actual upload may be via pre‑signed URLs.

#### 2.3.1 POST `/api/v1/video-events`

**Purpose:** Register that a video clip exists for an event (panic, incident, deviation).

**Request:**

```json
{
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "eventType": "PANIC_BUTTON",
  "timestamp": "2025-01-10T14:25:10Z",
  "durationSeconds": 20,
  "videoUrl": "https://storage.example.com/video/clip123.mp4",
  "thumbnailUrl": "https://storage.example.com/thumb/clip123.jpg"
}
```

**Response:**

```json
{ "videoEventId": "vid-001" }
```

---

#### 2.3.2 GET `/api/v1/video-events/{videoEventId}`

Returns metadata and secure video URL (possibly time‑limited pre‑signed URL).

---

### 2.4 Student tracking APIs (tags / presence)

Prototype: SmartTags or future RFID will be modeled similarly.

#### 2.4.1 POST `/api/v1/student-presence-events`

**Purpose:** Log that a student is near/on the bus.

**Request:**

```json
{
  "studentId": "stud-123",
  "vehicleId": "bus-123",
  "routeId": "route-456",
  "eventType": "BOARD",
  "timestamp": "2025-01-10T14:10:00Z",
  "source": "SMART_TAG",
  "signalStrength": -60
}
```

**Response:**

```json
{ "presenceEventId": "pres-001" }
```

---

#### 2.4.2 GET `/api/v1/routes/{routeId}/students`

Returns current student presence status for a route.

---

### 2.5 Notifications APIs

#### 2.5.1 POST `/api/v1/notifications`

```json
{
  "recipientType": "PARENT",
  "recipientId": "parent-123",
  "channel": "PUSH",
  "title": "Bus approaching",
  "body": "Bus 123 is 3 minutes away",
  "metadata": {
    "routeId": "route-456",
    "vehicleId": "bus-123"
  }
}
```

---

### 2.6 API best practices

- Version all APIs (`/v1`, `/v2` etc.).  
- Use idempotent methods appropriately (e.g., `PUT` for updates).  
- Validate all inputs; never trust client.  
- Paginate list endpoints; limit page size.  
- Include correlation IDs in headers for traceability.

---

## 3. `DATABASE_SCHEMA.md` — Database schema

Assume PostgreSQL as primary relational DB.

### 3.1 Core tables

#### `users`
- `id` (PK, UUID)  
- `email` (unique)  
- `password_hash`  
- `role` (`ADMIN | DRIVER | PARENT`)  
- `created_at`, `updated_at`

#### `students`
- `id` (PK, UUID)  
- `first_name`, `last_name`  
- `school_id`  
- `grade`  
- `primary_guardian_user_id` (FK → users.id)  
- `created_at`, `updated_at`

#### `vehicles`
- `id` (PK, UUID)  
- `external_id` (e.g., “bus-123”)  
- `license_plate`  
- `capacity`  
- `status` (`ACTIVE | INACTIVE`)  
- `created_at`, `updated_at`

#### `routes`
- `id` (PK, UUID)  
- `name`  
- `school_id`  
- `start_time`, `end_time`  
- `direction` (`AM | PM`)  
- `created_at`, `updated_at`

#### `route_stops`
- `id` (PK, UUID)  
- `route_id` (FK → routes.id)  
- `sequence` (int)  
- `name`  
- `lat`, `lng`  
- `planned_arrival_time`  
- `created_at`, `updated_at`

#### `route_assignments`
- `id` (PK, UUID)  
- `route_id` (FK → routes.id)  
- `vehicle_id` (FK → vehicles.id)  
- `driver_user_id` (FK → users.id)  
- `valid_from`, `valid_to`

---

### 3.2 Tracking and events

#### `location_points`
- `id` (PK, UUID)  
- `vehicle_id` (FK)  
- `route_id` (FK)  
- `timestamp` (indexed)  
- `lat`, `lng`  
- `speed_kph`  
- `heading_deg`  
- `accuracy_meters`  

Partitioning or TTL may be considered at scale.

---

#### `student_presence_events`
- `id` (PK, UUID)  
- `student_id` (FK)  
- `vehicle_id` (FK)  
- `route_id` (FK)  
- `event_type` (`BOARD | ALIGHT`)  
- `timestamp`  
- `source` (`SMART_TAG | MANUAL`)  
- `signal_strength` (nullable)

---

#### `video_events`
- `id` (PK, UUID)  
- `vehicle_id` (FK)  
- `route_id` (FK)  
- `event_type` (`PANIC_BUTTON | INCIDENT | DEVIATION`)  
- `timestamp`  
- `duration_seconds`  
- `video_url`  
- `thumbnail_url`  
- `created_by_user_id` (nullable)

---

#### `notifications`
- `id` (PK, UUID)  
- `recipient_user_id` (FK)  
- `channel` (`PUSH | EMAIL | SMS`)  
- `title`  
- `body`  
- `metadata` (JSONB)  
- `status` (`QUEUED | SENT | FAILED`)  
- `created_at`, `sent_at`

---

### 3.3 Audit & legal requirements

- **Audit table** `audit_logs`:
  - `id` (PK)  
  - `user_id`  
  - `action` (e.g., `VIEW_VIDEO`, `EXPORT_DATA`)  
  - `resource_type`, `resource_id`  
  - `timestamp`  
  - `ip_address`, `user_agent`

Legal best practices:

- Keep audit logs for a defined legal period (e.g. ≥ 1 year).  
- Apply retention policies for location and video data.  
- Use DB roles and views to restrict access for privacy.

---

## 4. `UI_WIREFRAMES.md` — User interface wireframes (text‑based)

These are conceptual wireframes described textually so developers can turn them into Figma or code.

### 4.1 Driver app — main screens

#### Screen: Login

- Fields:  
  - **Username / email**  
  - **Password**  
- Button: `Log in`  
- Link: “Forgot password”  
- On success → `Route Selection`

---

#### Screen: Route Selection

- Header: “Select Today’s Route”  
- List of cards:

  - Card: `Route 123 – AM • School: XYZ`  
    - Button: `Start Route`

- Bottom bar:  
  - Settings icon  
  - Log out button

---

#### Screen: Active Route

- Top:  
  - Route name  
  - Status pill: `IN PROGRESS`  
- Map: center on bus location with route overlay.  
- Panel below map:  
  - Next Stop: `Stop Name • ETA 3 min`  
  - Speed, time, connection status (online/offline).  
- Buttons:  
  - `Panic` (red, prominent)  
  - `View Roster`  
  - `End Route`

---

#### Screen: Student Roster

- List:

  - `Student Name A – Status: Not boarded`  
  - `Student Name B – Status: Boarded 07:42`

- Button (optional prototype): `Mark as boarded` / `Mark as alighted`.

---

### 4.2 Parent app/web — main screens

#### Screen: Home

- Card: `Child Name – Route 123 – Bus 45`  
- Button: `View Live Location`

#### Screen: Live Bus Map

- Map with bus icon.  
- Info panel:  
  - Bus ETA to next stop.  
  - Status: `ON TIME | DELAYED`.  
- Toggle: show/hide stops.  
- Notification preferences button.

---

### 4.3 Admin dashboard — main screens

#### Screen: Overview

- Map of all active buses.  
- Sidebar:  
  - `Active Routes`  
  - `Alerts` (panic, deviations)  
  - `Video Events`  

#### Screen: Route detail

- Timeline of location updates.  
- Student presence table.  
- Button: `View related videos`.

#### Screen: Alerts

- Table of alerts:  
  - Time, vehicle, route, type, status.  
- Filters: date range, alert type.  
- Click row → detail view with location, events, actions.

---

### UI best practices

- Accessible colors and fonts (WCAG 2.1 AA).  
- Clear hierarchy for safety‑critical actions (Panic, Alerts).  
- Localized strings (English/French).  
- Avoid exposing unnecessary personal data on shared screens.

---

## 5. `ROADMAP.md` — Development roadmap (MVP → Beta → Production)

### 5.1 Guiding principles

- Build **thin vertical slices**: each increment delivers real, testable value.  
- Keep prototype code structured so it can be hardened for production.  
- Separate “prototype shortcuts” clearly (e.g., comments `// PROTOTYPE ONLY`).

---

### 5.2 MVP (Prototype) — 0 to 3 months

**Key outcomes:**

- Show bus on a map in real time for a single test route.  
- Enable a driver to start a route, send GPS, and trigger panic.  
- Log student presence events (even manually or via simple tag detection).  
- Store video event metadata and link uploaded clips.

**Scope:**

- Basic backend (monolith) with:
  - Auth  
  - Tracking  
  - Student presence  
  - Video metadata  
  - Notifications (mock or limited real channels)
- Driver app:  
  - Login, route start/end, GPS push, panic button.
- Parent web:  
  - Login, view child’s route, live bus location.
- Admin web:  
  - View active routes and panic alerts.

**Non‑functional (MVP):**

- Best‑effort availability.  
- Minimal logging and metrics.  
- Basic security (HTTPS, hashed passwords, JWTs).  

---

### 5.3 Beta (Pilot with small group) — 3 to 9 months

**Key outcomes:**

- Test with a small number of real routes and families.  
- Collect feedback on UX, reliability, and safety workflows.

**Enhancements:**

- More robust error handling and retries.  
- Notification service integrated with real push providers.  
- Basic geo‑fence deviation detection.  
- Initial student presence automation using SmartTags / manual check‑in.  
- Admin tools for viewing history (location & presence).  
- Better observability (structured logs, basic dashboard).

**Legal & privacy:**

- Confirm policies with OSTA / school board (retention, consent).  
- Add audit logging for access to sensitive data.

---

### 5.4 Production (Scaling & hardening) — 9 to 24 months

**Key outcomes:**

- Ready for deployment at scale with multiple schools/routes.  
- Migration path to enterprise hardware.

**Enhancements:**

- Split monolith into well‑defined services where necessary.  
- Add enterprise integrations:
  - School SIS (attendance, rosters).  
  - Hardware telematics and video platforms.  
- Advanced features:
  - Predictive ETA improvements.  
  - More robust student boarding workflows.  
  - Multi‑tenant support (different boards, consortia).

**Non‑functional targets:**

- Availability ≥ 99.9%.  
- Performance: low latency for GPS processing and notifications.  
- Full audit and logging of access to student/video data.  
- Documented operational runbooks, incident management procedures.

---

### 5.5 Industry best practices to apply throughout

- **Security by design:** threat modeling for each major feature, secure coding practices.  
- **Privacy by design:** data minimization, purpose limitation, user consent.  
- **Testing pyramid:**  
  - Unit tests for core logic.  
  - Integration tests for APIs.  
  - E2E tests for key flows (start route → parent sees bus → panic → admin alert).  
- **Code review & CI:**  
  - All changes via PRs.  
  - Automated checks before merge.  
- **Documentation:**  
  - Keep these core guideline files up to date.  
  - Maintain API docs in OpenAPI/Swagger.  

---

If you tell me your preferred tech stack (e.g., Node/TypeScript + React + Postgres, or .NET, etc.), I can next generate:

- A project skeleton layout (`/backend`, `/frontend`, `/mobile`, etc.).  
- The first GitHub issue templates for a module (e.g., `GPS Tracking Service`) tailored for Developer / Reviewer / Tester agents.
