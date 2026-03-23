# SBTM v1 – Event-Driven Architecture

## 1. Overview

The v1 architecture evolves the current request/response model into an **event-driven** platform. Core business operations (GPS tracking, student presence, emergency alerts, notifications) become first-class domain events that flow through a central event bus. Services produce and consume events asynchronously, which decouples producers from consumers and enables real-time notification pipelines without tight coupling.

### Design Principles
- **Event-First**: State changes are expressed as immutable domain events.
- **Eventual Consistency**: Consumers process events asynchronously; the system remains responsive under load.
- **Resilience**: Clients queue events locally when offline and flush on reconnect.
- **Multi-Tenant by Default**: Every event carries `schoolId` (and optionally `boardId`) for tenant isolation.

---

## 2. C4 Context Diagram

```mermaid
C4Context
    title System Context – SBTM v1

    Person(parent, "Parent", "Tracks child's bus, receives alerts")
    Person(driver, "Driver", "Operates bus, records events")
    Person(admin, "Admin / Dispatcher", "Monitors fleet, manages routes")

    System(sbtm, "SBTM Platform", "Event-driven school bus transport management")

    System_Ext(fcm, "FCM / APNs", "Push notification delivery")
    System_Ext(maps, "Map Provider", "Geocoding & routing (future)")

    Rel(driver, sbtm, "Sends GPS, presence, panic events", "HTTPS / WebSocket")
    Rel(parent, sbtm, "Views live location, receives alerts", "HTTPS / SSE")
    Rel(admin, sbtm, "Manages fleet, views dashboards", "HTTPS / WebSocket")
    Rel(sbtm, fcm, "Delivers push notifications", "HTTPS")
    Rel(sbtm, maps, "Route optimisation (planned)", "HTTPS")
```

---

## 3. C4 Container Diagram

```mermaid
C4Container
    title Container Diagram – SBTM v1

    Person(driver, "Driver App", "Expo / React Native")
    Person(parent, "Parent App", "Vite / React")
    Person(admin, "Admin Dashboard", "Vite / React")

    Container(gateway, "API Gateway", "NestJS", "Auth (JWT/RBAC), multi-tenant guards, reverse proxy")
    Container(eventbus, "Event Bus", "BullMQ + Redis", "Domain event routing and durable queuing")

    Container(gps, "GPS Tracking Service", "Express / TypeScript", "Ingests location points, serves live/history")
    Container(alerts, "Emergency Alerts Service", "NestJS", "Creates alerts, notifies admins & parents")
    Container(presence, "Student Presence Service", "NestJS", "Processes BLE / manual boarding events")
    Container(video, "Video Service", "NestJS", "Records video event metadata")
    Container(students, "Student Management Service", "NestJS", "CRUD for students and tag assignments")
    Container(compliance, "Compliance Service", "NestJS", "Driver records, inspections, audit log")
    Container(notify, "Notification Service", "NestJS", "Fan-out push/SMS/email to parents")

    ContainerDb(pg, "PostgreSQL", "Relational DB", "Per-service schemas with school_id tenant column")
    ContainerDb(redis, "Redis", "Cache + Queue broker", "Presence state cache, BullMQ queues")

    Rel(driver, gateway, "REST + WebSocket", "HTTPS")
    Rel(parent, gateway, "REST + SSE", "HTTPS")
    Rel(admin, gateway, "REST + WebSocket", "HTTPS")

    Rel(gateway, gps, "Proxy", "HTTP")
    Rel(gateway, alerts, "Proxy", "HTTP")
    Rel(gateway, presence, "Proxy", "HTTP")
    Rel(gateway, video, "Proxy", "HTTP")
    Rel(gateway, students, "Proxy", "HTTP")
    Rel(gateway, compliance, "Proxy", "HTTP")

    Rel(gps, eventbus, "Publishes location.updated", "BullMQ")
    Rel(alerts, eventbus, "Publishes alert.created", "BullMQ")
    Rel(presence, eventbus, "Publishes presence.boarded / presence.alighted", "BullMQ")

    Rel(eventbus, notify, "Consumes alert.created, presence.alighted", "BullMQ")
    Rel(notify, pg, "Logs notification records", "TypeORM")

    Rel(gps, pg, "Stores location_points", "Prisma")
    Rel(alerts, pg, "Stores emergency_alerts", "TypeORM")
    Rel(presence, pg, "Stores presence_events", "TypeORM")
    Rel(presence, redis, "Caches presence state", "ioredis")
    Rel(alerts, redis, "Alert queues", "BullMQ")
```

