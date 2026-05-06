# Dedicated GPS Tracker — Product Requirements Document

**Document Owner:** Product and Architecture
**Last Updated:** 2026-05-04
**Status:** Backlog — Approved for Implementation
**Scope:** System-wide configurable GPS tracking source with dedicated hardware device support

---

## Executive Summary

SBTM currently ingests vehicle GPS data exclusively through the driver's mobile application. While this works for most deployments, some school boards require a more reliable GPS signal that is independent of the driver's phone battery, connectivity, and app state. This feature introduces a **dedicated hardware GPS device** option: a cellular or Wi-Fi capable tracking unit installed permanently on the bus, which pushes position updates directly to SBTM via HTTP.

A new **system-wide toggle** allows the Super Admin to switch the GPS ingestion source between:

- **`DRIVER_APP`** — current behaviour; the driver's Expo mobile app submits GPS positions.
- **`DEDICATED_GPS`** — a hardware tracker installed on the bus submits GPS positions; driver app submissions are gracefully rejected.

The system supports exactly one active source at a time. There is no per-vehicle or per-route override; this keeps the operational model simple and eliminates split-brain edge cases.

---

## 1. Problem Statement

### 1.1 Limitations of Driver-App-Only GPS

| Issue              | Impact                                                               |
| ------------------ | -------------------------------------------------------------------- |
| Battery dependency | Driver's phone may die mid-route, losing all GPS tracking            |
| Connectivity gaps  | Drivers may close or background the app                              |
| Human error        | Driver may forget to start the route on the app                      |
| Device variability | GPS accuracy varies across driver phone models                       |
| Regulatory risk    | Some Ontario STAs require hardware-level GPS for compliance auditing |

### 1.2 Why System-Wide Only

A single system-wide switch is the correct design for this platform:

- **Simplicity** — operators do not need to configure each vehicle individually.
- **Consistency** — all routes behave the same way; support teams debug one flow.
- **Safety** — no ambiguity about which source is canonical during an emergency alert.
- **Rollout** — a school board deploying GPS hardware rolls it out fleet-wide simultaneously.

### 1.3 Why HTTP Ingestion (No MQTT/Vendor SDK)

Most commercial GPS hardware supports HTTP POST as a universal output method. Avoiding MQTT brokers eliminates an additional infrastructure dependency. Vendors that support MQTT can still use this endpoint via a lightweight protocol bridge. This keeps the SBTM dependency footprint minimal and the ingestion contract easy to test.

---

## 2. Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GPS Data Sources                         │
│                                                                  │
│  DRIVER_APP mode:  Driver Expo App ──► API Gateway ──► GPS Svc  │
│  DEDICATED_GPS mode: Hardware Tracker ──► GPS Svc (direct)      │
└─────────────────────────────────────────────────────────────────┘

GPS Service (gps-tracking):
  ┌─────────────────────────────────────┐
  │  POST /api/v1/locations             │  ← internal JWT (driver app path)
  │  POST /api/v1/device-locations      │  ← device Bearer token (hardware path)
  │  GET/PUT /api/v1/system-settings/   │  ← internal JWT (admin management)
  │  POST/GET/DELETE /api/v1/device-    │  ← internal JWT (token management)
  │           tokens                    │
  └─────────────────────────────────────┘

Admin Dashboard (SUPER_ADMIN only):
  /settings/gps-source
    ├─ GPS Source Toggle (DRIVER_APP / DEDICATED_GPS)
    └─ Device Token Management (create / list / revoke)
