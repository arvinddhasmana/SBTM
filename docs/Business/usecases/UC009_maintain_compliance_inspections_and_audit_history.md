<!-- CLASSIFICATION: INTERNAL -->
# UC009 — Maintain Compliance, Inspections, and Audit History

> **Use Case ID**: UC-COMPLIANCE-001
> **Feature**: FEAT-COMPLIANCE-001
> **Priority**: MUST
> **Actors**: Compliance or Support User, School Operator, Admin
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

An authorized operational or compliance user records, reviews, and investigates driver compliance information, vehicle inspection results, and audit history so the transport operation remains accountable and safe.

## 2. Preconditions

- The user is authenticated with a role allowed to access compliance-related views.
- The relevant driver, vehicle, and school context exist.
- The compliance service is reachable.

## 3. Triggers

- A compliance review is due.
- A vehicle inspection must be recorded.
- An investigation requires audit review.

## 4. Main Flow

1. The authorized user opens compliance-related views.
2. The user reviews driver compliance records or inspection status.
3. The user records a new inspection or updates an existing compliance entry where required.
4. The user queries audit records to understand change history or operational context.
5. The user uses the resulting information to support safe operations, investigation, or follow-up action.

## 5. Alternative Flows

### 5a. Missing Compliance Record
- The platform does not find an existing driver compliance record.
- The user creates one as part of the update flow.

### 5b. Service-Local Audit Only
- The user can review the compliance service audit scope.
- Cross-service investigative completeness remains limited.

## 6. Postconditions

- Compliance, inspection, or audit data has been reviewed or updated.
- Operational users have attributable records for follow-up.

## 7. Business Rules and Constraints

- Compliance records are tenant-scoped and operationally sensitive.
- Audit history should support investigation without encouraging unnecessary access to student-linked data.
- Retention expectations for audit and compliance records are longer-lived than for some telemetry data.

## 8. Current-State Notes

- Compliance records, inspections, and audit queries exist.
- There is no distinct compliance-only role yet.
- Audit remains service-local rather than fully centralized.

## 9. Requirements Traced

| Requirement | Description |
| --- | --- |
| FR-COMPLIANCE-001 | Compliance, inspection, and audit support |
| SR-AUDIT-001 | Attributable audit coverage |
| PR-RETENTION-001 | Retention and lifecycle expectations for regulated data |