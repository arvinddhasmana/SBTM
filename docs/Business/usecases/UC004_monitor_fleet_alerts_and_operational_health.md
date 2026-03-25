<!-- CLASSIFICATION: INTERNAL -->
# UC004 — Monitor Fleet, Alerts, and Operational Health

> **Use Case ID**: UC-MONITOR-001
> **Feature**: FEAT-TRACKING-001, FEAT-ALERTS-001, FEAT-ROUTE-001, FEAT-TENANCY-001
> **Priority**: MUST
> **Actors**: OSTA Admin, Board Admin, School Operator, Dispatcher, Admin
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

An operational user monitors the current state of transport activity through the dashboard. This includes route progress, live vehicle position, active alerts, and the supporting context needed to respond to operational issues.

## 2. Preconditions

- The user is authenticated.
- Tracking and alerting services are available.
- Routes are active or recent enough to appear in dashboard context.

## 3. Triggers

- The user opens the dashboard during operations.
- An alert or incident occurs.
- The user needs to review route execution status.

## 4. Main Flow

1. The operator opens the admin dashboard.
2. The system loads summary metrics and live route or alert data.
3. The operator reviews active alerts and live bus positions.
4. The operator filters or drills into a specific route, bus, student, or incident.
5. The operator uses the detail context to decide whether intervention or escalation is required.

## 5. Alternative Flows

### 5a. Downstream Service Degradation
- The dashboard loads partially.
- Some map, alert, or supporting records are missing or stale.
- The operator continues with reduced visibility and may escalate to support.

### 5b. Board-Level or System-Wide Aggregation Gap
- The user needs broader aggregation than the current implementation provides.
- The user navigates school-by-school or accepts a limited overview.

## 6. Postconditions

- The operator has situational awareness of the accessible transport scope.
- Relevant incidents or route problems can be investigated further.

## 7. Business Rules and Constraints

- Operational visibility must remain within role and tenant boundaries.
- Live visibility is only as reliable as GPS and alert ingest freshness.
- Dashboard monitoring is safety-relevant and should avoid misleading data presentation.

## 8. Current-State Notes

- Live monitoring exists at prototype level.
- Board-level and system-wide aggregation remain limited.
- Real-time delivery is mixed across polling and service-driven update mechanisms.

## 9. Requirements Traced

| Requirement | Description |
| --- | --- |
| FR-GPS-001 | Real-time route visibility |
| FR-ALERT-002 | Admin alert visibility |
| FR-TENANT-001 | Tenant-aware operational data |
| OPS-MON-001 | Monitoring of critical workflow health |