# SBTM Azure Architecture

- Document owner: Engineering and Architecture
- Last reviewed: 2026-04-21
- Audience: Solution architects, DevOps engineers, security reviewers

## Overview

SBTM is deployed on Azure Kubernetes Service (AKS) using managed PaaS for stateful services (PostgreSQL, Redis, Blob Storage). The Kubernetes manifests are cloud-agnostic (Kustomize-based) and can be applied to any K8s cluster; only the Bicep provisioning layer is Azure-specific.

### Design Principles

- **AKS for compute**: Standard tier cluster with 2+ Standard_D2s_v3 nodes; scale horizontally by adding nodes.
- **Managed PaaS for state**: PostgreSQL Flexible Server (PostGIS), Azure Cache for Redis, Azure Blob Storage — no stateful workloads in-cluster except OSRM.
- **Single public entry point**: NGINX Ingress on AKS exposes only the API Gateway at `https://api.sbtm.ca`. Frontends (admin + parent) are served from Azure Static Web Apps at `https://admin.sbtm.ca` and `https://parent.sbtm.ca` — see [CustomDomainSetup.md](CustomDomainSetup.md).
- **DNS**: `sbtm.ca` is hosted in an Azure DNS zone in the same resource group; the registrar delegates to Azure name servers (one-time manual step printed by `bootstrap.sh`).
- **Zero-secret images**: All secrets via Azure Key Vault + CSI driver. No secrets in env files, ConfigMaps, or image layers.
- **Cloud-agnostic K8s manifests**: `infra/k8s/` base + Kustomize overlays work on any Kubernetes distribution.

---

## C4 Diagrams

### Level 1 — System Context

```mermaid
C4Context
  title SBTM System Context

  Person(parent, "Parent/Guardian", "Monitors child's bus journey via web portal")
  Person(driver, "Bus Driver", "Operates route, marks attendance via mobile app")
  Person(admin, "School/Board Admin", "Manages routes, compliance, and alerts via dashboard")
  Person(osta, "OSTA Operator", "Fleet assignment and system-wide oversight")

  System(sbtm, "SBTM Platform", "Real-time school bus tracking, safety alerts, compliance, and parent communication")

  System_Ext(fcm, "Firebase Cloud Messaging / APNs", "Push notifications to parent and driver apps")
  System_Ext(twilio, "Twilio / AWS SNS", "SMS delivery for emergency alerts and escalations")
  System_Ext(osrm, "OSRM Route Engine", "Self-hosted Ottawa region routing and ETA calculation")
  System_Ext(playstore, "Google Play / Apple App Store", "Driver app distribution channel")
  System_Ext(sis, "School Information System", "Student records source (Phase D — not yet integrated)")

  Rel(parent, sbtm, "Tracks bus, receives presence and safety alerts", "HTTPS / SSE")
  Rel(driver, sbtm, "Reports route progress, marks boarding/alighting", "HTTPS / WebSocket")
  Rel(admin, sbtm, "Manages fleet, responds to alerts, views compliance", "HTTPS")
  Rel(osta, sbtm, "Assigns fleet to schools, reviews system-wide compliance", "HTTPS")
  Rel(sbtm, fcm, "Sends push notifications", "HTTPS")
  Rel(sbtm, twilio, "Sends emergency SMS", "HTTPS")
  Rel(sbtm, osrm, "Requests route geometry and ETAs", "HTTP — cluster internal")
  Rel(driver, playstore, "Downloads Driver App", "App store")
```

### Level 2 — Container Diagram (Azure AKS Deployment)

