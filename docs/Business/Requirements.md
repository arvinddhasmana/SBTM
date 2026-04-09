# SBTM Requirements Catalog

- Document owner: Product and Delivery
- Last reviewed: 2026-03-24
- Primary use: Traceable business, privacy, operational, and non-functional requirements for the platform

This document defines the requirements baseline for SBTM using stable identifiers. It is the business source of truth for what the platform must do and what quality constraints it must satisfy. For code-verified current implementation status, use `docs/Implementation/*`. For prioritized delivery gaps, use `docs/prd/GapAnalysis.md` and `docs/prd/PhaseWiseImplementationPlan.md`.

## Related Documents

- [Features.md](Features.md)
- [UseCases.md](UseCases.md)
- [UserJourney.md](UserJourney.md)
- [../Design/Architecture.md](../Design/Architecture.md)
- [../Design/SystemArchitecture.md](../Design/SystemArchitecture.md)
- [../Design/SecurityPrivacyArchitecture.md](../Design/SecurityPrivacyArchitecture.md)
- [../prd/GapAnalysis.md](../prd/GapAnalysis.md)
- [../prd/PhaseWiseImplementationPlan.md](../prd/PhaseWiseImplementationPlan.md)
- [../prd/v4/GapAnalysis.md](../prd/v4/GapAnalysis.md) (v4 Business Gap Analysis)
- [../prd/v4/RolesAndWorkflows.md](../prd/v4/RolesAndWorkflows.md) (v4 Roles and Workflows)
- [../prd/v4/AlertStrategy.md](../prd/v4/AlertStrategy.md) (v4 Alert Strategy)
- [../prd/v4/IntegrationAndMigration.md](../prd/v4/IntegrationAndMigration.md) (v4 Integration)
- [../prd/v4/UpgradePlan.md](../prd/v4/UpgradePlan.md) (v4 Upgrade Plan)

## Requirement Model

- `FR-*` = Functional requirements
- `NFR-*` = Non-functional requirements
- `PR-*` = Privacy and data-handling requirements
- `SR-*` = Security requirements
- `OPS-*` = Operational requirements

## Business Objectives

- Provide real-time visibility into school bus location and operational status.
- Improve student safety through presence tracking, emergency workflows, and auditable operational controls.
- Enable administrators to manage routes, vehicles, compliance, and incidents across multiple tenant levels.
- Support a path from prototype-grade deployment to privacy-aware, production-capable multi-tenant operations.
- Deliver proactive parent communication for child boarding/alighting, emergencies, and route changes with multi-channel notification delivery (push, email, SMS).
- Support cross-organization coordination workflows between OSTA, school boards, schools, drivers, and parents with appropriate approval chains and audit trails.
- Integrate with existing school Student Information Systems (SIS) and OSTA fleet databases to eliminate duplicate data entry and support bulk data migration from legacy systems.

## Functional Requirements