```

### 2.2 Normalization Layer

All GPS data — regardless of source — passes through the same `LocationService.ingestLocation()` pipeline:

1. Coordinate range validation (Zod schema)
2. OSRM road-snapping
3. Prisma write to `location_points`
4. Domain event publication (Redis → presence/alert services)
5. Geofence deviation check

The hardware device path populates `vehicleId`, `schoolId`, and `routeId` from its device token record plus a live route lookup — the device payload itself only contains GPS coordinates and a timestamp.

### 2.3 Active Route Resolution

When a dedicated GPS device posts a location:

1. Look up the device token → get `vehicleId` and `schoolId`.
2. Query `route_lifecycle_events` for the most recent event per route where `vehicle_id = $vehicleId` and `event_type != 'ROUTE_COMPLETED'`.
3. If an active route is found, use its `route_id` for ingestion.
4. If no active route exists, return `422 Unprocessable Entity` (bus is not on a route; ignoring position).

---

## 3. Data Model

### 3.1 `system_settings` Table

Stores singleton system-wide key/value configuration entries.

| Column       | Type        | Notes                                        |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | UUID        | Primary key                                  |
| `key`        | TEXT UNIQUE | e.g. `GPS_TRACKING_SOURCE`                   |
| `value`      | TEXT        | e.g. `DRIVER_APP` or `DEDICATED_GPS`         |
| `updated_at` | TIMESTAMPTZ | Auto-managed                                 |
| `updated_by` | TEXT NULL   | User ID of last Super Admin who changed this |

**Seed row:** `GPS_TRACKING_SOURCE = 'DRIVER_APP'` (safe default — preserves existing behaviour on first deploy).

### 3.2 `gps_device_tokens` Table

Stores pre-shared authentication tokens for dedicated GPS hardware units.

| Column         | Type             | Notes                                       |
| -------------- | ---------------- | ------------------------------------------- |
| `id`           | UUID             | Primary key                                 |
| `token`        | TEXT UNIQUE      | 64-char hex string (32 bytes CSPRNG)        |
| `vehicle_id`   | TEXT             | Which vehicle this hardware is installed on |
| `school_id`    | TEXT             | Tenant scoping for location writes          |
| `description`  | TEXT NULL        | e.g. "Bus 12 — front tracker"               |
| `is_active`    | BOOLEAN          | Soft-disable without deletion               |
| `created_at`   | TIMESTAMPTZ      | Creation timestamp                          |
| `last_seen_at` | TIMESTAMPTZ NULL | Updated on each successful auth             |

**Indexes:** `token` (unique lookup), `school_id` (list by tenant).

### 3.3 Caching

The `GPS_TRACKING_SOURCE` setting is cached in memory for **60 seconds** to avoid a database round-trip on every GPS ingest. The cache is invalidated immediately when the setting is updated via the API.

---

## 4. API Endpoints

### 4.1 GPS Service Internal Endpoints (requires internal service JWT)

| Method   | Path                                  | Description                                             |
| -------- | ------------------------------------- | ------------------------------------------------------- |
| `GET`    | `/api/v1/system-settings/gps-source`  | Returns `{ source: 'DRIVER_APP' \| 'DEDICATED_GPS' }`   |
| `PUT`    | `/api/v1/system-settings/gps-source`  | Body: `{ source, updatedBy }`. Updates the setting.     |
| `POST`   | `/api/v1/device-tokens`               | Creates a new device token. Returns token (shown once). |
| `GET`    | `/api/v1/device-tokens?schoolId=<id>` | Lists tokens for a school (value masked).               |
| `DELETE` | `/api/v1/device-tokens/:id`           | Hard-deletes a device token record.                     |

### 4.2 GPS Service Device Ingestion Endpoint (requires device Bearer token)

| Method | Path                       | Description                                  |
| ------ | -------------------------- | -------------------------------------------- |
| `POST` | `/api/v1/device-locations` | Hardware GPS unit submits a position update. |

**Request body:**

```json
{
  "timestamp": "2026-05-04T14:30:00.000Z",
  "lat": 43.65107,
  "lng": -79.347015,
  "speedKph": 45.2,
  "headingDeg": 270.0,
  "accuracyMeters": 3.5
}
```

`vehicleId` and `schoolId` are derived from the device token — **never from the request body**.

**Responses:**

- `200 OK` — location ingested successfully.
- `401 Unauthorized` — missing or invalid device token.
- `422 Unprocessable Entity` — GPS source is set to `DRIVER_APP` (device should retry after mode change), or no active route found for the vehicle.

### 4.3 API Gateway Endpoints (requires user JWT, SUPER_ADMIN role)

| Method   | Path                                            | Description                 |
| -------- | ----------------------------------------------- | --------------------------- |
| `GET`    | `/api/v1/system-settings/gps-source`            | Returns current GPS source. |
| `PUT`    | `/api/v1/system-settings/gps-source`            | Switches GPS source.        |
| `POST`   | `/api/v1/system-settings/gps-device-tokens`     | Creates device token.       |
| `GET`    | `/api/v1/system-settings/gps-device-tokens`     | Lists device tokens.        |
| `DELETE` | `/api/v1/system-settings/gps-device-tokens/:id` | Deletes device token.       |

### 4.4 Existing Driver App Endpoint Behaviour Change

`POST /api/v1/locations` (driver app path, internal JWT):

- **When `GPS_TRACKING_SOURCE = DRIVER_APP`:** behaves exactly as today.
- **When `GPS_TRACKING_SOURCE = DEDICATED_GPS`:** returns `422 Unprocessable Entity` with body `{ error: 'GPS tracking source is set to DEDICATED_GPS. Driver app location submissions are disabled.' }`.

---

## 5. Device Authentication

### 5.1 Token Format

Device tokens are 64-character hex strings generated from 32 bytes of cryptographically secure random data (`crypto.randomBytes(32).toString('hex')`). This provides 256 bits of entropy, exceeding OWASP recommendations for API tokens.

### 5.2 Authentication Flow

```
Hardware Device → POST /api/v1/device-locations
  Authorization: Bearer <64-char-hex-token>

GPS Service:
  1. Extract token from Authorization header
  2. Query gps_device_tokens WHERE token = $1 AND is_active = true
  3. If not found → 401
  4. Update last_seen_at = NOW()
  5. Use vehicleId and schoolId from the token record
  6. Proceed with GPS source check and location ingestion
