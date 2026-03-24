# SBTM v1 Upgrade Gap Analysis

## Purpose
This analysis compares the revised v1 design in `docs/Design/v1`, the business and demo expectations in `docs/Business` and `docs/Demo`, and the current implementation across the apps and services. The goal is to identify the remaining deltas that matter for the upgrade plan, while correcting assumptions from earlier gap notes that are no longer accurate.

Related documents:
- [FunctionalGapsReport.md](./FunctionalGapsReport.md)
- [PhaseWiseImplementationPlan.md](./PhaseWiseImplementationPlan.md)

## Executive Summary
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

### 1. Event-Driven Architecture Is Partial, Not Complete
The v1 design assumes business events are first-class integration points. In practice:
- Emergency alerts publish BullMQ jobs.
- Presence events publish BullMQ jobs.
- GPS events are only written to the database.
- Presence queue processing is a placeholder and does not drive downstream actions.
- Notification fan-out is not implemented as a proper consuming service.

Impact:
- The system behaves like a mixed synchronous/prototype architecture rather than the event-first architecture described in v1.
- Downstream capabilities such as parent notifications, analytics, and geofencing cannot be added cleanly without finishing the event pipeline.

### 2. Parent Experience Does Not Yet Meet v1 or Business Expectations
The parent portal supports basic tracking, but the highest-value safety workflows remain incomplete:
- No push notifications for alerts, boarding, alighting, or delays.
- No notification center or history.
- No absence reporting workflow.
- No SSE client wiring, even though the alerts service exposes an SSE stream.

Impact:
- The current parent experience is passive and polling-based.
- Business objectives around safety communication and proactive updates are only partially met.

### 3. Driver App Is Operational but Not Yet a Full Presence Device
The driver app has strong groundwork:
- Offline queue is implemented.
- GPS tracking is implemented.
- Emergency event posting is implemented.
- A presence API client exists.

However, the active mobile workflow is still incomplete:
- Roster interactions currently toggle local state rather than reliably invoking the presence API flow.
- BLE/SmartTag scanning is not implemented in the mobile app.
- Route-state updates and richer route execution telemetry are still limited.

Impact:
- The service layer supports presence better than the mobile workflow does.
- Demo and business expectations for boarding/alighting automation are only partially met.

### 4. Administrative Workflows Need to Move Beyond Basic Monitoring
The admin dashboard is beyond a stub, but still short of the revised target:
- Basic boards and schools pages already exist.
- Fleet, route, student, alert, compliance, and video views exist.
- Route planner remains backed by mocked optimization output.
- No invitation and provisioning flows exist for real onboarding.
- OSTA-wide and board-level operational rollups are limited.

Impact:
- Monitoring is workable for demo and internal development.
- True tenant administration and multi-level operational control remain incomplete.

### 5. Security and Compliance Are Prototype-Grade
Current controls are sufficient for controlled demos, not for the v1 operating model:
- Tenant isolation is implemented at the application layer, not the database layer.
- Service-to-service trust is not formally enforced.
- Audit logging is not centralized across services.
- Retention and deletion workflows are absent.

Impact:
- The system does not yet satisfy the full non-functional direction implied by PIPEDA/MFIPPA alignment and enterprise multi-tenant deployment.

## Corrections to Earlier Gap Assumptions
- Admin dashboard does expose basic board and school pages; the gap is incomplete management workflow, not complete absence of UI.
- Emergency alerts SSE support exists in the backend; the gap is client adoption and broader parent delivery.
- Driver presence posting support exists in the mobile codebase; the gap is that the main roster flow is not fully wired to that path and BLE scanning is still missing.
- Offline buffering in the driver app is implemented and should move out of the “pending” category.

## Recommended Upgrade Priorities
1. Complete the event-consumption and parent notification path.
2. Finish the driver presence workflow in the app, including roster-to-API wiring and BLE capture.
3. Add GPS event publication and geofencing/deviation logic.
4. Replace mocked route optimization with provider-backed mapping and route services.
5. Complete tenant administration, provisioning, and cross-tenant operational views.
6. Harden the platform with RLS, service-to-service auth, centralized audit, and retention controls.
