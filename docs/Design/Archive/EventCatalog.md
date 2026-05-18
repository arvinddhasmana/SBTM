# SBTM v1 – Event Catalog

> **⚠ Historical — v1 Era.** This catalog was written for the v1 event model (`EmergencyAlert`, `NotificationPreference`, etc.). For the current v2 alert event model see [Alerts.md](../Alerts.md).

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-30
- Primary use: Domain event definitions for the event-aware integration model

This catalog defines the domain events in the SBTM v1 architecture. Each entry lists the event name, producer service, consumer services, trigger, and payload shape.

## Related Documents

- [Architecture.md](Architecture.md)
- [IntegrationArchitecture.md](IntegrationArchitecture.md)
- [TechnicalSpecifications.md](TechnicalSpecifications.md)
- [../Business/Requirements.md](../Business/Requirements.md)

---

## Naming Convention

`<aggregate>.<past-participle>`

Examples: `location.updated`, `alert.created`, `presence.boarded`

---

## Events

### `location.updated`

| Field         | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| **Producer**  | GPS Tracking Service                                              |
| **Consumers** | Geofencing / Deviation Alert Service, Analytics (Phase 3)         |
| **Trigger**   | A new GPS location point is ingested via `POST /api/v1/locations` |
| **Queue**     | `gps` (BullMQ)                                                    |
| **Status**    | **Implemented — Phase 3**                                         |

**Payload**:

```json
{
  "vehicleId": "uuid",
  "routeId": "uuid",
  "schoolId": "uuid",
  "lat": 43.6532,
  "lng": -79.3832,
  "speedKph": 40.2,
  "headingDeg": 270,
  "accuracyMeters": 5
}
```

---

### `route.deviation`

| Field         | Value                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| **Producer**  | GPS Tracking Service (GeofenceService)                                                |
| **Consumers** | Emergency Alerts Service, Notification Service (Phase 3+)                             |
| **Trigger**   | Vehicle position exceeds configured `deviationThresholdMeters` for its route geofence |
| **Queue**     | `gps` (BullMQ)                                                                        |
| **Status**    | **Implemented — Phase 3**                                                             |

**Payload**:

```json
{
  "vehicleId": "uuid",
  "routeId": "uuid",
  "schoolId": "uuid",
  "lat": 43.71,
  "lng": -79.5,
  "deviationMeters": 450.0,
  "threshold": 300.0,
  "timestamp": "2026-03-25T08:30:00Z"
}
```

**Downstream actions** (planned):

- Emergency Alerts Service creates a ROUTE_DEVIATION alert.
- Notification Service notifies school admin of operational deviation.

---

### `alert.created`

| Field         | Value                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| **Producer**  | Emergency Alerts Service                                                |
| **Consumers** | Notification Service                                                    |
| **Trigger**   | A panic, route deviation, medical, or other emergency event is recorded |
| **Queue**     | `alerts` (BullMQ)                                                       |

**Payload**:

```json
{
  "alertId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "schoolId": "uuid",
  "eventType": "PANIC_BUTTON",
  "location": { "lat": 43.6532, "lng": -79.3832 },
  "driverId": "uuid"
}
```

**Downstream actions**:

- Notification Service sends push notification to all parents on the route.
- Admin Dashboard WebSocket broadcast (via `WebsocketGateway`).

---

### `presence.boarded`

| Field         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| **Producer**  | Student Presence Service                                            |
| **Consumers** | Notification Service                                                |
| **Trigger**   | A `BOARD` presence event is persisted (BLE scan or manual override) |
| **Queue**     | `presence` (BullMQ)                                                 |

**Payload**:

```json
{
  "studentId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "schoolId": "uuid",
  "source": "MANUAL",
  "timestamp": "2024-09-03T07:45:00Z"
}
```

**Downstream actions**:

- Notification Service sends "Your child has boarded the bus" push to parent.

---

### `presence.alighted`

| Field         | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| **Producer**  | Student Presence Service                                                 |
| **Consumers** | Notification Service                                                     |
| **Trigger**   | An `ALIGHT` presence event is persisted (BLE timeout or manual override) |
| **Queue**     | `presence` (BullMQ)                                                      |

**Payload**:

```json
{
  "studentId": "uuid",
  "vehicleId": "uuid",
  "routeId": "uuid",
  "schoolId": "uuid",
  "source": "SMARTTAG",
  "timestamp": "2024-09-03T08:10:00Z"
}
```

**Downstream actions**:

- Notification Service sends "Your child has alighted the bus" push to parent.

---

## Event Bus Topology (BullMQ)

```
Producer            Queue Name      Consumer
─────────────────────────────────────────────────────
GPS Tracking        gps             (Phase 3: Geofencing)
Emergency Alerts    alerts          Notification Service
Student Presence    presence        Notification Service
Presence/Alerts     notifications   Notification Service
```

All queues use:

- **Concurrency**: 5 workers per queue
- **Backoff**: exponential, starting at 1 s, max 30 s
- **Max retries**: 5
- **Job retention**: completed jobs kept for 1 h, failed jobs kept for 24 h

---

### `notification.requested`

| Field         | Value                                              |
| ------------- | -------------------------------------------------- |
| **Producer**  | Student Presence Service, Emergency Alerts Service |
| **Consumers** | Notification Service                               |
| **Trigger**   | A presence or alert event requires parent delivery |
| **Queue**     | `notifications` (BullMQ)                           |
| **Status**    | **Implemented — Phase A**                          |

**Payload**:

```json
{
  "eventType": "BOARD | ALIGHT | EMERGENCY",
  "eventSourceId": "uuid",
  "recipientUserId": "uuid",
  "schoolId": "uuid",
  "routeId": "uuid",
  "studentId": "uuid",
  "emergencyType": "PANIC_BUTTON (optional, EMERGENCY only)"
}
```

**Downstream actions**:

- Notification Service checks parent preferences and delivers via enabled channels (push, email, SMS).
- EMERGENCY events bypass preferences and deliver on all channels with SMS escalation on push failure.
- Delivery status logged in `notification_delivery_log`.
