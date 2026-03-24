# Functional Gaps Report (Revised v1 Baseline)

## Executive Summary
The current implementation already delivers a meaningful multi-service prototype: gateway auth and RBAC, GPS ingest/history, emergency alerts, student presence processing, compliance, video, student management, a working admin dashboard, a working parent portal, and a driver app with offline buffering.

The revised v1 gap is therefore not “build the platform from scratch.” The real work is to finish the incomplete seams between these parts so the delivered experience matches the revised design and business requirements. The main unfinished areas are:
- end-to-end event consumption and notification fan-out,
- driver presence workflow completion,
- parent communication features,
- map intelligence and route optimization,
- onboarding/provisioning workflows,
- enterprise-grade security, audit, and data lifecycle controls.

## 1. Core Application Workflow Gaps

### 1.1 Driver App
Confirmed implemented:
- Login, route selection, GPS tracking, panic alert submission, and offline queueing.
- Presence API client for `BOARD` and `ALIGHT` events with offline buffering support.

Confirmed gaps:
- The roster screen currently changes local student state and is not the definitive presence workflow.
- BLE/SmartTag scanning is not implemented in the app, despite service-side support for SmartTag detections.
- Vehicle and route execution state are still partly hardcoded or minimally modeled in the active route flow.
- Driver operational lifecycle events such as route start, stop progression, and richer driver status telemetry are not fully surfaced.

Business impact:
- Manual safety workflows are inconsistent between UI and backend.
- The mobile app does not yet function as the reliable presence-capture device envisioned in v1.

### 1.2 Parent App
Confirmed implemented:
- Login, child list retrieval, and live route tracking via polling.
- Active alert polling for a route.

Confirmed gaps:
- No push notifications for alert, boarding, alighting, delay, or route-completion events.
- No SSE client usage even though the alerts backend exposes an SSE stream.
- No absence reporting or parent-initiated exception workflow.
- No notification inbox/history or delivery-state visibility.

Business impact:
- The parent experience remains observational rather than proactive.
- Safety communication objectives are only partially met.

### 1.3 Admin Dashboard
Confirmed implemented:
- Pages for dashboard, alerts, routes, route planner, students, vehicles, videos, compliance, boards, and schools.
- Integration with gateway-backed APIs and live alert/presence channels.

Confirmed gaps:
- Route planning still uses mocked optimization output and placeholder polyline data.
- Boards and schools pages provide basic listing only, not full tenant administration.
- No invitation or user provisioning workflows for board admins, school admins, drivers, or parents.
- OSTA-wide and board-level cross-tenant operational views are limited.

Business impact:
- The dashboard is viable for internal demos and operations monitoring.
- It is not yet a complete administration surface for multi-tenant onboarding and operations.

## 2. Platform and Service Gaps

### 2.1 Event Bus and Notification Pipeline
Confirmed implemented:
- Emergency alerts service publishes BullMQ jobs.
- Student presence service publishes BullMQ jobs.

Confirmed gaps:
- No standalone notification service exists.
- Notification logic inside emergency-alerts is a stub and does not integrate with FCM, APNs, SMS, or email.
- Presence queue processing is a placeholder and does not trigger parent delivery or downstream orchestration.
- GPS tracking service does not publish `location.updated` events.

Business impact:
- The event-driven architecture described in v1 is not yet realized end-to-end.
- Parent-facing alerting and downstream automation remain blocked.

### 2.2 GPS Intelligence and Geofencing
Confirmed implemented:
- GPS tracking service persists location points and supports live/history retrieval.

Confirmed gaps:
- No `location.updated` event emission.
- No geofencing or route-deviation logic.
- No ETA engine or path adherence analytics.
- No provider-backed routing engine to replace mocked route optimization.

Business impact:
- Fleet visibility exists, but operational intelligence is limited.
- Delay, deviation, and predictive workflows cannot be trusted yet.

### 2.3 Multi-Tenancy, Identity, and Provisioning
Confirmed implemented:
- Gateway role checks and tenant scoping.
- `school_id` filtering in downstream services.
- Board and school data model support in the platform.

Confirmed gaps:
- No invitation flow for creating and onboarding users.
- No unified lifecycle management for parent, driver, and admin accounts.
- No board-aware enforcement in downstream databases beyond application filtering.
- No database RLS policies.

Business impact:
- Multi-tenant structure exists, but operational onboarding still depends on manual or seeded data flows.

### 2.4 Security, Audit, and Data Lifecycle
Confirmed implemented:
- JWT-based auth at the gateway.
- Compliance-specific audit logging.

Confirmed gaps:
- No service-to-service authentication.
- No centralized audit pipeline across all services.
- No defined retention, archival, purge, or privacy-response workflows.
- No evidence of production observability standards such as centralized tracing and metrics.

Business impact:
- Prototype security posture is acceptable for development and demo.
- v1 enterprise readiness and compliance alignment are not yet met.

## 3. Demo and Documentation Alignment Gaps
The demo documentation assumes a more complete narrative than the current product actually supports. The key mismatches are:
- Parent notifications are still narrated as future or simulated behavior.
- Route optimization is demo-safe but still mocked.
- Board and school management are partially represented in UI but not fully operable.
- Presence support exists in backend and partially in mobile code, but the main mobile interaction model is not yet authoritative.

These mismatches do not invalidate the demo, but they should be explicitly treated as guided-demo limitations rather than production-complete workflows.

## 4. Reclassified Items From Earlier Reports
The following items should no longer be reported as entirely missing:
- Driver offline resilience: implemented.
- Driver presence API integration layer: implemented, though not fully wired into the roster UX.
- Admin board and school UI presence: basic listing exists.
- Alerts SSE backend support: implemented.

The following remain genuinely incomplete and should stay in the active gap list:
- notification delivery,
- GPS event publication,
- BLE scanning in the driver app,
- geofencing and route deviation alerts,
- account provisioning and invitations,
- RLS, S2S auth, centralized audit, and retention controls.