| ID                | Requirement                                                                                                                                                   | Priority | Related Features                    | Related Use Cases                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- | -------------------------------------------- |
| FR-IDENT-001      | The platform shall authenticate Admin, Driver, and Parent users through a centralized gateway.                                                                | Must     | FEAT-IDENTITY-001                   | UC-LOGIN-001                                 |
| FR-IDENT-002      | The platform shall enforce role-based access control for OSTA, board, school, driver, and parent personas.                                                    | Must     | FEAT-IDENTITY-001, FEAT-TENANCY-001 | UC-LOGIN-001, UC-ONBOARD-001                 |
| FR-TENANT-001     | The platform shall associate operational data with a tenant boundary using school and, where applicable, board scope.                                         | Must     | FEAT-TENANCY-001                    | UC-ONBOARD-001, UC-MONITOR-001               |
| FR-GPS-001        | The platform shall ingest live vehicle location updates and expose live and historical tracking views.                                                        | Must     | FEAT-TRACKING-001                   | UC-DRIVER-001, UC-PARENT-001, UC-MONITOR-001 |
| FR-ALERT-001      | The platform shall allow drivers or downstream logic to create emergency alerts tied to a route and vehicle context.                                          | Must     | FEAT-ALERTS-001                     | UC-DRIVER-001, UC-INCIDENT-001               |
| FR-ALERT-002      | The platform shall deliver operational alert visibility to administrators in near real time.                                                                  | Must     | FEAT-ALERTS-001                     | UC-MONITOR-001, UC-INCIDENT-001              |
| FR-PRESENCE-001   | The platform shall record student boarding and alighting events through manual or device-assisted workflows.                                                  | Must     | FEAT-PRESENCE-001                   | UC-PRESENCE-001, UC-DRIVER-001               |
| FR-PRESENCE-002   | The platform shall associate presence events with the relevant student, route, vehicle, and school context.                                                   | Must     | FEAT-PRESENCE-001                   | UC-PRESENCE-001                              |
| FR-PARENT-001     | The platform shall allow parents to view their linked children and the live bus context relevant to those children.                                           | Must     | FEAT-PARENT-001                     | UC-PARENT-001                                |
| FR-PARENT-002     | The platform shall support parent-facing safety communications for alert and presence events.                                                                 | Must     | FEAT-NOTIFY-001                     | UC-PARENT-001, UC-INCIDENT-001               |
| FR-STUDENT-001    | The platform shall manage student enrollment records and route assignments.                                                                                   | Must     | FEAT-STUDENT-001                    | UC-ONBOARD-001, UC-PRESENCE-001              |
| FR-COMPLIANCE-001 | The platform shall store driver compliance records, vehicle inspections, and audit logs.                                                                      | Must     | FEAT-COMPLIANCE-001                 | UC-COMPLIANCE-001                            |
| FR-ROUTE-001      | The platform shall support route, stop, and vehicle management for school transport operations.                                                               | Must     | FEAT-ROUTE-001                      | UC-ROUTE-001, UC-MONITOR-001                 |
| FR-ROUTE-002      | The platform shall support route planning and optimization workflows, with provider-backed mapping targeted beyond the current prototype level.               | Should   | FEAT-ROUTE-002                      | UC-ROUTE-001                                 |
| FR-VIDEO-001      | The platform shall store video event metadata and enable admin access to relevant incident recordings.                                                        | Should   | FEAT-VIDEO-001                      | UC-INCIDENT-001                              |
| FR-ONBOARD-001    | The platform shall support tenant onboarding workflows for boards, schools, and role-scoped operational users.                                                | Should   | FEAT-TENANCY-002                    | UC-ONBOARD-001                               |
| FR-PARENT-003     | The platform should support absence reporting and parent-visible notification history.                                                                        | Should   | FEAT-PARENT-002, FEAT-NOTIFY-001    | UC-PARENT-001                                |
| FR-ALERT-003      | The platform shall classify alerts by tier (Safety, Operational, Informational) and route them to the appropriate audience with tier-specific delivery rules. | Must     | FEAT-ALERTS-001, FEAT-NOTIFY-001    | UC-INCIDENT-001, UC-PARENT-001               |
| FR-ALERT-004      | Safety-tier emergency alerts shall require School Admin confirmation before parent notification, with configurable timeout-based auto-escalation.             | Must     | FEAT-ALERTS-001                     | UC-INCIDENT-001                              |
| FR-ALERT-005      | Unacknowledged alerts shall escalate through the admin hierarchy (School -> Board -> OSTA) on configurable timelines.                                         | Should   | FEAT-ALERTS-001                     | UC-INCIDENT-001                              |
| FR-PRESENCE-003   | The platform shall send push notifications to parents when their child boards or alights the bus.                                                             | Must     | FEAT-PRESENCE-001, FEAT-NOTIFY-001  | UC-PRESENCE-001, UC-PARENT-001               |
| FR-WORKFLOW-001   | The platform shall support fleet assignment workflow with OSTA proposal, school confirmation, and audit trail.                                                | Should   | FEAT-ROUTE-001, FEAT-TENANCY-002    | UC-ROUTE-001, UC-ONBOARD-001                 |
| FR-WORKFLOW-002   | The platform shall notify affected parents before route changes take effect, with configurable lead time.                                                     | Should   | FEAT-ROUTE-001, FEAT-NOTIFY-001     | UC-ROUTE-001, UC-PARENT-001                  |
| FR-WORKFLOW-003   | The platform shall enforce pre-trip vehicle inspection completion before route start.                                                                         | Should   | FEAT-COMPLIANCE-001                 | UC-DRIVER-001, UC-COMPLIANCE-001             |
| FR-INT-001        | The platform shall support batch import of student data from school SIS exports (CSV/XML) with field mapping and conflict resolution.                         | Should   | FEAT-STUDENT-001, FEAT-TENANCY-002  | UC-ONBOARD-001                               |
| FR-INT-002        | The platform shall support synchronization of fleet data from OSTA existing fleet management system.                                                          | Should   | FEAT-ROUTE-001                      | UC-ROUTE-001                                 |
| FR-INT-003        | The platform shall support bulk route import from Excel/CSV with geocoding, OSRM polyline generation, and map preview.                                        | Should   | FEAT-ROUTE-001, FEAT-ROUTE-002      | UC-ROUTE-001                                 |
| FR-INT-004        | The platform shall support data export (CSV, PDF) for students, routes, compliance, alerts, and audit records.                                                | Should   | FEAT-COMPLIANCE-001                 | UC-COMPLIANCE-001, UC-MONITOR-001            |
| FR-ROLE-001       | The platform shall support a Super Admin role for initial system setup and platform maintenance.                                                              | Should   | FEAT-IDENTITY-001, FEAT-TENANCY-002 | UC-ONBOARD-001                               |
| FR-ROLE-002       | Board Admin shall be able to create, modify, and deactivate schools within their board scope.                                                                 | Should   | FEAT-TENANCY-002                    | UC-ONBOARD-001                               |
| FR-CALENDAR-001   | The platform should support academic calendar management (holidays, PA days) with automatic route schedule awareness.                                         | Should   | FEAT-ROUTE-001                      | UC-ROUTE-001, UC-MONITOR-001                 |

