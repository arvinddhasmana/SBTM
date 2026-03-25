# SBTM v1 Upgrade Gap Analysis

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Primary use: Verified gap inventory between the current implementation and the v1 target

## Purpose
This analysis compares the revised v1 design in `docs/Design`, the business and demo expectations in `docs/Business` and `docs/Demo`, and the current implementation across the apps and services. The goal is to identify the remaining deltas that matter for the upgrade plan, while correcting assumptions from earlier gap notes that are no longer accurate.

Related documents:
- [PhaseWiseImplementationPlan.md](./PhaseWiseImplementationPlan.md)
- [UpgradePlan/](UpgradePlan/) — Self-contained phase plans (Phase 1–5)
- [../Design/Architecture.md](../Design/Architecture.md)
- [../Design/EventCatalog.md](../Design/EventCatalog.md)
- [../Business/Requirements.md](../Business/Requirements.md)
- [../Test/TestingGuide.md](../Test/TestingGuide.md)
- [../Demo/DEMO_SETUP_GUIDE.md](../Demo/DEMO_SETUP_GUIDE.md)

## Executive Summary
The current implementation already delivers a meaningful multi-service prototype: gateway auth and RBAC, GPS ingest and history, emergency alerts, student presence processing, compliance, video, student management, a working admin dashboard, a working parent portal, and a driver app with offline buffering.

The platform is materially ahead of the earlier gap documentation in a few areas:
- Multi-tenant foundations are in place in the API gateway and downstream services via `school_id` filtering.
- The driver app already has an AsyncStorage-backed offline queue for GPS, emergency, and presence events.
- The emergency alerts service already exposes both WebSocket broadcast and an SSE stream.
- The admin dashboard already includes basic board and school listing views.

The main v1 gaps are now concentrated in end-to-end event consumption, parent-facing delivery, operational intelligence, and production hardening:
- Event-driven architecture is only partially implemented. Alerts and presence publish BullMQ jobs, but GPS does not publish `location.updated`, and there is no real notification consumer pipeline.
- Parent workflows remain incomplete. The parent app polls for alerts and live location, but there is no push delivery, no absence workflow, and no notification history.
- Driver presence is only partially complete in the mobile app. Presence API posting exists, but the roster flow still toggles local state and BLE scanning is not implemented in the app.
- Route optimization and geofencing remain mock or unimplemented.
- Enterprise controls such as row-level security, service-to-service auth, centralized audit pipelines, and retention workflows remain planned rather than delivered.

## Confirmed Current-State Capabilities

### Platform and Services
- API gateway provides JWT auth, RBAC, multi-tenancy guards, and proxy routes for GPS, alerts, presence, video, students, compliance, parent, and driver workflows.
- GPS tracking service persists live and historical route locations with `schoolId` filtering.
- Emergency alerts service persists alerts, pushes BullMQ jobs, broadcasts alerts over WebSocket, and exposes an SSE stream.
- Student presence service supports manual and SmartTag-style detection processing, persists events, updates Redis-backed state, and publishes BullMQ jobs.
- Video, student management, and compliance services are implemented and integrated through the gateway.

### Applications
- Admin dashboard is connected to live APIs and includes dashboard, alerts, routes, route planner, students, vehicles, videos, compliance, and basic boards and schools pages.
- Driver app supports auth, route selection, GPS tracking, panic events, and offline buffering.
- Parent app supports auth, child list, live location polling, and active alert polling.

## Gap Matrix

