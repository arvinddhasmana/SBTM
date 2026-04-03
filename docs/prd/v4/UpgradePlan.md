# SBTM v4 Upgrade Plan

- Document owner: Product and Architecture
- Last reviewed: 2026-04-02
- Scope: Phased delivery plan from current state to production-ready system
- Audience: AI Agents, Product Managers, Architects, Project Managers, Development Team

## Related Documents

- [Gap Analysis](./GapAnalysis.md)
- [Roles and Workflows](./RolesAndWorkflows.md)
- [Alert Strategy](./AlertStrategy.md)
- [Integration and Migration](./IntegrationAndMigration.md)
- [Production Rollout Guide](./ProductionRolloutGuide.md)
- [Previous Upgrade Plans](../v1/PhaseWiseImplementationPlan.md)

---

## Upgrade Philosophy

Each phase is independently demonstrable and delivers business value. The plan sequences work so that critical safety features (parent notification) land first, followed by operational workflows, then integration and scale.

Phases build on each other but each produces a usable increment.

---

## Phase Overview

| Phase       | Name                                    | Business Value                                                                                               | Duration Target | Dependencies |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------- | ------------ |
| **Phase A** | Parent Safety Communication             | Parents receive real-time safety alerts and presence notifications                                           | 4-6 weeks       | None         |
| **Phase B** | Alert Governance and Confirmation       | Emergency alerts are classified, confirmed by admins before parent delivery, and escalated if unacknowledged | 3-4 weeks       | Phase A      |
| **Phase C** | Role Boundary Enforcement and Workflows | All roles operate within correct boundaries with coordination workflows for fleet and route management       | 4-5 weeks       | Phase A      |
| **Phase D** | External System Integration             | Student data from SIS, fleet from OSTA, bulk route import from Excel                                         | 5-6 weeks       | Phase C      |
| **Phase E** | Operational Maturity                    | Compliance workflows, reporting, calendar management, pre-trip enforcement                                   | 3-4 weeks       | Phase C      |
| **Phase F** | Production Deployment and Hardening     | Production infrastructure, monitoring, backup, first-time setup wizard                                       | 3-4 weeks       | All above    |

---

## Phase A: Parent Safety Communication

### Business Objective

Parents can receive push notifications when their child boards or alights the bus, and are immediately informed of confirmed emergency events.

### Deliverables

| ID  | Deliverable                                                               | Addresses Gap               |
| --- | ------------------------------------------------------------------------- | --------------------------- |
| A.1 | Notification Router service component                                     | GAP-ALERT-004               |
| A.2 | FCM push notification integration                                         | GAP-ALERT-004               |
| A.3 | Presence-to-notification pipeline (child boarded/alighted -> parent push) | GAP-ALERT-002               |
| A.4 | Emergency alert delivery to parents via push + SMS                        | GAP-ROLE-006, GAP-ALERT-004 |
| A.5 | Parent notification preference UI and persistence                         | GAP-ALERT-005               |
| A.6 | Email integration for non-urgent notifications                            | GAP-ALERT-004               |
| A.7 | SMS integration for emergency escalation                                  | GAP-ALERT-004               |

### Acceptance Criteria

- When a driver marks a student as boarded, the student's parent receives a push notification within 10 seconds
- When a driver marks a student as alighted, the student's parent receives a push notification within 10 seconds
- When an emergency alert is created, all parents on the affected route receive push + SMS within the configured timeline
- Parent can configure notification preferences (which events, which channels)
- Emergency notifications cannot be disabled by parents
- Notification delivery is logged with status (SENT/DELIVERED/FAILED)

### C4 Component Diagram: Phase A Additions

```
[C4 Component]
title: Phase A - Notification Pipeline

Component(presence, "Presence Service", "Existing", "Board/alight events")
Component(alerts, "Alert Service", "Existing", "Emergency alerts")

Component_New(notif_router, "Notification Router", "NEW", "Routes events to correct channel")
Component_New(fcm_adapter, "FCM Adapter", "NEW", "Firebase Cloud Messaging")
Component_New(email_adapter, "Email Adapter", "NEW", "AWS SES / SMTP")
Component_New(sms_adapter, "SMS Adapter", "NEW", "Twilio / AWS SNS")

Component(parent_app, "Parent App", "Existing", "Updated with preference UI")

presence --> notif_router : "CHILD_BOARDED, CHILD_ALIGHTED"
alerts --> notif_router : "EMERGENCY events"
notif_router --> fcm_adapter : "Push notifications"
notif_router --> email_adapter : "Email delivery"
notif_router --> sms_adapter : "SMS delivery"
notif_router --> parent_app : "In-app via SSE (existing)"
```

---

## Phase B: Alert Governance and Confirmation

### Business Objective

Emergency alerts follow a governed process: classified by tier, confirmed by School Admin before parent delivery, and escalated through the admin hierarchy if unacknowledged.

### Deliverables