## Security Requirements

| ID           | Requirement                                                                                                 | Priority | Related Architecture                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| SR-AUTH-001  | All protected application routes shall require authenticated access through the API gateway.                | Must     | Gateway, System Architecture                                |
| SR-RBAC-001  | Authorization decisions shall be role-aware and tenant-aware.                                               | Must     | Gateway, Security and Privacy Architecture                  |
| SR-SVC-001   | Internal service calls should move toward authenticated service-to-service trust before production rollout. | Should   | Integration Architecture, Security and Privacy Architecture |
| SR-INPUT-001 | Public-facing service endpoints shall validate inputs and reject unexpected fields.                         | Must     | Service boundaries, Operations                              |
| SR-AUDIT-001 | Security-relevant and operationally sensitive actions should be attributable through audit records.         | Should   | Compliance Service, Observability, Runbooks                 |

## Privacy Requirements

| ID               | Requirement                                                                                                                                        | Priority | Related Use Cases                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| PR-RESIDENCY-001 | Student and operational data should remain deployable within Canadian hosting boundaries to support PIPEDA and MFIPPA alignment.                   | Should   | UC-ONBOARD-001, UC-MONITOR-001   |
| PR-MINIMIZE-001  | Student-facing workflows shall collect only the operational data needed for transport safety and service delivery.                                 | Must     | UC-PRESENCE-001, UC-PARENT-001   |
| PR-TENANT-001    | Tenant boundaries shall be preserved in storage, processing, and operational access patterns.                                                      | Must     | UC-ONBOARD-001, UC-MONITOR-001   |
| PR-RETENTION-001 | The platform should implement documented retention, archival, and deletion workflows for regulated data.                                           | Should   | UC-COMPLIANCE-001, UC-PARENT-001 |
| PR-CONSENT-001   | Parent-facing communications and child-tracking workflows should respect consent and notification expectations defined by operating organizations. | Should   | UC-PARENT-001                    |

## Non-Functional Requirements

| ID            | Requirement                                                                                                           | Target                                                  | Related Architecture                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| NFR-AVAIL-001 | Services should remain horizontally scalable and stateless where practical.                                           | Prototype target with scale-out path                    | Deployment Architecture                       |
| NFR-PERF-001  | Live GPS visibility should update within a few seconds under normal operating conditions.                             | Target: within 3 seconds end to end                     | Integration Architecture                      |
| NFR-PERF-002  | Critical alert delivery should reach the first operational consumer quickly enough to support intervention workflows. | Target: within 10 seconds to first parent/admin channel | Integration Architecture, Observability       |
| NFR-OBS-001   | The platform should emit logs, metrics, and traces sufficient to diagnose cross-service issues.                       | Required before production hardening                    | Observability, Operations                     |
| NFR-RESIL-001 | The driver workflow should tolerate intermittent connectivity through offline buffering and retry behavior.           | Required for field use                                  | System Architecture, Integration Architecture |
| NFR-DATA-001  | Storage layers should support encryption in transit and at rest.                                                      | TLS and encrypted backing services                      | Security and Privacy Architecture             |