| Area | v1 Target | Current State | Gap Level | Notes |
| --- | --- | --- | --- | --- |
| Event bus | Domain events produced and consumed across services | Alerts and presence publish BullMQ jobs; GPS does not publish; consumers are largely placeholders | High | The architecture is producer-heavy and not yet end-to-end |
| Notifications | Dedicated notification flow for parents across alert and presence events | Notification logic is a stub inside emergency-alerts; no standalone notification service; no real push/SMS/email delivery | Critical | Blocks a major parent-facing value proposition |
| Parent real-time delivery | SSE or push-driven alert delivery and event updates | Alerts service has SSE, but parent app still polls and does not subscribe to SSE | High | Backend capability exists; frontend integration is missing |
| Driver presence workflow | Manual and BLE-backed attendance from the mobile app | Presence API client exists, but the roster screen still updates local state only; BLE scanning is absent in the app | High | Service is ahead of the mobile UI integration |
| GPS intelligence | `location.updated` events, route deviation detection, geofencing | GPS ingest/history exists only; no event publishing and no geospatial alerting | High | Phase 3 scope has not started in code |
| Route optimization | Real provider-backed route optimization and map rendering | Optimization service returns mocked ordering and placeholder polyline | Medium | Suitable for demo, not for production operations |
| Organization management | Board/school onboarding, CRUD, invitations, role provisioning | Basic board/school listing pages exist; add-school action is not wired; no invite/provisioning workflow | Medium | Earlier docs overstated the UI gap, but management workflows are still missing |
| OSTA and board views | Cross-board and board-level operational dashboards | Tenant data exists, but role-specific aggregated dashboards and filters are limited | Medium | Partial support only |
| Identity and account provisioning | Unified provisioning for parent, driver, and admin accounts | Login exists; invitation and lifecycle management do not | Medium | Important for real deployments and onboarding |
| Multi-tenant isolation | App-layer enforcement plus DB-layer RLS | Gateway and services filter by `school_id`; no PostgreSQL RLS policies | Medium | Adequate for prototype, below v1 enterprise target |
| Service-to-service security | Internal JWT or mTLS between services | Not implemented | Medium | Required before production hardening |
| Audit and compliance pipeline | Centralized audit trail for critical system mutations | Compliance service logs locally, but no cross-service centralized audit pipeline exists | Medium | Compliance observability remains fragmented |
| Data lifecycle and privacy | Retention, archival, deletion, and residency controls | Not implemented beyond basic storage choices | Medium | Business requirements call for privacy alignment |
| Parent absence reporting | Guardians report absences and impact routing/operations | Not implemented | Medium | Called out in business scope, absent from delivered workflows |

## Detailed Gap Analysis

### 1. Core Application Workflow Gaps

#### 1.1 Driver App
Confirmed implemented:
- Login, route selection, GPS tracking, panic alert submission, and offline queueing.
- Presence API client for `BOARD` and `ALIGHT` events with offline buffering support.

Confirmed gaps:
- The roster screen currently changes local student state and is not the definitive presence workflow.
- BLE and SmartTag scanning is not implemented in the app, despite service-side support for SmartTag detections.
- Vehicle and route execution state are still partly hardcoded or minimally modeled in the active route flow.
- Driver operational lifecycle events such as route start, stop progression, and richer driver status telemetry are not fully surfaced.

Impact:
- Manual safety workflows are inconsistent between UI and backend.
- The mobile app does not yet function as the reliable presence-capture device envisioned in v1.

#### 1.2 Parent App
Confirmed implemented:
- Login, child list retrieval, and live route tracking via polling.
- Active alert polling for a route.

Confirmed gaps:
- No push notifications for alert, boarding, alighting, delay, or route-completion events.
- No SSE client usage even though the alerts backend exposes an SSE stream.
- No absence reporting or parent-initiated exception workflow.
- No notification inbox or delivery-state visibility.

Impact:
- The parent experience remains observational rather than proactive.
- Safety communication objectives are only partially met.

#### 1.3 Admin Dashboard
Confirmed implemented:
- Pages for dashboard, alerts, routes, route planner, students, vehicles, videos, compliance, boards, and schools.
- Integration with gateway-backed APIs and live alert and presence channels.

Confirmed gaps:
- Route planning still uses mocked optimization output and placeholder polyline data.
- Boards and schools pages provide basic listing only, not full tenant administration.
- No invitation or user provisioning workflows for board admins, school admins, drivers, or parents.
- OSTA-wide and board-level cross-tenant operational views are limited.

Impact:
- The dashboard is viable for internal demos and operations monitoring.
- It is not yet a complete administration surface for multi-tenant onboarding and operations.

### 2. Platform and Service Gaps