```

### 5.3 Token Lifecycle

- Tokens are created by Super Admin via the Admin Dashboard.
- The raw token value is displayed **once** at creation time and cannot be retrieved again (only the masked suffix is shown in lists).
- Tokens can be soft-disabled (`is_active = false`) or hard-deleted.
- No expiry by default; Super Admin is responsible for rotation.

### 5.4 Security Considerations

| Concern              | Mitigation                                                                              |
| -------------------- | --------------------------------------------------------------------------------------- |
| Token interception   | HTTPS enforced at all boundaries                                                        |
| Token theft          | Revocation via is_active flag or hard-delete                                            |
| Replay attacks       | Acceptable risk for GPS telemetry — no financial or auth consequence                    |
| Brute force          | Tokens are 256-bit; brute force is computationally infeasible                           |
| Privilege escalation | Device token grants ONLY the ability to POST to /device-locations; no other permissions |
| PII exposure         | vehicleId and schoolId are T2 (internal); no student data in device token record        |

---

## 6. Admin UI Design

### 6.1 GPS Source Settings Page (`/settings/gps-source`)

Accessible to SUPER_ADMIN only.

**Section 1 — GPS Tracking Source**

- Badge showing current source: green `DRIVER_APP` or blue `DEDICATED_GPS`
- Radio button group to select source
- "Save" button — opens a confirmation modal before applying
- Confirmation modal explains impact:
  - Switching to `DEDICATED_GPS`: "Driver app GPS submissions will be rejected. Ensure hardware devices are installed and tokens are configured before switching."
  - Switching to `DRIVER_APP`: "Dedicated GPS hardware submissions will be rejected. Drivers must use the mobile app to submit locations."

**Section 2 — GPS Device Tokens**
Shown only when source is `DEDICATED_GPS` (or always, for visibility).

- Table columns: Description, Vehicle ID, School ID, Last Seen, Status, Actions
- Token value column: shows only last 8 characters for identification (e.g. `...a3f7b2c1`)
- "Create Token" button → inline form with fields: Vehicle ID, Description
- Token creation success: shows full token in a dismissible highlighted box with "Copy to clipboard" button and warning that it won't be shown again
- "Revoke" action: soft-disables token (is_active = false) → not yet implemented; delete for now
- "Delete" action: hard-deletes with confirmation

---

## 7. Implementation Phases

### Phase 1 — Backend (this document)

- [ ] Prisma schema additions (`system_settings`, `gps_device_tokens`)
- [ ] Migration SQL
- [ ] SystemSettingService with cache
- [ ] GpsDeviceTokenService
- [ ] GPS service controllers and routes
- [ ] GPS source enforcement in `ingestLocation`
- [ ] API gateway proxy service and controller
- [ ] Gateway module registration

### Phase 2 — Admin UI (this document)

- [ ] Admin dashboard API client
- [ ] `GpsSourceSettingsPage` React component
- [ ] App routing and navigation link

### Phase 3 — Future Enhancements

- [ ] Token expiry and rotation reminders
- [ ] Per-token rate limiting
- [ ] Device health monitoring (last_seen_at alerting)
- [ ] Multi-tracker support per vehicle (for redundancy)
- [ ] Audit log entries for source changes

---

## 8. Privacy and Compliance

| Data Element        | Classification       | Notes                       |
| ------------------- | -------------------- | --------------------------- |
| GPS source setting  | T1 (Public/Internal) | System config, no PII       |
| Device tokens       | T2 (Internal)        | Operational secrets; no PII |
| Vehicle ID in token | T2 (Internal)        | Vehicle metadata            |
| School ID in token  | T2 (Internal)        | Tenant identifier           |
| Last seen timestamp | T2 (Internal)        | Operational telemetry       |

No T4 (student PII) or T3 (guardian data) is introduced by this feature. The GPS location data written to `location_points` is pre-existing T3 data with no change in classification or retention.

**PIPEDA:** No new personal data collection. No consent impact.
**MFIPPA:** No change to record retention requirements.
**Audit trail:** Source changes are logged via `updated_by` field in `system_settings`.

---

## 9. Non-Functional Requirements

| Requirement                   | Target                                    |
| ----------------------------- | ----------------------------------------- |
| GPS source lookup latency     | < 1 ms (memory cache; DB fallback < 5 ms) |
| Device location ingestion P99 | < 200 ms end-to-end                       |
| Token validation              | < 10 ms (indexed unique lookup)           |
| Cache TTL                     | 60 seconds                                |
| Token entropy                 | 256 bits (CSPRNG)                         |

---

## 10. Related Documents

- `docs/Design/Architecture.md` — service architecture
- `docs/Design/SecurityPrivacyArchitecture.md` — authentication patterns
- `docs/sdlc_guidelines/01_security_compliance/data_classification.md` — data tier rules
- `services/gps-tracking/README.md` — GPS service documentation
