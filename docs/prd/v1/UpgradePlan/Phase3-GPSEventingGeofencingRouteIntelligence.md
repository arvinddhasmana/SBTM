# Phase 3: Add GPS Eventing, Geofencing, and Real Route Intelligence

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Status: Active
- Depends on: [GapAnalysis.md](GapAnalysis.md), [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)

## Goal

Turn the GPS stack from passive tracking into an operational intelligence pipeline.

## Related Documents

- [GapAnalysis.md](GapAnalysis.md)
- [PhaseWiseImplementationPlan.md](PhaseWiseImplementationPlan.md)
- [Phase2-DriverPresenceWorkflow.md](Phase2-DriverPresenceWorkflow.md)
- [../../../Business/Requirements.md](../../../Business/Requirements.md)
- [../../../Design/v1/Architecture.md](../../../Design/v1/Architecture.md)
- [../../../Design/v1/EventCatalog.md](../../../Design/v1/EventCatalog.md)
- [../../../Design/v1/IntegrationArchitecture.md](../../../Design/v1/IntegrationArchitecture.md)
- [../../../Test/TestingGuide.md](../../../Test/TestingGuide.md)
- [../../../Demo/DEMO_SETUP_GUIDE.md](../../../Demo/DEMO_SETUP_GUIDE.md)

## Context

The GPS tracking service currently persists location points and supports live and history retrieval. GPS events are written to the database only — no domain events are published. There is no geofencing, route deviation detection, or ETA engine. Route optimization in the admin dashboard returns mocked ordering and placeholder polyline data. Phase 3 turns the GPS stack into a first-class event source and adds operational intelligence such as route deviation detection, stop proximity alerts, and provider-backed map rendering.

## Scope

### 1. GPS Event Publication

- Publish `location.updated` domain events from GPS ingest.
- Standardize event envelope fields to match the v1 design in the event catalog.

### 2. Geofencing and Deviation Detection

- Define route corridor, stop proximity, and deviation thresholds.
- Detect route deviations and generate derived alert events.
- Add ETA and route-progress calculations where feasible.

### 3. Route Optimization and Mapping

- Replace mocked optimization output with provider-backed routing.
- Replace placeholder polyline data with actual geometry returned by the provider.
- Surface route quality, duration, and distance metrics in admin workflows.

## Dependencies

- Stable route and stop data in the gateway.
- Map provider selection and credentials provisioned before development begins.
- Event handling foundation from Phase 1 so that derived deviation alerts can be consumed by notification consumers.

## Acceptance Criteria

- GPS ingest publishes events that can be consumed by downstream intelligence logic.
- Route deviations are detectable and testable.
- Route planner displays real path geometry and non-placeholder optimization results.

## Verification

- Contract tests for the `location.updated` event envelope.
- Scenario tests for on-route, near-route, and off-route conditions.
- Visual verification of map rendering and route snapping in the admin dashboard.

## Demo Impact

After this phase, the demo can show real route intelligence instead of placeholder optimization.

## Estimated Complexity

High. Requires GPS event publishing, geospatial processing logic for deviation detection, map provider integration, and end-to-end wiring of the route planner to real data.

## Previous Phase

[Phase 2: Finish the Driver Presence Workflow](Phase2-DriverPresenceWorkflow.md)

## Next Phase

[Phase 4: Complete Tenant Administration and User Provisioning](Phase4-TenantAdministrationUserProvisioning.md)