#### 2.1 Event-Driven Architecture Is Partial, Not Complete
The v1 design assumes business events are first-class integration points. In practice:
- Emergency alerts publish BullMQ jobs.
- Presence events publish BullMQ jobs.
- GPS events are only written to the database.
- Presence queue processing is a placeholder and does not drive downstream actions.
- Notification fan-out is not implemented as a proper consuming service.

Impact:
- The system behaves like a mixed synchronous/prototype architecture rather than the event-first architecture described in v1.
- Downstream capabilities such as parent notifications, analytics, and geofencing cannot be added cleanly without finishing the event pipeline.

#### 2.2 GPS Intelligence and Geofencing
Confirmed implemented:
- GPS tracking service persists location points and supports live and history retrieval.

Impact:
- Fleet visibility exists, but operational intelligence is limited.
- Delay, deviation, and predictive workflows cannot be trusted yet.

Confirmed gaps:
- No `location.updated` event emission.
- No geofencing or route-deviation logic.
- No ETA engine or path adherence analytics.
- No provider-backed routing engine to replace mocked route optimization.

#### 2.3 Multi-Tenancy, Identity, and Provisioning
Confirmed implemented:
- Gateway role checks and tenant scoping.
- `school_id` filtering in downstream services.
- Board and school data model support in the platform.

Impact:
- Multi-tenant structure exists, but operational onboarding still depends on manual or seeded data flows.

Confirmed gaps:
- No invitation flow for creating and onboarding users.
- No unified lifecycle management for parent, driver, and admin accounts.
- No board-aware enforcement in downstream databases beyond application filtering.
- No database RLS policies.

Impact:
- Current controls are sufficient for a controlled demo, not for the full v1 operating model.

#### 2.4 Security, Audit, and Data Lifecycle
Confirmed implemented:
- JWT-based auth at the gateway.
- Compliance-specific audit logging.

Impact:
- The system does not yet satisfy the full non-functional direction implied by PIPEDA/MFIPPA alignment and enterprise multi-tenant deployment.

Confirmed gaps:
- No service-to-service authentication.
- No centralized audit pipeline across all services.
- No defined retention, archival, purge, or privacy-response workflows.
- No evidence of production observability standards such as centralized tracing and metrics.

## Demo and Documentation Alignment
The demo documentation assumes a more complete narrative than the current product actually supports. The key mismatches are:
- Parent notifications are still narrated as future or simulated behavior.
- Route optimization is demo-safe but still mocked.
- Board and school management are partially represented in UI but not fully operable.
- Presence support exists in backend and partially in mobile code, but the main mobile interaction model is not yet authoritative.

These mismatches do not invalidate the demo, but they should be treated as guided-demo limitations rather than production-complete workflows.

## Corrections to Earlier Gap Assumptions
- Admin dashboard does expose basic board and school pages; the gap is incomplete management workflow, not complete absence of UI.
- Emergency alerts SSE support exists in the backend; the gap is client adoption and broader parent delivery.
- Driver presence posting support exists in the mobile codebase; the gap is that the main roster flow is not fully wired to that path and BLE scanning is still missing.
- Offline buffering in the driver app is implemented and should move out of the “pending” category.

## Reclassified Items From Earlier Reports
The following items should no longer be reported as entirely missing:
- Driver offline resilience.
- Driver presence API integration layer.
- Admin board and school UI presence.
- Alerts SSE backend support.

The following remain genuinely incomplete and should stay in the active gap list:
- notification delivery,
- GPS event publication,
- BLE scanning in the driver app,
- geofencing and route deviation alerts,
- account provisioning and invitations,
- RLS, service-to-service auth, centralized audit, and retention controls.

## Recommended Upgrade Priorities
1. Complete the event-consumption and parent notification path.
2. Finish the driver presence workflow in the app, including roster-to-API wiring and BLE capture.
3. Add GPS event publication and geofencing/deviation logic.
4. Replace mocked route optimization with provider-backed mapping and route services.
5. Complete tenant administration, provisioning, and cross-tenant operational views.
6. Harden the platform with RLS, service-to-service auth, centralized audit, and retention controls.