```mermaid
C4Container
  title SBTM Container Diagram — Azure AKS

  Person(user, "Users", "Parents, Drivers, Admins, OSTA")
  Container(driverapp, "Driver App", "React Native + Expo 54", "GPS tracking, BLE scanning, student presence, emergency alerts")

  Container_Boundary(azure, "Azure Cloud") {

    Container_Boundary(static, "Azure Static Web Apps") {
      Container(adminui, "Admin Dashboard", "React 19 + Vite", "Fleet management, alert response, and route UI")
      Container(parentui, "Parent Portal", "React 19 + Vite", "Bus tracking and safety communication UI")
    }

    Container_Boundary(aks, "AKS Cluster — sbtm-aks-{env}") {
      Container(ingress, "NGINX Ingress", "Kubernetes Ingress", "TLS termination (Let's Encrypt), public HTTPS entry point")
      Container(gw, "API Gateway", "NestJS v10 + JWT", "Auth, RBAC, multi-tenant scoping, reverse proxy")
      Container(gps, "GPS Tracking", "Express + PostGIS", "Location ingest, history, and snap-to-road")
      Container(alerts, "Emergency Alerts", "NestJS + Socket.IO", "Alert classification and WebSocket broadcast")
      Container(presence, "Student Presence", "NestJS + BullMQ", "Board/alight state persistence")
      Container(students, "Student Management", "NestJS + TypeORM", "Student enrollment and route assignment")
      Container(compliance, "Compliance", "NestJS + TypeORM", "Driver records and inspections")
      Container(video, "Video Service", "NestJS + TypeORM", "Video event metadata and Blob integration")
      Container(notify, "Notification Service", "NestJS + BullMQ", "Multi-channel fan-out (FCM, SMS, Email)")
      Container(osrmapp, "OSRM", "OSRM v5.27.1", "Route optimization engine")
    }

    Container_Boundary(data, "Managed Data Services") {
      ContainerDb(pg, "PostgreSQL + PostGIS", "Azure DB", "All domain data; multi-tenant")
      ContainerDb(redis, "Redis", "Azure Cache", "BullMQ queues and presence state cache")
      ContainerDb(blob, "Blob Storage", "Azure Blob Storage", "Driver videos and OSRM routing data")
    }

    Container(acr, "Container Registry", "ACR", "Docker images for backend services")
    Container(kv, "Key Vault", "Azure Key Vault", "Secrets and Credentials")
  }

  %% External Systems
  System_Ext(fcm, "FCM", "Firebase Cloud Messaging")
  System_Ext(twilio, "Twilio", "SMS Gateway")

  %% Relationships
  Rel(user, adminui, "Opens browser", "HTTPS")
  Rel(user, parentui, "Opens browser", "HTTPS")
  Rel(driverapp, ingress, "API and WebSocket calls", "HTTPS / WSS")
  Rel(adminui, ingress, "API calls", "HTTPS")
  Rel(parentui, ingress, "API calls + SSE stream", "HTTPS / SSE")

  Rel(ingress, gw, "Routes to API Gateway", "HTTP")

  Rel(gw, gps, "Proxies requests", "HTTP")
  Rel(gw, alerts, "Proxies requests", "HTTP/WS")
  Rel(gw, presence, "Proxies events", "HTTP")
  Rel(gw, students, "Proxies requests", "HTTP")
  Rel(gw, compliance, "Proxies requests", "HTTP")
  Rel(gw, video, "Proxies requests", "HTTP")
  Rel(gw, osrmapp, "Route geometry", "HTTP")

  Rel(alerts, notify, "alert.created", "BullMQ")
  Rel(presence, notify, "presence events", "BullMQ")

  Rel(gps, pg, "Reads/writes", "Prisma")
  Rel(alerts, pg, "Reads/writes", "TypeORM")
  Rel(presence, pg, "Reads/writes", "TypeORM")
  Rel(presence, redis, "Caches state", "Redis")
  Rel(students, pg, "Reads/writes", "TypeORM")
  Rel(compliance, pg, "Reads/writes", "TypeORM")
  Rel(video, pg, "Reads/writes", "TypeORM")

  Rel(video, blob, "Uploads/downloads", "Azure SDK")
  Rel(osrmapp, blob, "Loads road data", "Azure SDK")

  Rel(notify, fcm, "Sends push", "HTTPS")
  Rel(notify, twilio, "Sends SMS", "HTTPS")
```

### Level 3 — Component Diagrams

#### API Gateway — Internal Components

