# SBTM Business Requirements (Current Scope)

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
- Organization, school, route, and vehicle management in the API gateway (basic multi-tenant core).
- Student management service with enrollment and bulk import.
- Compliance management service with inspections and audit logging.
- Admin dashboard web app (demo-ready, mock fallback when APIs are unavailable).
- Driver mobile app (Expo) with route selection, GPS updates, and panic button (mock auth).
- Parent web portal (Vite) with mock login and simulated live map.

## Planned / Not Yet Implemented
- End-to-end multi-tenant data isolation across all microservices.
- Board/school admin UX for organization management in the admin dashboard.
- Real map-based route optimization integrated with external map APIs.
- Geofencing, route deviation detection, and automated escalation.
- Real parent notifications (push/SMS/email) and absence reporting.
- Unified identity and provisioning for parent/driver/admin accounts across services.
- Production-grade audit logging and retention policies across all services.

## Non-Functional Requirements (Target)
- Data residency in Canada (PIPEDA/MFIPPA alignment).
- Encryption in transit (TLS) and at rest (AES-256 for DB/object storage).
- Role-based access control and least-privilege access.
- Observability: centralized logging, metrics, and tracing (planned).
- Availability: stateless services and horizontal scaling.
