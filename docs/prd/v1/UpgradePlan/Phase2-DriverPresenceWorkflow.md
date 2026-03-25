# Phase 2: Finish the Driver Presence Workflow

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Status: Active
- Depends on: [GapAnalysis.md](GapAnalysis.md), [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)

## Goal

Make the driver app the authoritative field tool for presence capture rather than a partially local workflow.

## Related Documents

- [GapAnalysis.md](GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)
- [Phase1-ParentSafetyCommunicationLoop.md](Phase1-ParentSafetyCommunicationLoop.md)
- [../../../Business/Requirements.md](../../../Business/Requirements.md)
- [../../../Design/v1/Architecture.md](../../../Design/v1/Architecture.md)
- [../../../Design/v1/EventCatalog.md](../../../Design/v1/EventCatalog.md)
- [../../../Test/TestingGuide.md](../../../Test/TestingGuide.md)
- [../../../Demo/DEMO_SETUP_GUIDE.md](../../../Demo/DEMO_SETUP_GUIDE.md)

## Context

The driver app already includes auth, route selection, GPS tracking, panic events, and offline buffering. A presence API client for `BOARD` and `ALIGHT` events with offline buffering support exists in the mobile codebase. However, the roster screen currently changes local student state and is not wired to the presence service. BLE and SmartTag scanning is not implemented in the app despite service-side support for SmartTag detections. Phase 2 completes the authoritative driver presence workflow from mobile UI through to backend persistence and downstream notification delivery.

## Scope

### 1. Roster-to-Presence API Wiring

- Replace local-only roster status toggling with calls through the existing presence service client.
- Reflect server-confirmed student state in the roster UI.
- Use offline buffering for presence updates when connectivity is lost.

### 2. BLE / SmartTag Capture

- Implement BLE scanning in the driver app.
- Translate detections into the SmartTag detection payload expected by student-presence.
- Add mobile-side throttling, deduplication, and reconnect behavior.

### 3. Operational Route State

- Remove hardcoded route execution assumptions such as fixed vehicle identifiers where possible.
- Record route lifecycle state needed for downstream notifications and operations visibility.

## Dependencies

- Phase 1 notification pipeline for downstream parent delivery of boarding and alighting events.
- Student tag assignment integrity in student-presence and student-management services.

## Acceptance Criteria

- Manual roster actions create durable presence events in the backend.
- BLE detections can create board and alight transitions through the existing presence service logic.
- Offline presence actions flush successfully after reconnect.

## Verification

- Mobile integration tests for presence event submission.
- Device tests with simulated or physical BLE beacons and tags.
- Route-level presence consistency checks against Redis and database state.

## Demo Impact

After this phase, the demo can show true boarding and alighting flows from the driver app.

## Estimated Complexity

High. Requires mobile BLE integration, wiring the roster UI to the presence service, implementing throttle and dedup logic, and ensuring offline buffering is exercised end-to-end.

## Previous Phase

[Phase 1: Complete the Parent Safety Communication Loop](Phase1-ParentSafetyCommunicationLoop.md)

## Next Phase

[Phase 3: Add GPS Eventing, Geofencing, and Real Route Intelligence](Phase3-GPSEventingGeofencingRouteIntelligence.md)