```mermaid
C4Component
  title API Gateway — Component Diagram

  Container_Boundary(gw, "API Gateway (NestJS)") {
    Component(auth, "Auth Module", "NestJS Module + Passport-JWT", "POST /auth/login — issues JWT; validates credentials against users table")
    Component(rbac, "RBAC Guard", "NestJS Guard", "Validates role hierarchy: SUPER_ADMIN > OSTA_ADMIN > BOARD_ADMIN > SCHOOL_ADMIN > DRIVER > PARENT")
    Component(tenant, "Multi-Tenancy Guard", "NestJS Guard", "Extracts school_id from JWT; enforces tenant scope on all downstream calls; bypassed for SUPER_ADMIN")
    Component(proxy, "Service Proxy Module", "NestJS + HttpService", "Forwards authenticated requests to GPS / Alerts / Presence / Students / Compliance / Video / Notifications")
    Component(route, "Route Management Controller", "NestJS Controller", "GET /routes — queries GPS service + OSRM for route geometry and ETAs")
    Component(pdf, "PDF Generator", "NestJS Service + pdf-lib v1.17.1", "GET /documents/fleet-assignment/:id/pdf — generates fleet agreement PDFs")
    Component(org, "Organization Controller", "NestJS Controller", "CRUD for boards and schools; scoped by BOARD_ADMIN boardId")
    Component(fleet, "Fleet Assignment Controller", "NestJS Controller", "OSTA_ADMIN proposes vehicle assignments; SCHOOL_ADMIN accepts/rejects")
  }

  ContainerDb(pg, "PostgreSQL", "users, schools, boards, fleet_assignments, student_absences tables")
  Container(osrm, "OSRM Service", "Route engine")
  Container(downstream, "Domain Services", "GPS, Alerts, Presence, Students, Compliance, Video, Notifications")

  Rel(auth, pg, "Validates credentials, issues JWT")
  Rel(rbac, auth, "Verifies JWT signature and role claims")
  Rel(tenant, rbac, "Adds school_id scope to request context")
  Rel(proxy, downstream, "Forwards authenticated HTTP requests")
  Rel(route, osrm, "Fetches route geometry and ETA")
  Rel(pdf, pg, "Reads fleet assignment data for PDF")
  Rel(org, pg, "CRUD boards and schools")
  Rel(fleet, pg, "Manages fleet_assignments lifecycle")
```

#### Emergency Alerts — Event Flow

```mermaid
C4Component
  title Emergency Alerts — Component Diagram

  Container_Boundary(svc, "Emergency Alerts Service (NestJS)") {
    Component(ctrl, "Alerts Controller", "NestJS Controller", "POST /alerts, PATCH /alerts/:id/confirm|false-alarm|resolve, GET /alerts/audit/:id")
    Component(classifier, "Alert Classifier", "NestJS Service", "Maps EmergencyEventType → AlertTier: Tier1=PANIC_BUTTON/MEDICAL/INCIDENT, Tier2=LATE_DEPARTURE/COMPLIANCE, Tier3=BOARDING/ALIGHTING")
    Component(engine, "Confirmation Engine", "NestJS Service + BullMQ", "Tier1: sets PENDING_CONFIRMATION + schedules 3 timeout jobs (2m confirm, 5m board escalation, 15m OSTA escalation)")
    Component(proc, "Alerts Processor", "BullMQ Worker", "handleConfirmationTimeout → auto-escalate to parents; handleBoardEscalation → notify Board Admin; handleOstaEscalation → notify OSTA Admin")
    Component(ws, "WebSocket Gateway", "Socket.IO Gateway", "Broadcasts alert.created and alert.updated events to connected admin clients")
    Component(audit, "Audit Service", "NestJS Service + TypeORM", "Records every state transition to alert_audit_log: CREATED → PENDING_CONFIRMATION → CONFIRMED/FALSE_ALARM → PARENT_NOTIFIED → RESOLVED")
  }

  ContainerDb(pg, "PostgreSQL", "emergency_alerts, alert_audit_log tables")
  ContainerDb(redis, "Redis / BullMQ", "confirmation-timeouts, escalation-timers queues")
  Container(notify, "Notification Service", "Fan-out: FCM + SMS + email")

  Rel(ctrl, classifier, "Classifies incoming alert")
  Rel(classifier, engine, "Routes by tier")
  Rel(engine, redis, "Enqueues timeout jobs")
  Rel(proc, redis, "Consumes timeout jobs")
  Rel(proc, notify, "Publishes alert.created event for parent fan-out")
  Rel(ctrl, audit, "Records every state mutation")
  Rel(ctrl, ws, "Broadcasts to admin dashboard")
  Rel(ctrl, pg, "Persists alert and status")
  Rel(audit, pg, "Persists audit log entries")
```