---

## 4. Event Flow – Emergency Alert

```mermaid
sequenceDiagram
    participant Driver as Driver App
    participant Gateway as API Gateway
    participant Alerts as Emergency Alerts Service
    participant Bus as Event Bus (BullMQ)
    participant Notify as Notification Service
    participant Parent as Parent App

    Driver->>Gateway: POST /emergency-events
    Gateway->>Alerts: Forward (tenant-scoped)
    Alerts->>Alerts: Persist alert (DB)
    Alerts->>Bus: Publish alert.created
    Alerts->>Gateway: 201 Created
    Gateway-->>Driver: 201 Created
    Bus->>Notify: Consume alert.created
    Notify->>Parent: Push notification (FCM)
    Notify->>Notify: Log notification_log (DB)
```

---

## 5. Event Flow – Student Presence (BLE / Manual)

```mermaid
sequenceDiagram
    participant Driver as Driver App
    participant Gateway as API Gateway
    participant Presence as Student Presence Service
    participant Redis as Redis Cache
    participant Bus as Event Bus (BullMQ)
    participant Notify as Notification Service
    participant Parent as Parent App

    Driver->>Gateway: POST /student-presence-events
    Gateway->>Presence: Forward (tenant-scoped)
    Presence->>Presence: Persist presence_event (DB)
    Presence->>Redis: Update presence state cache
    Presence->>Bus: Publish presence.boarded or presence.alighted
    Presence-->>Driver: 201 Created
    Bus->>Notify: Consume presence.alighted
    Notify->>Parent: Push "Your child has alighted"
```

---

## 6. Offline Resilience (Driver App)

The Driver App persists events locally using AsyncStorage when the network is unavailable. A background flush job retries the queue on reconnect.

```mermaid
flowchart LR
    GPS["GPS / Emergency\n/ Presence event"] --> Online{Online?}
    Online -->|Yes| API["POST to API Gateway"]
    Online -->|No| Queue["AsyncStorage\noffline queue"]
    Queue --> Flush["Flush on reconnect"]
    Flush --> API
    API --> Result{Success?}
    Result -->|Yes| Done["Remove from queue"]
    Result -->|No| Retry["Backoff & retry"]
    Retry --> API
```

---

## 7. Architecture Decision Records (ADRs)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | BullMQ over Kafka | Lower ops overhead for prototype scale; Redis already in stack |
| 2 | Per-service PostgreSQL schema, shared instance | Tenant isolation via `school_id` column; single DB for prototype cost |
| 3 | AsyncStorage offline queue | No extra native library needed in Expo; survives app restart |
| 4 | Server-Sent Events for parent alerts | Simpler than WebSockets for read-only alert stream; browser-native |

---

## 8. Gap Coverage

| Gap (from v0 analysis) | v1 Solution |
|---|---|
| Offline GPS / emergency buffering | AsyncStorage queue in Driver App (`offline-queue.service.ts`) |
| Student presence not wired | `presence.service.ts` in Driver App + API call in store |
| Parent push notifications | `useAlerts` hook + SSE polling; Notification Service fan-out |
| Service-to-service auth (planned) | Internal JWT signing (Phase 4) |
| Row-level security (planned) | PostgreSQL RLS (Phase 4) |
