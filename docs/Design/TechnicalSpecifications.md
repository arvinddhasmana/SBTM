# SBTM v1 – Technical Specifications

- Document owner: Engineering
- Last reviewed: 2026-03-30
- Primary use: Target-state technical baseline, interfaces, and non-functional design

This document describes the target v1 technical baseline. It should be read with the current-state implementation notes in `docs/Implementation` and the verified upgrade gaps in `docs/prd/v4/GapAnalysis.md`.

## Related Documents

- [Architecture.md](Architecture.md)
- [SystemArchitecture.md](SystemArchitecture.md)
- [DataArchitecture.md](DataArchitecture.md)
- [IntegrationArchitecture.md](IntegrationArchitecture.md)
- [DeploymentArchitecture.md](DeploymentArchitecture.md)
- [SecurityPrivacyArchitecture.md](SecurityPrivacyArchitecture.md)
- [EventCatalog.md](EventCatalog.md)
- [GapAnalysis.md](../prd/v4/GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](../prd/v1/PhaseWiseImplementationPlan.md)
- [TestingGuide.md](../Test/TestingGuide.md)

## 1. Technology Stack

| Layer                | Technology                                  | Notes                                                                                          |
| -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Mobile App (Driver)  | React Native (Expo ~54)                     | GPS, BLE scanning, offline queue via AsyncStorage                                              |
| Web App (Parent)     | Vite + React 19, TailwindCSS                | SSE alert stream, Leaflet map                                                                  |
| Web App (Admin)      | Vite + React 19, TailwindCSS, Leaflet       | Live fleet map, route management                                                               |
| API Gateway          | NestJS **v10.4.15** + TypeORM **v10** + JWT | RBAC, multi-tenant guards, proxy routing. **Note: v10 — other NestJS services are on v11.0.1** |
| GPS Tracking         | Express + Prisma **v5.22.0**                | Location ingest, live/history queries                                                          |
| Emergency Alerts     | NestJS + TypeORM + BullMQ                   | Alert creation, WebSocket broadcast, notification fan-out                                      |
| Student Presence     | NestJS + TypeORM + BullMQ                   | BLE / manual presence, Redis presence cache                                                    |
| Video Service        | NestJS + TypeORM                            | Video event metadata, MinIO/local storage                                                      |
| Student Management   | NestJS + TypeORM                            | Student CRUD, tag assignment, bulk import                                                      |
| Compliance           | NestJS + TypeORM                            | Driver records, inspections, audit log                                                         |
| Notification Service | NestJS + BullMQ                             | FCM/APNs fan-out, notification log                                                             |
| Event Bus            | BullMQ (Redis-backed)                       | Domain event queuing and consumer groups                                                       |
| Relational DB        | PostgreSQL (PostGIS enabled)                | Per-service schemas, `school_id` tenant column                                                 |
| Cache / Queue broker | Redis                                       | BullMQ queues, presence state cache                                                            |
| Object Storage       | MinIO (S3-compatible) or local              | Video file storage — replaced by Azure Blob Storage in cloud deployment                        |
| Route Engine         | OSRM v5.27.1 (self-hosted)                  | Route geometry, optimization, ETA calculations                                                 |

---

## 1a. Azure Cloud Service Equivalents

When deploying to Azure AKS, local infrastructure components map to the following managed services. See [`docs/Deployment/AzureArchitecture.md`](../Deployment/AzureArchitecture.md) for full details.

| Local Component         | Azure Service                           | Demo SKU                          | Notes                                                    |
| ----------------------- | --------------------------------------- | --------------------------------- | -------------------------------------------------------- |
| PostgreSQL container    | Azure DB for PostgreSQL Flexible Server | B2ms, 32GB                        | PostGIS extension supported; private endpoint in VNET    |
| Redis container         | Azure Cache for Redis                   | Basic C0 (250MB)                  | Standard C1 for production (persistence + replica)       |
| MinIO / local storage   | Azure Blob Storage                      | LRS Hot tier                      | S3-compatible SDK; no code changes needed beyond env var |
| Docker Compose services | Azure Kubernetes Service (AKS)          | Standard tier, 2× Standard_D2s_v3 | Kustomize manifests in `infra/k8s/`                      |
| NGINX (local)           | NGINX Ingress Controller + cert-manager | Free (in-cluster)                 | Let's Encrypt TLS; single public IP                      |
| Jaeger (local)          | Azure Monitor + Application Insights    | Pay-per-GB                        | OpenTelemetry → App Insights OTLP endpoint               |
| `.env` secrets          | Azure Key Vault + CSI driver            | Standard tier                     | SecretProviderClass mounts secrets as pod volumes        |
| Docker Hub images       | Azure Container Registry (ACR)          | Basic SKU                         | Integrated with AKS via managed identity pull            |
| Static file serving     | Azure Static Web Apps                   | Free tier                         | CDN-backed; zero-ops; Admin Dashboard + Parent Portal    |