| ID  | Deliverable                                                                | Addresses Gap |
| --- | -------------------------------------------------------------------------- | ------------- |
| B.1 | Alert classifier component (Tier 1/2/3)                                    | GAP-ALERT-001 |
| B.2 | Confirmation engine with timeout-based auto-escalation                     | GAP-WF-005    |
| B.3 | Admin confirmation UI (modal with confirm/false-alarm/request-info)        | GAP-WF-005    |
| B.4 | Escalation chain (School -> Board -> OSTA) with configurable timing        | GAP-ALERT-006 |
| B.5 | Operational alerts (Tier 2) dashboard for admin-only events                | GAP-ALERT-001 |
| B.6 | Alert lifecycle audit trail (CREATED -> CONFIRMED -> NOTIFIED -> RESOLVED) | GAP-GOV-002   |

### Acceptance Criteria

- Tier 1 alerts (PANIC, MEDICAL, INCIDENT) require School Admin confirmation before parent delivery
- If School Admin does not confirm within 2 minutes, alert auto-escalates to parents
- Unacknowledged alerts escalate: 5 min -> Board Admin, 15 min -> OSTA Admin
- Tier 2 alerts (LATE_DEPARTURE, COMPLIANCE) only visible to admins
- Tier 3 events (boarding/alighting) bypass confirmation and go directly to parents
- Full audit trail for every alert state transition

---

## Phase C: Role Boundary Enforcement and Workflows

### Business Objective

Each role operates within its defined responsibility boundary. Cross-role coordination is supported through in-system workflows for fleet assignment, route changes, and student transfers.

### Deliverables

| ID  | Deliverable                                                                         | Addresses Gap            |
| --- | ----------------------------------------------------------------------------------- | ------------------------ |
| C.1 | Super Admin role for system bootstrap and maintenance                               | GAP-ROLE-001             |
| C.2 | Board Admin school management (create/modify/deactivate schools)                    | GAP-ROLE-003             |
| C.3 | School Admin full student management (enroll/edit/withdraw) in UI                   | GAP-ROLE-004             |
| C.4 | Fleet assignment workflow (OSTA proposes -> School confirms)                        | GAP-ROLE-002, GAP-WF-001 |
| C.5 | Route change notification workflow (changes -> affected parents notified)           | GAP-WF-002               |
| C.6 | Absence confirmation workflow (parent reports -> driver roster updated)             | GAP-ROLE-006             |
| C.7 | Admin dashboard role-based view filtering (sidebar and page content adapts to role) | GAP-ROLE-004             |
| C.8 | Document generation for printable agreements (PDF export)                           | GAP-WF-006               |

### Acceptance Criteria

- Board Admin can create, modify, and deactivate schools within their board
- Board Admin cannot access schools in other boards
- School Admin can enroll, edit, and withdraw students through the UI (not just API)
- OSTA Admin can propose vehicle-to-route assignment; School Admin must confirm
- When a route is modified, parents of affected students are notified before the change date
- When a parent reports absence, the driver's roster shows the student as absent
- Admin dashboard sidebar shows only pages relevant to the user's role
- Fleet assignment generates a printable PDF agreement

---

## Phase D: External System Integration

### Business Objective

The system integrates with existing school and OSTA data sources to eliminate duplicate data entry and enable bulk migration of legacy data.

### Deliverables

| ID  | Deliverable                                                                        | Addresses Gap |
| --- | ---------------------------------------------------------------------------------- | ------------- |
| D.1 | SIS batch file sync adapter (CSV/XML import from SIS)                              | GAP-INT-001   |
| D.2 | Board-specific field mapping configuration                                         | GAP-INT-001   |
| D.3 | Student sync preview and approval workflow                                         | GAP-INT-001   |
| D.4 | OSTA fleet database sync adapter                                                   | GAP-INT-002   |
| D.5 | Excel/CSV route import wizard (upload -> validate -> geocode -> preview -> commit) | GAP-INT-003   |
| D.6 | Address geocoding service integration (Nominatim or Google)                        | GAP-INT-006   |
| D.7 | Parent auto-provisioning from SIS contact data                                     | GAP-INT-005   |
| D.8 | Data export capabilities (CSV/PDF for students, routes, compliance, alerts)        | GAP-INT-004   |

### Acceptance Criteria

- School Admin can upload SIS export file and preview student changes before committing
- OSTA Admin can trigger fleet sync and see newly available vehicles
- School Admin can upload Excel with 100+ routes and import them in batch with OSRM polylines
- Stop creation via address search with geocoding (no manual coordinates)
- Parent accounts auto-created from SIS parent contact data with email invitation
- Admin can export student list, route plan, compliance summary as CSV or PDF

---

## Phase E: Operational Maturity

### Business Objective

The system supports complete daily operational workflows including pre-trip enforcement, compliance management, reporting, and calendar awareness.

### Deliverables