---

## Azure Well-Architected Framework

### Reliability

| Control            | Implementation                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| AKS multi-node     | 2+ nodes minimum; pod disruption budgets prevent single-node disruption from taking down services |
| Health probes      | All pods have liveness + readiness probes; unhealthy pods replaced automatically                  |
| PostgreSQL HA      | Geo-redundant backup; point-in-time restore; Zone Redundant HA for production                     |
| Redis persistence  | AOF + RDB persistence enabled on Standard tier; failover replica in production                    |
| Ingress redundancy | NGINX Ingress with 2 replicas; cert-manager handles certificate auto-renewal                      |

### Security

| Control           | Implementation                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Secrets           | Azure Key Vault + CSI driver; no secrets in ConfigMaps, env files, or images                                           |
| Network           | AKS VNET; private endpoints for PostgreSQL and Redis; only ingress has public IP                                       |
| Identity          | Azure Workload Identity for pod → Azure service auth (ACR pull, KV read, Blob write)                                   |
| TLS               | cert-manager + Let's Encrypt; auto-renewal; HTTP redirected to HTTPS by ingress                                        |
| Registry scanning | Azure Defender for Containers scans all images pushed to ACR                                                           |
| WAF               | Azure Front Door Standard WAF for production (OWASP rules + rate limiting)                                             |
| RBAC              | AKS RBAC; separate namespaces (`sbtm-demo`, `sbtm-production`) on dedicated clusters; least-privilege service accounts |

### Cost Optimization

| Tier       | AKS Nodes                        | PostgreSQL                     | Redis       | Est. Cost/month                   |
| ---------- | -------------------------------- | ------------------------------ | ----------- | --------------------------------- |
| Demo       | 1× Standard_B2as_v2 (East US)    | B1ms, 32GB                     | Basic C0    | ~$108/mo (~$10–15 with cost-stop) |
| Production | 3–5× Standard_D4s_v3 (autoscale) | GP_Standard_D4s_v3, 256GB + HA | Standard C2 | ~$900–1,500                       |