---

## 2. Domain Events

All events are serialised as JSON and published via BullMQ. Each event envelope carries:

```typescript
interface DomainEvent<T = unknown> {
  eventId: string; // UUID v4
  eventType: string; // e.g. "location.updated"
  version: number; // schema version, starts at 1
  schoolId: string; // tenant identifier
  occurredAt: string; // ISO 8601
  payload: T;
}
```

### 2.1 location.updated

Published by: GPS Tracking Service  
Consumed by: (reserved for geofencing/deviation alerts in Phase 3)

```typescript
interface LocationUpdatedPayload {
  vehicleId: string;
  routeId: string;
  lat: number;
  lng: number;
  speedKph: number;
  headingDeg: number;
  accuracyMeters: number;
}
```

### 2.2 alert.created

Published by: Emergency Alerts Service  
Consumed by: Notification Service

```typescript
interface AlertCreatedPayload {
  alertId: string;
  vehicleId: string;
  routeId: string;
  eventType: 'PANIC_BUTTON' | 'ROUTE_DEVIATION' | 'MEDICAL' | 'OTHER';
  location: { lat: number; lng: number };
  driverId?: string;
}
```

### 2.3 presence.boarded

Published by: Student Presence Service  
Consumed by: Notification Service

```typescript
interface PresenceBoardedPayload {
  studentId: string;
  vehicleId: string;
  routeId: string;
  source: 'SMARTTAG' | 'MANUAL' | 'RFID';
  signalStrength?: number;
}
```

### 2.4 presence.alighted

Published by: Student Presence Service  
Consumed by: Notification Service

```typescript
interface PresenceAlightedPayload {
  studentId: string;
  vehicleId: string;
  routeId: string;
  source: 'SMARTTAG' | 'MANUAL' | 'RFID';
}
```

---

## 3. API Contract Additions (v1)

### 3.1 SSE Alert Stream (Parent App)

`GET /api/v1/routes/:routeId/alerts/stream`

Returns a Server-Sent Events stream. Each event is a JSON-serialised alert or presence update.

```
event: alert.created
data: {"alertId":"...","message":"Emergency on your child's bus","routeId":"r1"}

event: presence.alighted
data: {"studentId":"s1","routeId":"r1","message":"Your child has alighted the bus"}
```

### 3.2 Student Presence Event (Driver App)

`POST /api/v1/student-presence-events`

Request body:

```json
{
    "studentId": "uuid",
    "vehicleId": "uuid",
    "routeId": "uuid",
    "eventType": "BOARD" | "ALIGHT",
    "source": "MANUAL",
    "timestamp": "ISO 8601"
}
```

Response: `201 Created`

---

## 4. Offline Queue Specification (Driver App)

The Driver App uses an AsyncStorage-backed queue to buffer events when offline.

### Queue Key Layout

| Key                   | Value                            |
| --------------------- | -------------------------------- |
| `@sbtm/offline_queue` | `JSON.stringify(OfflineEvent[])` |

### OfflineEvent schema

```typescript
interface OfflineEvent {
  id: string; // UUID v4
  type: 'gps' | 'emergency' | 'presence';
  endpoint: string; // API path
  payload: unknown;
  retries: number; // incremented on failure
  createdAt: string; // ISO 8601
}
```

### Flush behaviour

- Triggered on: app foreground, network state change to online.
- Events are sent in FIFO order.
- On success: event removed from queue.
- On failure: `retries` incremented; dropped after 5 attempts.
- Maximum queue size: 500 events (oldest evicted when full).

---

## 5. Non-Functional Requirements

| Requirement            | Target                                 |
| ---------------------- | -------------------------------------- |
| GPS ingest latency     | ≤ 3 s end-to-end (prototype)           |
| Alert delivery latency | ≤ 10 s from event to push notification |
| Presence cache TTL     | 1 hour (state), 30 s (route summary)   |
| Offline queue max age  | 24 hours                               |
| API availability       | ≥ 99.5% (prototype SLA)                |
| Multi-tenant isolation | `school_id` enforced on every DB query |

---

## 6. Security Notes

- JWT tokens expire after 1 hour; refresh tokens are 7 days.
- Service-to-service authentication is planned for Phase 4 (internal JWT signing or mTLS).
- Driver App tokens are stored in `expo-secure-store` (Keychain / Keystore backed).
- Parent App tokens are stored in `localStorage` (web); migrate to HttpOnly cookie for production.
- All events carry `schoolId`; the API gateway validates that the caller's JWT scope includes the target school.

## 7. Prototype and Delivery Notes

- The current implementation already runs the gateway, GPS, alerts, presence, video, student-management, and compliance services in Docker Compose.
- Parent alert delivery, BLE-backed mobile presence, GPS event publishing, and provider-backed route intelligence remain phased upgrade work rather than completed functionality.
- Demo and test documents should reference this file for target-state technical direction, not as proof that the implementation is already complete.
