# SBTM v1 – Event Catalog

- Document owner: Engineering and Architecture
- Last reviewed: 2026-03-24
- Primary use: Domain event definitions for the event-aware integration model

This catalog defines the domain events in the SBTM v1 architecture. Each entry lists the event name, producer service, consumer services, trigger, and payload shape.

## Related Documents

- [Architecture.md](Architecture.md)
- [IntegrationArchitecture.md](IntegrationArchitecture.md)
- [TechnicalSpecifications.md](TechnicalSpecifications.md)
- [../../Business/Requirements.md](../../Business/Requirements.md)

---

## Naming Convention

`<aggregate>.<past-participle>`

Examples: `location.updated`, `alert.created`, `presence.boarded`

---

## Events

### `location.updated`

| Field | Value |
|---|---|
| **Producer** | GPS Tracking Service |
| **Consumers** | *(Phase 3: Geofencing / Deviation Alert Service)* |
| **Trigger** | A new GPS location point is ingested via `POST /api/v1/locations` |
| **Queue** | `gps` (BullMQ) |

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

### `alert.created`

| Field | Value |
|---|---|
| **Producer** | Emergency Alerts Service |
| **Consumers** | Notification Service |
| **Trigger** | A panic, route deviation, medical, or other emergency event is recorded |
| **Queue** | `alerts` (BullMQ) |

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

| Field | Value |
|---|---|
| **Producer** | Student Presence Service |
| **Consumers** | Notification Service |
| **Trigger** | A `BOARD` presence event is persisted (BLE scan or manual override) |
| **Queue** | `presence` (BullMQ) |

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

| Field | Value |
|---|---|
| **Producer** | Student Presence Service |
| **Consumers** | Notification Service |
| **Trigger** | An `ALIGHT` presence event is persisted (BLE timeout or manual override) |
| **Queue** | `presence` (BullMQ) |

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
```

All queues use:
- **Concurrency**: 5 workers per queue
- **Backoff**: exponential, starting at 1 s, max 30 s
- **Max retries**: 5
- **Job retention**: completed jobs kept for 1 h, failed jobs kept for 24 h
