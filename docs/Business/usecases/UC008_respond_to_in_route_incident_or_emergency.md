<!-- CLASSIFICATION: INTERNAL -->

# UC008 — Respond to an In-Route Incident or Emergency

> **Use Case ID**: UC-INCIDENT-001
> **Feature**: FEAT-ALERTS-001, FEAT-VIDEO-001, FEAT-NOTIFY-001
> **Priority**: MUST
> **Actors**: Driver, Admin, Parent, School Operator
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

An in-route incident occurs and the platform must capture the event, expose it to operational users, and support the follow-up workflow that protects students and informs the right stakeholders.

## 2. Preconditions

- The affected route and vehicle context are known.
- The driver or admin user can access the emergency workflow.
- Alerting services are available.

## 3. Triggers

- A driver presses a panic or emergency control.
- An admin or operational workflow records an emergency or incident condition.

## 4. Main Flow

1. The incident is initiated from the driver or operational workflow.
2. The platform persists the emergency alert.
3. The alert becomes visible to admin-facing operational users.
4. Supporting context such as location, route, and vehicle information is made available.
5. Related parent communications are sent where the workflow supports it.
6. Investigation and follow-up actions proceed, potentially including audit or video review.

## 5. Alternative Flows

### 5a. Parent Delivery Incomplete

- The alert is fully visible to admins.
- Parent delivery is delayed, partial, or absent depending on the current environment.

### 5b. Related Video Workflow Available

- Video metadata is recorded and later used during review.

### 5c. Service Degradation During Incident

- The alert is stored, but live dissemination or downstream follow-up is reduced.
- Operators fall back to manual coordination.

## 6. Postconditions

- The incident is recorded with route and vehicle context.
- Operational users can review and act on the incident.
- Supporting evidence and follow-up workflows can continue.

## 7. Business Rules and Constraints

- Emergency workflows are safety-critical and should avoid ambiguity.
- Parent communications should be accurate and route-specific.
- Auditability matters for both support and compliance follow-up.

## 8. Current-State Notes

- Emergency alert creation exists.
- Admin-facing visibility exists.
- Parent delivery remains incomplete end to end.
- Video review support exists at metadata level, but playback and broader incident workflows remain partial.

## 9. v4 Enhancements (Planned)

- **Alert classification by tier** — Alerts classified as Tier 1 (Safety: admin + parent), Tier 2 (Operational: admin only), Tier 3 (Informational: parent only). See [v4 Alert Strategy](../../prd/v4/AlertStrategy.md), GAP-ALERT-001.
- **School Admin confirmation before parent delivery** — Tier 1 alerts require School Admin confirmation within 2 minutes. If unconfirmed, auto-escalate to parents. See [UC-ALERT-CONFIRM-001](UC011_alert_confirmation_and_governance.md), GAP-WF-005.
- **Escalation chain** — Unacknowledged alerts escalate: 5 min -> Board Admin, 15 min -> OSTA Admin (GAP-ALERT-006).
- **Multi-channel parent delivery** — Push notification (primary) + SMS (emergency escalation) + Email (follow-up). See GAP-ALERT-004.
- **Incident report generation** — After alert resolution, system generates incident report template with timeline, alert details, responder actions, resolution notes, video evidence links. Exportable as PDF (GAP-GOV-003).
- **Alert lifecycle audit trail** — Every state transition (CREATED, CONFIRMED, AUTO_ESCALATED, RESOLVED, REOPENED) recorded with actor, timestamp, and notes (GAP-GOV-002).
- **False alarm handling** — School Admin can classify alert as false alarm, preventing parent notification and recording in audit for reporting.
- See [v4 Roles and Workflows](../../prd/v4/RolesAndWorkflows.md) Section 3.2 for the complete emergency alert confirmation sequence diagram.

## 10. Requirements Traced

| Requirement  | Description                                |
| ------------ | ------------------------------------------ |
| FR-ALERT-001 | Emergency event creation                   |
| FR-ALERT-002 | Admin visibility into alerts               |
| FR-VIDEO-001 | Video event support for incident workflows |
| NFR-PERF-002 | Timely alert delivery expectations         |
