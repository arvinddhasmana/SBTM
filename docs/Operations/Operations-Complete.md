# SBTM Operations Guide - Complete Reference

All operations documentation for the School Bus Transportation Management (SBTM) platform, consolidated into a single reference document. Covers the operations overview, deployment guidance, observability, real-phone deployment, runbooks, and troubleshooting.

---

## Table of Contents

1. [Operations Overview](#sbtm-operations-documentation)
2. [Deployment Guide](#sbtm-deployment-guide)
3. [Observability Guide](#sbtm-observability-guide)
4. [Real Phone Deployment Guide](#real-phone-deployment-guide)
5. [Operations Runbooks](#sbtm-operations-runbooks)
6. [Troubleshooting Guide](#sbtm-troubleshooting-guide)

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Operations/README.md                                        -->
<!-- ======================================================================== -->

# SBTM Operations Documentation

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Entry point for deployment, observability, troubleshooting, and runbook documentation

## Scope

This section documents how the platform is run, monitored, and recovered. It complements the architecture docs by focusing on operational execution rather than target design intent.

## Documents

- [DeploymentGuide.md](DeploymentGuide.md) - local and production-oriented deployment guidance
- [Observability.md](Observability.md) - health checks, metrics, logs, traces, and alert expectations
- [Troubleshooting.md](Troubleshooting.md) - common failure modes and diagnosis paths
- [Runbooks.md](Runbooks.md) - operational procedures for incidents, restarts, backup, and recovery

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Operations/DeploymentGuide.md                               -->
<!-- ======================================================================== -->

# SBTM Deployment Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Local deployment baseline and production-oriented deployment guidance

## Scope

This guide covers how SBTM is deployed locally today and what should be true before claiming readiness for a production-like deployment.

## Local Baseline

The current local deployment baseline is Docker Compose.

### Core Services and Ports

| Component             | Port                 | Notes                                                  |
| --------------------- | -------------------- | ------------------------------------------------------ |
| PostgreSQL            | 5433 exposed locally | Container uses PostgreSQL 15 with PostGIS              |
| Redis                 | 6379                 | Queue broker and cache                                 |
| API Gateway           | 3001                 | Main backend entry point                               |
| GPS Tracking          | 3002                 | Location ingest and history                            |
| Emergency Alerts      | 3003                 | Alerts and queue producer                              |
| Student Presence      | 3004                 | Presence persistence and cache usage                   |
| Video Service         | 3005                 | Video metadata                                         |
| Student Management    | 3006                 | Enrollment and assignments                             |
| Compliance Management | 3007                 | Compliance and audit                                   |
| OSRM                  | 5000                 | Route calculations (project-osrm/osrm-backend v5.27.1) |
| Parent App            | 3000                 | Web app                                                |
| Admin Dashboard       | 5173                 | Web UI served through containerized frontend           |

### Startup Sequence

1. Ensure Docker and Docker Compose are available.
2. Start PostgreSQL and Redis dependencies.
3. Start backend services.
4. Start frontend applications.
5. Verify health through gateway and key UI flows.

### Command

```bash
docker compose up --build
```

## Environment Configuration

Key environment categories:

- database connectivity
- Redis connectivity for queue and cache paths
- JWT and auth secrets
- downstream service URLs used by the gateway
- storage configuration for video workflows
- CORS and client base URL settings

### Environment Variable Patterns

| Service            | DB Config Pattern                                                 | Notes                                      |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------ |
| gps-tracking       | `DATABASE_URL` (Prisma connection string)                         | e.g. `postgresql://user:pass@host:port/db` |
| All other services | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | TypeORM split-field pattern                |

### Port Default Warnings

Several services have code-level default ports that differ from docker-compose:

| Service               | Code Default | docker-compose Port |
| --------------------- | ------------ | ------------------- |
| gps-tracking          | 3001         | 3002                |
| emergency-alerts      | 3000         | 3003                |
| student-presence      | 3003         | 3004                |
| compliance-management | 3006         | 3007                |

Always set the `PORT` environment variable explicitly to avoid collisions.

## Phase C Dependencies

| Package   | Version | Service     | Purpose                                                   |
| --------- | ------- | ----------- | --------------------------------------------------------- |
| `pdf-lib` | 1.17.1  | api-gateway | PDF document generation (pure JS, no native dependencies) |

## Phase C Database Changes

### New Tables

| Table               | Purpose                                                                         |
| ------------------- | ------------------------------------------------------------------------------- |
| `fleet_assignments` | Stores fleet assignment proposals with lifecycle (PROPOSED → ACCEPTED/REJECTED) |

### Altered Tables

| Table              | New Columns                                                                   | Notes                         |
| ------------------ | ----------------------------------------------------------------------------- | ----------------------------- |
| `student_absences` | `confirmationStatus`, `confirmedByUserId`, `confirmedAt`, `confirmationNotes` | Absence confirmation workflow |
| `schools`          | `status`, `createdAt`, `updatedAt`                                            | School lifecycle tracking     |

### New Seed Users

| Email                 | Role        | Password    |
| --------------------- | ----------- | ----------- |
| super.admin@sbtm.demo | SUPER_ADMIN | `Admin123!` |
| board.admin@sbtm.demo | BOARD_ADMIN | `Admin123!` |

### Migration Notes

These changes are included in `scripts/init-db.sql` — run this for fresh deployments. For existing deployments, apply the corresponding ALTER TABLE statements manually before starting services.

## Production-Oriented Requirements

Before production rollout, the deployment model should include:

- TLS termination and certificate management
- managed secret storage and rotation
- resilient PostgreSQL backup and restore capability
- Redis durability and failover strategy matched to queue needs
- object storage encryption and lifecycle rules
- centralized logs, metrics, and alerting
- documented incident response and rollback procedures

## Deployment Readiness Checklist

- All required environment variables are externally managed.
- Service health checks are defined and monitored.
- Database backup and restore have been tested.
- Queue behavior under dependency failure is understood.
- Tenant-sensitive logs are reviewed for privacy exposure.
- Parent and driver critical workflows have been smoke tested after deployment.

## Related Documents

- [../Design/DeploymentArchitecture.md](../Design/DeploymentArchitecture.md)
- [Observability.md](Observability.md)
- [Runbooks.md](Runbooks.md)

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Operations/Observability.md                                 -->
<!-- ======================================================================== -->

# SBTM Observability Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Operational monitoring expectations for health, metrics, logs, and traces

## Goals

- Detect broken safety-critical workflows quickly.
- Diagnose cross-service failures without relying on ad hoc log inspection.
- Preserve enough context to investigate incidents while avoiding unnecessary exposure of sensitive data.

## Health Signals

| Signal                             | Why It Matters                                            |
| ---------------------------------- | --------------------------------------------------------- |
| API Gateway availability           | Applications depend on it as the main backend surface     |
| PostgreSQL connectivity            | All core transactional flows depend on it                 |
| Redis health and queue depth       | Alerts and presence event processing rely on it           |
| GPS ingest success rate            | Route visibility and downstream intelligence depend on it |
| Alert creation latency             | Incidents are time-sensitive                              |
| Presence event persistence latency | Boarding and alighting workflows need confidence          |
| Parent delivery pipeline status    | A core safety communication expectation                   |
| OSRM routing availability          | Route optimization and geometry calculations depend on it |

## Recommended Metrics

| Metric                         | Type      | Scope                                  |
| ------------------------------ | --------- | -------------------------------------- |
| request latency                | histogram | gateway and all HTTP services          |
| error rate                     | counter   | per service and per endpoint group     |
| queue depth                    | gauge     | alerts and presence queues             |
| queue retry count              | counter   | event consumers                        |
| location ingest rate           | counter   | GPS service                            |
| active alerts                  | gauge     | alerts service                         |
| presence event throughput      | counter   | student presence service               |
| failed notification deliveries | counter   | notification workflow when implemented |

## Logging Guidance

- Use structured logs with service name, environment, request or correlation ID, tenant context, and event type where relevant.
- Avoid logging raw student PII or full route histories unless strictly required for diagnosis.
- Redact credentials, tokens, and sensitive payload fields.
- Make it possible to trace a single incident across gateway, alerts, presence, and parent-delivery flows.

## Tracing Guidance

- Propagate a correlation ID from the gateway into downstream services.
- Include queue-published event IDs in structured logs.
- Make queue consumer retries visible in telemetry rather than burying them in silent loops.

## Alerting Priorities

1. Gateway unavailable
2. Database unavailable
3. Redis unavailable for alert or presence paths
4. Alert creation failures or sustained latency spike
5. Presence persistence failures
6. Notification delivery failures once implemented

## Privacy Notes

- Logs and dashboards should prefer identifiers and scoped metadata over broad student-detail dumps.
- Investigative access to audit or incident detail should remain role-limited.

## Related Documents

- [DeploymentGuide.md](DeploymentGuide.md)
- [Troubleshooting.md](Troubleshooting.md)
- [Runbooks.md](Runbooks.md)

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Operations/RealPhoneDeploymentGuide.md                      -->
<!-- ======================================================================== -->

# Real Phone Deployment Guide

Deploy the SBTM backend and test the Driver App on a real phone — GPS tracking, board/alight events, and emergency alerts over a live bus route.

## Architecture

```
┌─────────────┐     HTTPS/ngrok      ┌─────────────────────────────┐
│  Your Phone  │ ──────────────────→  │   Dev Machine               │
│  (Driver App)│                      │                             │
│              │  GPS events ────→    │  Docker Compose Stack       │
│              │  Board/Alight ──→    │  ┌─ API Gateway      :3001  │
│              │  Emergency ─────→    │  ├─ GPS Tracking     :3002  │
│              │  Lifecycle ─────→    │  ├─ Emergency Alerts :3003  │
└─────────────┘                      │  ├─ Student Presence :3004  │
                                     │  ├─ PostgreSQL        :5433  │
┌─────────────┐                      │  └─ Redis             :6379  │
│  Browser     │ ← SSE/Polling ───   │                             │
│  (Dashboard) │                      │  Admin Dashboard     :5173  │
└─────────────┘                      │  Parent Portal        :3000  │
                                     └─────────────────────────────┘
```

## Connectivity Options

| Method                     | Cost         | Works on mobile data? | Setup effort         |
| -------------------------- | ------------ | --------------------- | -------------------- |
| **ngrok** (recommended)    | Free tier    | Yes                   | Install ngrok        |
| **Cloudflare Tunnel**      | Free         | Yes                   | Install cloudflared  |
| **LAN only**               | Free         | No — same WiFi only   | None                 |
| **Oracle Cloud Free Tier** | Free forever | Yes                   | 2 ARM VMs            |
| **Hetzner VPS**            | ~$4/mo       | Yes                   | Cheapest paid option |

For a driving test away from home WiFi, use **ngrok** (free tier is sufficient).

## Prerequisites

|                                   | Notes                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| Docker Desktop                    | Runs the full backend stack                                                                 |
| Node.js 20+ and pnpm 9+           | Use `pnpm`, not `npm` — this is a pnpm workspace                                            |
| ngrok                             | [ngrok.com/download](https://ngrok.com/download) — required for WSL2, recommended elsewhere |
| Expo Go on Android                | For development testing without building an APK                                             |
| `eas-cli` (`pnpm add -g eas-cli`) | Only needed if building an APK via EAS cloud                                                |
| Expo account                      | Only needed for EAS APK builds                                                              |
| Android phone with USB debugging  | Only needed for direct `adb install` of APK                                                 |

## Quick Start (all-in-one script)

```bash
# Start backend + ngrok tunnel + seed DB + print all URLs
./scripts/phone-deploy.sh --ngrok
```

This starts the minimal Docker stack, seeds the demo database, starts an ngrok tunnel, writes `apps/driver-app/.env`, starts the Dashboard and Portal, and prints all credentials.

---

## Step-by-Step

### Step 1 — Start the backend

```bash
# Start the full stack
docker compose up -d

# First-time only: seed the demo database
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql

# Verify the API is healthy
curl http://localhost:3001/api/v1/health
```

Alternatively, start only the services the driver app needs:

```bash
docker compose up -d postgres redis api-gateway gps-tracking emergency-alerts student-presence
```

### Step 2 — Open a tunnel to the backend

```bash
ngrok http 3001
```

Note the HTTPS forwarding URL (e.g., `https://a1b2-xx-xx.ngrok-free.app`).

**WSL2 users:** Docker ports are only accessible inside the WSL2 VM — your phone cannot reach them from the LAN even with Windows Firewall rules open. ngrok is the correct solution and not optional on WSL2.

### Step 3 — Configure the driver app

```bash
# IMPORTANT: end with /api/v1 — without it, all requests return 404
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://YOUR-NGROK-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# Install/update packages (from workspace root)
pnpm install
```

Verify the login endpoint through the tunnel before opening the app:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver1@sbtm.demo","password":"Admin123!"}'
# Expected: 200
```

### Step 4 — Run on Expo Go (development testing)

```bash
cd apps/driver-app

# WSL2 — must also tunnel Metro
pnpm exec expo start --tunnel

# Non-WSL2 (same-network device)
pnpm exec expo start
```

Open Expo Go on your phone and scan the QR code.

### Step 5 — Build an APK (optional — for install without Expo Go)

#### Option A: EAS cloud build (no Android SDK needed)

```bash
cd apps/driver-app

# Link to your Expo account (one time)
eas login
eas build:configure

# Build — takes ~10 minutes on Expo servers
eas build --platform android --profile preview

# Download the APK from the URL printed at the end
```

#### Option B: Local build (requires Android SDK + JDK 17)

```bash
cd apps/driver-app

# Generate native Android project
npx expo prebuild --platform android

# Build
cd android && ./gradlew assembleRelease

# APK output path
# android/app/build/outputs/apk/release/app-release.apk
```

### Step 6 — Install APK on device

```bash
# Via USB (requires adb)
adb install android/app/build/outputs/apk/release/app-release.apk

# Alternatively: share the file via email or Google Drive and open on device
```

### Step 7 — Test the full flow

**On your phone (Driver App):**

1. Log in with `driver1@sbtm.demo` / `Admin123!`
2. Select the **Single Bus AM** or **Single Bus PM** route
3. Grant location permissions — choose **"Allow all the time"** for background tracking
4. Tap **Start Route**
5. Open **Roster** to board and alight students
6. Tap **PANIC** to test emergency alerts
7. Lock screen — GPS should continue via background task (check the notification in Android status bar)

**On your computer (Admin Dashboard at http://localhost:5173):**

1. Log in with `school.admin@sbtm.demo` / `Admin123!`
2. Watch the live map for the bus position updating in real time
3. Check the Alerts panel for the PANIC alert
4. Check the Passenger Feed for board/alight events

**On your computer (Parent Portal at http://localhost:3000):**

1. Log in with `parent1@sbtm.demo` / `Admin123!`
2. Go to the Map page to see the live bus location

---

## Event Flow Reference

| Event          | Driver Action              | API Endpoint                    | Verify On                  |
| -------------- | -------------------------- | ------------------------------- | -------------------------- |
| GPS Location   | Automatic every 5 s / 10 m | `POST /routes/locations`        | Dashboard → Live Map       |
| Route Start    | Select route → Start       | `POST /routes/lifecycle-events` | Dashboard → Routes         |
| Board Student  | Tap student → Boarded      | `POST /student-presence-events` | Dashboard → Passenger Feed |
| Alight Student | Tap student → Alighted     | `POST /student-presence-events` | Dashboard → Passenger Feed |
| Panic Alert    | Tap PANIC                  | `POST /emergency-events`        | Dashboard → Alerts         |
| Route End      | Tap End Route              | `POST /routes/lifecycle-events` | Dashboard → Routes         |
| Background GPS | Lock screen                | Background task continues       | Dashboard → Live Map       |
| Offline Buffer | Airplane mode              | Events queue locally            | Arrive after reconnect     |

---

## Credentials Reference

All passwords are `Admin123!`.

| Role                      | Email                    |
| ------------------------- | ------------------------ |
| Super Admin               | `super.admin@sbtm.demo`  |
| OSTA Admin                | `osta.admin@sbtm.demo`   |
| Board Admin               | `board.admin@sbtm.demo`  |
| School Admin (Greenfield) | `school.admin@sbtm.demo` |
| **Driver**                | **`driver1@sbtm.demo`**  |
| Parent 1                  | `parent1@sbtm.demo`      |
| Parent 2                  | `parent2@sbtm.demo`      |
| Parent 4                  | `parent4@sbtm.demo`      |
| Parent 5                  | `parent5@sbtm.demo`      |

---

## Troubleshooting

### App shows "network error" or "Request failed with status code 404" on login

- Confirm `EXPO_PUBLIC_API_URL` in `apps/driver-app/.env` ends with `/api/v1`
- Confirm ngrok is still running and the URL matches
- Test the endpoint directly: `curl https://YOUR-URL.ngrok-free.app/api/v1/health`

### Login succeeds but app shows error (status 500)

The schedule endpoint (`GET /driver/me/schedule`) returned 500. This means the `routes` table in the database is not seeded. Fix for an existing database:

```bash
docker compose exec postgres psql -U postgres -d sbms -c "
INSERT INTO routes (id, \"schoolId\", name, direction, \"vehicleId\", \"startTime\") VALUES
  ('a0000001-0000-0000-0000-000000000001',
   'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
   'Single Bus AM', 'AM', 'BUS-01', '07:15'),
  ('a0000001-0000-0000-0000-000000000002',
   'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
   'Single Bus PM', 'PM', 'BUS-01', '15:00')
ON CONFLICT (id) DO NOTHING;

UPDATE users
  SET \"assignedRouteIds\" =
    'a0000001-0000-0000-0000-000000000001,a0000001-0000-0000-0000-000000000002'
  WHERE email = 'driver1@sbtm.demo';
"
```

This fix is already applied in `scripts/init-db.sql` — it only needs to be run manually against databases seeded before this fix.

### Expo Go shows "Failed to download remote update"

Metro is running but your phone cannot reach it. Start Metro with the tunnel flag:

```bash
pnpm exec expo start --tunnel
```

### GPS not updating on the dashboard

- Check that you granted **"Allow all the time"** location permission on Android
- Disable battery optimization for the SBTM Driver app in Android settings
- Verify the **"SBTM Driver — Tracking route in progress"** notification is visible while routing

### ngrok tunnel stopped working

Free ngrok sessions expire after 8 hours. Restart with `ngrok http 3001`, update `.env`, and restart Metro.

### Port conflict when starting Metro

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
```

---

## Stopping Everything

```bash
docker compose down          # stop and remove containers
pkill -f 'ngrok http'        # stop ngrok
```

---

## Related Docs

- [Driver App Development Guide](dev/driver-app-development.md) — detailed setup, WSL2 networking, known issues
- [Demo Setup Guide](Demo/DEMO_SETUP_GUIDE.md) — full demo simulation with all roles
- [Local Dev Testing Guide](dev/local_dev_testing_guide.md) — Mock / Hybrid / Full Docker modes

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Operations/Runbooks.md                                      -->
<!-- ======================================================================== -->

# SBTM Operations Runbooks

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Repeatable procedures for incident response, restart, recovery, and safety-critical operational handling

## RB-INC-001 Incident Response for Active Route Emergency

**When to use**

- A driver panic or critical route incident has been reported.

**Procedure**

1. Confirm alert creation in the alerting workflow.
2. Verify the affected route, vehicle, tenant, and driver context.
3. Confirm admin dashboard visibility of the incident.
4. Determine whether parent communication has been sent, simulated, or failed.
5. Preserve relevant audit and incident evidence.
6. Track the incident through resolution and post-incident review.

## RB-OPS-001 Restart a Degraded Service

**When to use**

- One backend service is unhealthy while dependencies remain available.

**Procedure**

1. Confirm the problem is isolated to a single service.
2. Check dependent services before restart to avoid repeated failure loops.
3. Restart the service through the platform's orchestration mechanism.
4. Validate health and a representative user-facing workflow.
5. Record the restart and suspected cause.

## RB-DATA-001 Backup and Restore Readiness

**When to use**

- Preparing for production, validating disaster recovery, or responding to corruption.

**Procedure**

1. Verify scheduled backups exist for PostgreSQL and relevant object storage.
2. Validate restore instructions in a non-production environment.
3. Confirm tenant-sensitive data is protected during backup handling.
4. Document restore time, data loss window, and outstanding risks.

## RB-QUEUE-001 Redis or Queue Degradation

**When to use**

- Alert or presence workflows show queue build-up, missing consumers, or retry storms.

**Procedure**

1. Check Redis health and connectivity.
2. Inspect queue depth and failure counts.
3. Identify whether producers, consumers, or both are degraded.
4. Restore queue processing before replaying or draining workload.
5. Confirm downstream effects on admin and parent workflows.

## RB-PRIV-001 Privacy-Aware Incident Review

**When to use**

- An operational incident requires detailed investigation involving student-linked data.

**Procedure**

1. Limit data access to authorized roles.
2. Use identifiers and incident scope rather than broad data extraction where possible.
3. Preserve auditability of who accessed what and why.
4. Record any follow-up retention, deletion, or disclosure obligations.

## Related Documents

- [DeploymentGuide.md](DeploymentGuide.md)
- [Observability.md](Observability.md)
- [Troubleshooting.md](Troubleshooting.md)

---

<!-- ======================================================================== -->
<!-- SOURCE: docs/Operations/Troubleshooting.md                               -->
<!-- ======================================================================== -->

# SBTM Troubleshooting Guide

- Document owner: Engineering and Operations
- Last reviewed: 2026-03-30
- Primary use: Diagnose common platform failures and degraded workflow states

## Triage Order

1. Confirm whether the issue is localized to one UI or affects multiple clients.
2. Check API Gateway availability.
3. Check PostgreSQL and Redis health.
4. Identify which domain workflow is failing: tracking, alerting, presence, compliance, or video.
5. Review recent deploys, config changes, or dependency outages.

## Common Symptoms

### Parent app shows stale or missing live location

Possible causes:

- GPS service ingest or query failure
- gateway proxy issue for route tracking endpoints
- route assignment mismatch between student and route

Checks:

- verify GPS service is reachable
- verify recent location points exist for the route
- verify parent-child-route linkage is correct

### Emergency alert created but not visible to admins or parents

Possible causes:

- alert persistence failure
- gateway routing issue
- Redis or queue processing issue
- parent delivery pipeline incomplete or degraded

Checks:

- confirm alert record creation
- confirm alert queue publish behavior
- confirm admin real-time channel health
- confirm whether parent workflow is polling or event-driven in the environment

### Driver presence actions do not persist

Possible causes:

- mobile app fell back to local-only behavior
- student presence endpoint unavailable
- offline queue not flushing after reconnect

Checks:

- inspect app connectivity state
- confirm presence service health
- inspect offline queue flush logs or metrics

### Compliance records missing or inconsistent

Possible causes:

- incorrect tenant query scope
- service-local audit behavior not reflected elsewhere
- database write failure

Checks:

- verify `schoolId` filters and record ownership
- confirm DB connectivity
- review recent create or update requests

## Dependency Failures

| Dependency          | Expected Impact                                                           |
| ------------------- | ------------------------------------------------------------------------- |
| PostgreSQL down     | Most platform workflows fail or degrade severely                          |
| Redis down          | Alert and presence queue-backed behavior degrades; state caching affected |
| Object storage down | Video upload and retrieval fail                                           |
| Gateway down        | Apps lose primary backend access                                          |

## Escalation Guidance

- Escalate immediately if tracking, alerts, or presence failures affect active routes.
- Treat parent communication failures during an active incident as high priority.
- Treat audit or compliance inconsistencies as operationally important even if route execution continues.

## Related Documents

- [Observability.md](Observability.md)
- [Runbooks.md](Runbooks.md)