> Pilot rollouts run on either the Demo cluster (in a separate namespace, no extra Azure cost) or on Production with feature-flag gating — see [CostAnalysis.md](CostAnalysis.md#sharing-infrastructure-between-environments-k8s-namespaces).

**Cost reduction options for demo:**

- Use a single Standard_D4s_v3 node (pack all services): ~$140 node cost + PaaS = ~$215/mo total
- Deploy in East US (AKS free control plane tier in select regions)
- Admin Dashboard and Parent Portal on Azure Static Web Apps (free tier) — saves ~$20/mo vs containerized hosting

### Performance Efficiency

| Concern               | Implementation                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------- |
| GPS ingest            | HPA on GPS Tracking pod (scale at 70% CPU); Redis not used for GPS (Prisma + PostGIS direct) |
| Alert delivery        | BullMQ Redis queue; target ≤10s from alert.created to push delivery                          |
| Presence cache        | Redis TTL 30s for route summary; 1hr for individual student state                            |
| Static assets         | Azure Static Web Apps CDN distributes Admin Dashboard and Parent Portal globally             |
| DB connection pooling | PgBouncer sidecar or connection_limit via Prisma for GPS service                             |

### Operational Excellence

| Concern       | Implementation                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CI/CD         | GitHub Actions: lint → build → test → push ACR → deploy demo → manual gate → production                                     |
| GitOps        | Kustomize overlays in `infra/k8s/overlays/demo` and `production`; changes applied via `kubectl apply -k`                    |
| Observability | Azure Monitor Container Insights (pod metrics), Application Insights (traces + exceptions), Log Analytics (structured logs) |
| Alerting      | Azure Monitor alerts on pod CrashLoopBackOff, error rate spike, PostgreSQL connection exhaustion                            |
| Runbooks      | `docs/Operations/Runbooks.md` covers incident response, rollback, and backup restore procedures                             |

---

## Azure Service Configuration Reference

### AKS Cluster

```
Name: sbtm-aks
Region: East US (or Canada Central for PIPEDA)
Tier: Standard
System node pool: 1× Standard_D2s_v3 (system workloads)
App node pool: 2× Standard_D2s_v3 (autoscale 1–5)
Networking: Azure CNI
VNET: sbtm-vnet (10.0.0.0/16)
AKS subnet: 10.0.1.0/24
Services subnet: 10.0.2.0/24
Add-ons: Azure Monitor, Key Vault CSI driver, Workload Identity
```

### PostgreSQL Flexible Server

```
Name: sbtm-pg
SKU: B2ms (demo) / GP_Standard_D4s_v3 (production)
Storage: 32GB (demo) / 256GB (production)
Extensions: postgis, uuid-ossp, pg_stat_statements
Backup: Geo-redundant, 7-day retention (demo) / 35-day (production)
Private DNS zone: sbtm-pg.private.postgres.database.azure.com
Database: sbms
```

### Redis Cache

```
Name: sbtm-redis
SKU: Basic C0 (demo) / Standard C1 (production)
Persistence: Disabled (demo) / AOF + RDB (production)
Private endpoint: sbtm-redis.redis.cache.windows.net
```

### Blob Storage

```
Name: sbtmblobstorage
Containers:
  - videos (private, hot tier)
  - osrm-data (private, cool tier)
  - exports (private, hot tier)
Replication: LRS (demo) / ZRS (production)
Lifecycle: Auto-delete videos > 90 days (configurable)
```

### Container Registry

```
Name: sbtmacr
SKU: Basic (demo) / Standard (production)
Geo-replication: Disabled (demo) / Canada East replica (production)
Admin user: disabled (use managed identity pull)
```

---

## Endpoint Reference

All names and hostnames are deterministic from the Bicep templates in `infra/azure/modules/`.
PaaS resources (PostgreSQL, Redis) have **private endpoints only** — they are not reachable from the public internet.
The public-facing NGINX Ingress and Azure Static Web Apps are the only externally accessible surfaces.

### Public endpoints

| Resource          | Demo                             | Production                       | Notes                                                                                                                                                |
| ----------------- | -------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin Portal**  | `https://admin.sbtm.ca`          | `https://admin.sbtm.ca`          | Azure SWA `sbtm-admin-demo` / `sbtm-admin-production`. Also reachable via the default SWA hostname until the custom domain is validated — see below. |
| **Parent Portal** | `https://parent.sbtm.ca`         | `https://parent.sbtm.ca`         | Azure SWA `sbtm-parent-demo` / `sbtm-parent-production`.                                                                                             |
| **API Gateway**   | `https://api.sbtm.ca` (port 443) | `https://api.sbtm.ca` (port 443) | NGINX Ingress on AKS (LoadBalancer IP → cert-manager TLS).                                                                                           |

Default Azure Static Web App hostnames (usable before custom domain validation or when `sbtm.ca` DNS is not yet delegated):

| Portal | Demo default hostname                                  |
| ------ | ------------------------------------------------------ |
| Admin  | `https://yellow-beach-0c42c9f10.7.azurestaticapps.net` |
| Parent | `https://zealous-dune-08c612410.7.azurestaticapps.net` |

> Production SWA default hostnames are emitted as `adminPortalDefaultHostname` / `parentPortalDefaultHostname` in the Bicep deployment outputs and are known only after first deploy: `az deployment group show -g sbtm-rg -n main --query "properties.outputs"`.

### Ingress routing (all environments, K8s namespace scoped per env)

All traffic enters via the NGINX Ingress at `https://api.sbtm.ca`. The Ingress routes by path to internal ClusterIP services:

| Path                  | Backend K8s service | Port |
| --------------------- | ------------------- | ---- |
| `/ws/alerts`          | `emergency-alerts`  | 80   |
| `/ws/presence`        | `student-presence`  | 80   |
| `/` (everything else) | `api-gateway`       | 80   |

### Internal K8s services (cluster-internal only, not publicly accessible)

| Service               | K8s service name        | Container port |
| --------------------- | ----------------------- | -------------- |
| API Gateway           | `api-gateway`           | 3000           |
| GPS Tracking          | `gps-tracking`          | 3001           |
| Emergency Alerts      | `emergency-alerts`      | 3002           |
| Student Presence      | `student-presence`      | 3003           |
| Student Management    | `student-management`    | 3004           |
| Compliance Management | `compliance-management` | 3005           |
| Video Service         | `video-service`         | 3006           |
| Notification Service  | `notification-service`  | 3007           |
| OSRM (routing engine) | `osrm`                  | 5000           |

All services are exposed inside the cluster on ClusterIP port 80 → container port shown above. Services talk to each other via DNS: `http://<service-name>` (e.g. `http://gps-tracking`).

K8s namespaces: `sbtm-demo` (Demo) · `sbtm-production` (Production).

### Azure PaaS — private endpoints (internal to AKS VNET, not internet-accessible)

| Resource                   | Demo                                       | Production                                       | Port       |
| -------------------------- | ------------------------------------------ | ------------------------------------------------ | ---------- |
| PostgreSQL Flexible Server | `sbtm-pg-demo.postgres.database.azure.com` | `sbtm-pg-production.postgres.database.azure.com` | 5432       |
| Redis Cache                | `sbtm-redis-demo.redis.cache.windows.net`  | `sbtm-redis-production.redis.cache.windows.net`  | 6380 (TLS) |

### Azure PaaS — management / SDK endpoints

| Resource           | Demo                                          | Production                                          |
| ------------------ | --------------------------------------------- | --------------------------------------------------- |
| Key Vault          | `https://sbtm-kv-demo.vault.azure.net/`       | `https://sbtm-kv-production.vault.azure.net/`       |
| Blob Storage       | `https://sbtmblobdemo.blob.core.windows.net/` | `https://sbtmblobproduction.blob.core.windows.net/` |
| Container Registry | `sbtmacrdemo.azurecr.io`                      | `sbtmacrproduction.azurecr.io`                      |

### Azure monitoring portals (Azure Portal navigation)

| Resource                          | Resource name (Portal → search) | Region         |
| --------------------------------- | ------------------------------- | -------------- |
| Application Insights (Demo)       | `sbtm-appinsights-demo`         | East US        |
| Application Insights (Production) | `sbtm-appinsights-production`   | Canada Central |
| Log Analytics (Demo)              | `sbtm-logs-demo`                | East US        |
| Log Analytics (Production)        | `sbtm-logs-production`          | Canada Central |

Application Insights portal: [portal.azure.com](https://portal.azure.com) → search the resource name above → Overview → "Application dashboard".

### Retrieving all outputs after a Bicep deploy

```bash
# Demo
az deployment group show -g sbtm-demo-rg -n main \
  --query "properties.outputs" -o table

# Production
az deployment group show -g sbtm-rg -n main \
  --query "properties.outputs" -o table
```

Outputs include: `aksClusterName`, `acrLoginServer`, `keyVaultUri`, `postgresFqdn`, `redisHostname`, `storageAccountName`, `adminPortalDefaultHostname`, `parentPortalDefaultHostname`.

---

## Related Documents

- [CustomDomainSetup.md](CustomDomainSetup.md) — DNS delegation, TLS provisioning, domain registration steps
- [InfrastructureAsCode.md](InfrastructureAsCode.md) — Bicep templates and Kustomize manifests
- [AzureCICD.md](AzureCICD.md) — GitHub Actions CI/CD pipeline
- [CostAnalysis.md](CostAnalysis.md) — Detailed cost breakdown and scaling guidance
- [DeploymentArchitecture.md](../Design/DeploymentArchitecture.md) — Environment matrix and topology overview