| ID  | Deliverable                                                           | Addresses Gap |
| --- | --------------------------------------------------------------------- | ------------- |
| E.1 | Pre-trip inspection enforcement (must pass before route start)        | GAP-GOV-004   |
| E.2 | Compliance visibility across role hierarchy (school -> board -> OSTA) | GAP-GOV-001   |
| E.3 | Compliance expiry alerts and remediation workflow                     | GAP-WF-007    |
| E.4 | Incident report generation (auto-filled from alert data, exportable)  | GAP-GOV-003   |
| E.5 | Academic calendar management (holidays, PA days)                      | GAP-OPS-003   |
| E.6 | Route schedule windows with late-departure detection                  | GAP-OPS-004   |
| E.7 | Parent consent management (collect, store, withdrawal workflow)       | GAP-GOV-005   |
| E.8 | Scheduled reports (daily/weekly/monthly) via email                    | GAP-INT-004   |

### Acceptance Criteria

- Driver cannot start route without passing pre-trip inspection
- Failed inspection blocks route and alerts School Admin
- Board Admin sees compliance status for all schools in their board
- Expired compliance triggers automatic notification to School Admin and Board Admin
- Incident report can be generated from resolved alert, exported as PDF
- Routes marked as inactive on holidays (no unnecessary alerts or tracking)
- Parents present consent during onboarding; consent record stored with timestamp
- School Admin receives daily operation summary email

---

## Phase F: Production Deployment and Hardening

### Business Objective

The system is ready for production deployment with proper infrastructure, monitoring, backup, and guided first-time setup.

### Deliverables

| ID   | Deliverable                                                                   | Addresses Gap  |
| ---- | ----------------------------------------------------------------------------- | -------------- |
| F.1  | First-time setup wizard (Super Admin creates OSTA Admin, configures boards)   | GAP-OPS-001    |
| F.2  | Guided tenant provisioning workflow (new board/school setup)                  | GAP-OPS-002    |
| F.3  | Production infrastructure configuration (to be documented, not scripted here) | OPS-DEPLOY-002 |
| F.4  | Database backup and restore procedures                                        | OPS-BACKUP-001 |
| F.5  | Monitoring and alerting for system health                                     | OPS-MON-001    |
| F.6  | Rate limiting activation on public endpoints                                  | SR-INPUT-001   |
| F.7  | Service-to-service authentication enforcement                                 | SR-SVC-001     |
| F.8  | Secret management (vault or cloud KMS)                                        | Security       |
| F.9  | Production deployment runbook                                                 | OPS-RUN-001    |
| F.10 | Feature-version upgrade procedure and rollback plan                           | OPS-RUN-001    |

### Acceptance Criteria

- Fresh deployment can be bootstrapped through UI wizard without database scripts
- Production environment has automated daily backups with tested restore procedure
- System health dashboard monitors: service uptime, API latency, queue depth, error rate
- Public API endpoints are rate-limited (100 req/min per user, configurable)
- All service-to-service calls use authenticated internal JWT
- Secrets are stored in vault, not in environment variables
- Documented upgrade procedure with step-by-step rollback plan

---

## Phase Dependencies

```mermaid
flowchart TD
    A[Phase A\nParent Safety Communication]
    B[Phase B\nAlert Governance]
    C[Phase C\nRole Boundaries & Workflows]
    D[Phase D\nExternal Integration]
    E[Phase E\nOperational Maturity]
    F[Phase F\nProduction Hardening]

    A --> B
    A --> C
    C --> D
    C --> E
    A --> F
    B --> F
    C --> F
    D --> F
    E --> F

    style A fill:#ff9999
    style B fill:#ffcc99
    style C fill:#ffcc99
    style D fill:#99ccff
    style E fill:#99ccff
    style F fill:#99ff99
```

---

## Risk Assessment

| Risk                                                          | Likelihood | Impact | Mitigation                                                                                               |
| ------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------- |
| SIS integration delayed by board IT availability              | High       | Medium | Start with CSV batch import; API sync is Phase D enhancement                                             |
| Push notification delivery inconsistency                      | Medium     | High   | Implement fallback chain (push -> SMS -> email). Monitor delivery rates.                                 |
| Legacy route data quality is poor                             | High       | Medium | Route import wizard includes validation and map preview. Admin can correct before commit.                |
| Parent adoption rate is low                                   | Medium     | High   | Simple onboarding flow. Email invitation with one-click setup. Consider SMS invitation as alternative.   |
| Alert confirmation timeout causes delayed parent notification | Low        | High   | 2-minute timeout is short enough for safety. Auto-escalation ensures delivery even without admin action. |
| OSTA fleet DB access is restricted                            | Medium     | Medium | Manual fleet entry fallback remains available. Sync is an enhancement, not a dependency.                 |
| Privacy concern with geocoding external service               | Low        | High   | Default to self-hosted Nominatim. External geocoder only with privacy assessment approval.               |
