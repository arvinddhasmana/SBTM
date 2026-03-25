<!-- CLASSIFICATION: INTERNAL -->
# UC005 — Execute the Daily Driver Workflow

> **Use Case ID**: UC-DRIVER-001
> **Feature**: FEAT-TRACKING-001, FEAT-ALERTS-001, FEAT-PRESENCE-001
> **Priority**: MUST
> **Actors**: Driver
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

A driver uses the mobile application to sign in, review the assigned route, transmit GPS updates, manage student-related route actions, and raise an emergency when an operational issue occurs.

## 2. Preconditions

- The driver has a valid account.
- The mobile app is configured correctly.
- The route and vehicle context exist or are provided in the current environment.

## 3. Triggers

- The driver starts a shift.
- The driver starts an active route.

## 4. Main Flow

1. The driver signs in to the mobile app.
2. The mobile app loads the driver schedule or route context.
3. The driver starts route execution.
4. The mobile app begins sending location updates.
5. The driver interacts with the roster during boarding and alighting moments.
6. The driver raises an emergency event if a serious issue occurs.
7. The app continues sending or queueing operational events until the route is complete.

## 5. Alternative Flows

### 5a. Connectivity Loss
- GPS, alert, or presence events are buffered locally.
- The app attempts to flush queued events when connectivity returns.

### 5b. BLE or Automated Presence Not Available
- The driver continues with manual roster interaction.

### 5c. Route Context Simplified or Seeded
- The app may rely on partially simplified route or vehicle context in the current prototype.

## 6. Postconditions

- The platform receives route telemetry and driver-triggered events.
- Operational route state is available for admins and related consumers.

## 7. Business Rules and Constraints

- Drivers need a workflow that tolerates intermittent connectivity.
- Safety-critical actions such as panic or emergency initiation must remain available.
- Presence capture should become authoritative, but is not yet fully so in the current mobile UI.

## 8. Current-State Notes

- GPS updates and emergency initiation are implemented.
- Offline buffering exists.
- The roster workflow is still not fully authoritative backend presence capture.
- BLE-assisted capture is still incomplete in the app.

## 9. Requirements Traced

| Requirement | Description |
| --- | --- |
| FR-GPS-001 | Live vehicle location updates |
| FR-ALERT-001 | Emergency event creation |
| FR-PRESENCE-001 | Boarding and alighting capture |
| NFR-RESIL-001 | Offline resilience for field workflow |