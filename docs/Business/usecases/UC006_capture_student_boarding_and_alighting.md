<!-- CLASSIFICATION: INTERNAL -->
# UC006 — Capture Student Boarding and Alighting

> **Use Case ID**: UC-PRESENCE-001
> **Feature**: FEAT-PRESENCE-001, FEAT-NOTIFY-001, FEAT-STUDENT-001
> **Priority**: MUST
> **Actors**: Driver, Student Presence Service
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

The platform records that a student has boarded or exited the bus. The resulting presence state supports safety awareness, parent communications, and administrative visibility.

## 2. Preconditions

- The student exists in the roster.
- The student is associated with the relevant school and route context.
- The driver is authenticated and operating in the correct route context.

## 3. Triggers

- A student boards the bus.
- A student exits the bus.
- A device-assisted detection event indicates presence activity.

## 4. Main Flow

1. The driver or device-assisted process identifies the student event.
2. The app or device process creates a presence payload.
3. The payload is sent through the gateway to the Student Presence service.
4. The Student Presence service persists the event.
5. The service updates current operational state for that student and route.
6. Downstream consumers can use the new state for monitoring or notification workflows.

## 5. Alternative Flows

### 5a. Manual Override
- The driver records the event manually.
- The manual path becomes the authoritative event source for that action.

### 5b. BLE-Assisted Detection
- The service processes a batch of tag detections.
- The service infers student state based on tag identity and signal evidence.

### 5c. Offline Buffering
- The mobile app stores the event temporarily.
- The event is submitted later when connectivity returns.

## 6. Postconditions

- A durable presence event exists.
- The student, route, vehicle, and tenant context are associated with that event.
- Parent-facing or admin-facing workflows can reference the resulting state.

## 7. Business Rules and Constraints

- Presence events are student-linked operational data and must be handled carefully.
- Manual fallback is required even when automation exists.
- Duplicate or conflicting detection events should be resolved consistently.

## 8. Current-State Notes

- Backend presence support exists.
- Mobile integration is partial.
- BLE support exists conceptually and partially in services, but not yet as a complete app workflow.

## 9. Requirements Traced

| Requirement | Description |
| --- | --- |
| FR-PRESENCE-001 | Record boarding and alighting events |
| FR-PRESENCE-002 | Associate presence with route, vehicle, and tenant context |
| PR-MINIMIZE-001 | Minimize student-facing operational data collection |