## Operational Requirements

| ID             | Requirement                                                                                                           | Priority | Related Operations Docs         |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| OPS-DEPLOY-001 | The platform shall be runnable in a documented local multi-service environment.                                       | Must     | DeploymentGuide.md              |
| OPS-DEPLOY-002 | The platform should define a production-oriented deployment topology and secret-management approach.                  | Should   | DeploymentGuide.md              |
| OPS-RUN-001    | Operators should have documented procedures for incident response, service restart, and degraded dependency handling. | Should   | Runbooks.md, Troubleshooting.md |
| OPS-BACKUP-001 | The platform should define database backup and restore procedures before production rollout.                          | Should   | Runbooks.md                     |
| OPS-MON-001    | Operations should track queue depth, service health, error rate, and critical workflow latency.                       | Should   | Observability.md                |

## Requirement Traceability Matrix

| Requirement Group    | Primary Features                                                      | Primary Use Cases                                               | Primary Services                                   |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Identity and tenancy | FEAT-IDENTITY-001, FEAT-TENANCY-001, FEAT-TENANCY-002                 | UC-LOGIN-001, UC-ONBOARD-001                                    | API Gateway                                        |
| Live operations      | FEAT-TRACKING-001, FEAT-ALERTS-001, FEAT-PRESENCE-001                 | UC-DRIVER-001, UC-MONITOR-001, UC-INCIDENT-001, UC-PRESENCE-001 | GPS Tracking, Emergency Alerts, Student Presence   |
| Parent experience    | FEAT-PARENT-001, FEAT-PARENT-002, FEAT-NOTIFY-001                     | UC-PARENT-001, UC-INCIDENT-001                                  | API Gateway, Parent App, Emergency Alerts          |
| Administration       | FEAT-ROUTE-001, FEAT-ROUTE-002, FEAT-STUDENT-001, FEAT-COMPLIANCE-001 | UC-ROUTE-001, UC-COMPLIANCE-001, UC-MONITOR-001                 | API Gateway, Student Management, Compliance        |
| Privacy and security | FEAT-TENANCY-001, FEAT-COMPLIANCE-001                                 | UC-ONBOARD-001, UC-COMPLIANCE-001                               | API Gateway, Compliance, all tenant-aware services |

## Current Delivery Notes

- The current implementation already satisfies major parts of identity, tracking, alerting, student management, compliance, and admin monitoring at prototype level.
- Parent delivery, BLE-backed end-to-end presence capture, provider-backed route intelligence, and deeper hardening remain partial or planned.
- The requirement set intentionally distinguishes current delivery from target-state obligations so documentation does not overstate implementation completeness.

## v4 Additions Summary

The v4 gap analysis (see [docs/prd/v4/GapAnalysis.md](../prd/v4/GapAnalysis.md)) identified 31 business functionality gaps across 6 categories:

- **Role Definition and Responsibility Boundaries** (6 gaps): Super Admin role, fleet assignment workflow, Board Admin school management, School Admin completeness, Driver workflow enforcement, Parent communication features.
- **Workflow and Coordination** (7 gaps): Approval workflows for fleet/routes, student transfer, seasonal planning, emergency confirmation, hybrid paper-digital support, compliance review actions.
- **Alert System and Communication** (6 gaps): Alert classification by tier, presence-to-parent notifications, admin confirmation before parent delivery, multi-channel notification, parent preferences, escalation chain.
- **Integration and Data Migration** (6 gaps): SIS integration, OSTA fleet sync, bulk route import, data export, parent auto-provisioning, address geocoding.
- **Compliance and Governance** (5 gaps): Cross-role compliance visibility, workflow decision audit, incident reports, pre-trip enforcement, consent management.
- **Operational Readiness** (4 gaps): Setup wizard, tenant provisioning workflow, academic calendar, route scheduling.

New functional requirements (FR-ALERT-003 through FR-CALENDAR-001) were added to this catalog to cover these gaps. The v4 upgrade plan sequences delivery across 6 phases (A through F) from parent safety communication through production hardening.
