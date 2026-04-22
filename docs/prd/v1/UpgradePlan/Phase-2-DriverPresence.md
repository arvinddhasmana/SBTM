# Phase 2: Finish the Driver Presence Workflow

- Document owner: Product and Engineering
- Last reviewed: 2026-03-30
- Phase status: Planned
- Gap level: High

## Goal

Make the driver app the authoritative field tool for presence capture rather than a partially local workflow. Manual roster actions and BLE/SmartTag detections both produce durable backend presence events.

## Why This Phase Is Second

Driver presence is the source-of-truth for whether a student is on the bus. Phase 1 builds the notification pipeline that consumes presence events — Phase 2 ensures those events are reliable and complete.

## Current State (from Gap Analysis)

| Capability                             | Status                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| Presence API client in driver app      | Implemented                                                    |
| Offline buffering (AsyncStorage queue) | Implemented                                                    |
| Roster screen (local state toggling)   | Implemented (local only)                                       |
| Presence events submitted to backend   | Partial (API client exists but roster UI not wired through it) |
| BLE/SmartTag scanning in driver app    | Not implemented                                                |
| Backend SmartTag detection processing  | Implemented                                                    |
| Route lifecycle state management       | Partial (some hardcoded values)                                |

## Scope

### 1. Roster-to-Presence API Wiring

- Replace local-only roster status toggling with calls through the existing presence service client.
- Reflect server-confirmed student state in the roster UI.
- Use offline buffering for presence updates when connectivity is lost.
- Handle conflict resolution when offline events sync after reconnection.

**Implementation modules affected:**

- [Module-3-DriverApp.md](../../../Implementation/Module-3-DriverApp.md)
- [Module-6-StudentPresence.md](../../../Implementation/Module-6-StudentPresence.md)

**Requirements traced:**

- FR-PRES-001: Driver manually records student boarding/alighting
- FR-PRES-002: Presence events persisted to backend
- NFR-PERF-002: Presence events processed within 300ms p95

### 2. BLE / SmartTag Capture

- Implement BLE scanning in the driver app using Expo BLE libraries.
- Translate BLE detections into the SmartTag detection payload expected by student-presence service.
- Add mobile-side throttling, deduplication, and reconnect behavior.
- Handle scan permissions and explain purpose to the driver.

**Implementation modules affected:**

- [Module-3-DriverApp.md](../../../Implementation/Module-3-DriverApp.md)
- [Module-6-StudentPresence.md](../../../Implementation/Module-6-StudentPresence.md)

**Requirements traced:**

- FR-PRES-003: Automated presence detection via BLE/SmartTag
- NFR-BATT-001: BLE scanning must not excessively drain driver device battery

### 3. Operational Route State

- Remove hardcoded route execution assumptions (fixed vehicle identifiers).
- Record route lifecycle state: route start, stop progression, route completion.
- Surface route state for downstream notifications and operations visibility.

**Implementation modules affected:**

- [Module-3-DriverApp.md](../../../Implementation/Module-3-DriverApp.md)
- [Module-1-GpsTracking.md](../../../Implementation/Module-1-GpsTracking.md)

## Dependencies

| Dependency                           | Source                        | Status                             |
| ------------------------------------ | ----------------------------- | ---------------------------------- |
| Phase 1 notification pipeline        | Phase 1                       | Required (for downstream delivery) |
| Student tag assignment data          | Module-9 (Student Management) | Implemented                        |
| Presence service SmartTag processing | Module-6                      | Implemented                        |
| Offline queue infrastructure         | Module-3 (Driver App)         | Implemented                        |

## Acceptance Criteria

- [ ] Manual roster actions create durable presence events in the backend.
- [ ] Server-confirmed student state is reflected in the driver app roster UI.
- [ ] BLE detections create board/alight transitions through the presence service.
- [ ] Offline presence actions flush successfully after reconnection.
- [ ] Route lifecycle events (start, stop progression, completion) are recorded.

## Verification

| Test Type               | Scope                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| Mobile integration test | Roster action → presence API call → backend persistence                 |
| Device test             | Simulated or physical BLE beacon → SmartTag detection → presence event  |
| Offline test            | Queue presence events offline → reconnect → verify server state matches |
| Consistency check       | Redis presence state matches database records for a route               |
| Security test           | Presence events scoped to driver's assigned route only                  |

## Demo Impact

After Phase 2 completion, the demo can show **true boarding and alighting flows** from the driver app, with live presence events triggering parent notifications (via Phase 1 pipeline).

## Related Documents

- [Phase-1-ParentSafetyCommunication.md](Phase-1-ParentSafetyCommunication.md) — Prerequisite: notification pipeline
- [../GapAnalysis.md](../GapAnalysis.md) — Gap: "Driver presence workflow" (High)
- [../../Design/Architecture.md](../../../Design/Architecture.md) — Presence service architecture
- [../../sdlc_guidelines/08_tech_specific/react_native_expo.md](../../../sdlc_guidelines/08_tech_specific/react_native_expo.md) — Mobile conventions
