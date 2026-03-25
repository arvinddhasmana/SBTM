<!-- CLASSIFICATION: INTERNAL -->
# UC007 — Track Children and Receive Safety Communications

> **Use Case ID**: UC-PARENT-001
> **Feature**: FEAT-PARENT-001, FEAT-NOTIFY-001, FEAT-PARENT-002
> **Priority**: MUST
> **Actors**: Parent
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

A parent uses the web portal to view linked children, inspect the current route context, and receive or review safety communications related to that route.

## 2. Preconditions

- The parent account is linked to one or more student records.
- At least one linked student has route context or operational data to display.
- The parent portal and API Gateway are reachable.

## 3. Triggers

- The parent opens the portal to check route status.
- The parent needs reassurance or current visibility during active transport.
- A notification-worthy event occurs.

## 4. Main Flow

1. The parent signs in.
2. The portal loads the list of linked children.
3. The parent selects a child or route view.
4. The portal shows live route tracking information for that child.
5. The portal surfaces relevant alerts or communications when available.
6. The parent interprets the current route state and decides whether any follow-up is required.

## 5. Alternative Flows

### 5a. Polling-Based Visibility
- The portal refreshes route and alert data through polling rather than push-style updates.
- Information remains available, but not as proactively as the target design intends.

### 5b. No Current Route or Linked Child Context
- The portal shows a limited state because there is no active route assignment or no linked roster match.

### 5c. Planned Parent Exception Workflow Not Yet Available
- The parent cannot yet report an absence or review a notification history in a complete product flow.

## 6. Postconditions

- The parent has current route and child visibility at the level supported by the product.
- The platform preserves the link between parent access and the relevant student context.

## 7. Business Rules and Constraints

- Parent access should remain limited to linked children.
- Safety communication should be timely, but should also avoid causing confusion or unnecessary alarm.
- Notification preferences and consent handling need a stronger future workflow.

## 8. Current-State Notes

- Child list and live map visibility exist.
- Real proactive notification delivery is still incomplete.
- Absence reporting and notification history remain planned rather than delivered.

## 9. Requirements Traced

| Requirement | Description |
| --- | --- |
| FR-PARENT-001 | Parent visibility into linked children and routes |
| FR-PARENT-002 | Parent-facing safety communications |
| FR-PARENT-003 | Absence reporting and history support |
| PR-CONSENT-001 | Parent communication and consent expectations |