# SBTM Business Requirements (Current Scope)

- Document owner: Product and Delivery
- Last reviewed: 2026-03-24
- Primary use: Business scope, expected outcomes, and non-functional targets

This document captures business scope and desired outcomes. For code-verified current implementation status, use `docs/Implementation/*`. For verified delivery gaps and sequencing, use `docs/prd/v1/UpgradePlan/GapAnalysis.md` and `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md`.

## Related Documents

- [UseCases.md](UseCases.md)
- [Features.md](Features.md)
- [UserJourney.md](UserJourney.md)
- [GapAnalysis.md](../prd/v1/UpgradePlan/GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](../prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md)
- [TestingGuide.md](../Test/TestingGuide.md)
- [DEMO_SETUP_GUIDE.md](../Demo/DEMO_SETUP_GUIDE.md)

## Objectives
- Provide real-time visibility into school bus location and status.
- Improve student safety with presence tracking and emergency response.
- Enable administrators to monitor fleet activity and incidents.
- Support a path to multi-tenant operations (OSTA -> boards -> schools).

## In-scope (Implemented)
- GPS tracking service for ingesting and querying route locations.
- Emergency alerts service with real-time admin notifications.
- Student presence service with BLE/manual events and route-level views.
- Video capture service with secure upload and access logging.
- API gateway with JWT auth, RBAC, and proxy routing to services.
- Organization, school, route, and vehicle management in the API gateway (multi-tenant core).
- Tenant-aware filtering across services using `school_id`.
- Student management service with enrollment and bulk import.
- Compliance management service with inspections and audit logging.
- Admin dashboard web app with gateway-backed data.
- Driver mobile app (Expo) with gateway auth, schedule, GPS updates, and panic button.
- Parent web portal (Vite) with gateway auth and live location polling.

## In-scope (Partially Implemented)
- Parent safety communication loop: alerts service SSE exists, but parent-facing push delivery, notification history, and absence workflows are not complete.
- Driver presence workflow: presence services and API clients exist, but the main roster UX is not yet the authoritative backend-backed flow and BLE capture is not complete in the app.
- Organization management: board and school models, APIs, and basic listing views exist, but onboarding, invitations, and lifecycle workflows are not complete.
- Route planning intelligence: route CRUD exists, but optimization output and map geometry remain placeholder quality.

## Planned / Not Yet Implemented
- End-to-end notification delivery with provider-backed push, SMS, or email fan-out.
- Parent-facing notification inbox, delivery-state visibility, and absence reporting.
- GPS event publication, geofencing, route deviation detection, and ETA or path-intelligence workflows.
- Real map-based route optimization integrated with external map APIs.
- Invitation-based identity lifecycle and provisioning for parent, driver, school-admin, and board-admin accounts.
- Database-level tenant hardening, service-to-service trust, centralized audit pipelines, and data-retention controls.

## Non-Functional Requirements (Target)
- Data residency in Canada (PIPEDA/MFIPPA alignment).
- Encryption in transit (TLS) and at rest (AES-256 for DB/object storage).
- Role-based access control and least-privilege access.
- Observability: centralized logging, metrics, and tracing (planned).
- Availability: stateless services and horizontal scaling.
