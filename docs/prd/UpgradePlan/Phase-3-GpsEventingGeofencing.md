# Phase 3: GPS Eventing, Geofencing, and Real Route Intelligence

- Document owner: Product and Engineering
- Last reviewed: 2026-03-24
- Phase status: Planned
- Gap level: High

## Goal

Turn the GPS stack from passive location tracking into an operational intelligence pipeline that publishes events, detects route deviations, and provides real route optimization.

## Why This Phase Is Third

GPS intelligence depends on the stable eventing foundation from Phase 1 and reliable route state from Phase 2. With those in place, GPS events can flow through the event pipeline and trigger downstream actions.

## Current State (from Gap Analysis)

| Capability | Status |
|---|---|
| GPS location ingest and persistence | Implemented |
| GPS history retrieval with schoolId filtering | Implemented |
| Live location polling/WebSocket broadcast | Implemented |
| `location.updated` domain event publication | Not implemented |
| Geofencing logic (route corridor, stop proximity) | Not implemented |
| Route deviation detection | Not implemented |
| ETA calculation | Not implemented |
| Provider-backed route optimization | Not implemented (mocked) |
| Real route polyline data | Not implemented (placeholder) |

## Scope

### 1. GPS Event Publication

- Publish `location.updated` domain events from GPS ingest.
- Standardize event envelope fields to match the v1 event catalog.
- Enable downstream consumers (geofencing, notifications, analytics) to subscribe.

**Implementation modules affected:**
- [Module-1-GpsTracking.md](../../Implementation/Module-1-GpsTracking.md)

**Requirements traced:**
- FR-GPS-001: Record vehicle location at configurable intervals
- FR-GPS-002: Publish location events for downstream consumption

### 2. Geofencing and Deviation Detection

- Define route corridor, stop proximity, and deviation thresholds as configurable parameters.
- Implement PostGIS-based spatial queries for geofence checks.
- Detect route deviations and generate derived alert events.
- Add ETA and route-progress calculations where feasible.

**Implementation modules affected:**
- [Module-1-GpsTracking.md](../../Implementation/Module-1-GpsTracking.md)
- [Module-4-EmergencyAlerts.md](../../Implementation/Module-4-EmergencyAlerts.md) — Consume derived alert events

**Requirements traced:**
- FR-GEO-001: Detect when a vehicle deviates from its assigned route corridor
- FR-GEO-002: Generate alert events for significant route deviations
- FR-GEO-003: Calculate ETA based on current position and route progress

### 3. Route Optimization and Mapping

- Replace mocked optimization output with provider-backed routing (e.g., OSRM, Google Directions, Mapbox).
- Replace placeholder polyline data with actual geometry returned by the provider.
- Surface route quality, duration, and distance metrics in admin route planner.

**Implementation modules affected:**
- [Module-7-AdminDashboard.md](../../Implementation/Module-7-AdminDashboard.md) — Route planner UI
- [Module-8-ApiGateway.md](../../Implementation/Module-8-ApiGateway.md) — Route optimization proxy
- [Module-1-GpsTracking.md](../../Implementation/Module-1-GpsTracking.md) — Route data model

## Dependencies

| Dependency | Source | Status |
|---|---|---|
| Event pipeline (Phase 1) | Phase 1 | Required (for event consumption) |
| Stable route and stop data | Module-8 (API Gateway) | Implemented |
| Route lifecycle state (Phase 2) | Phase 2 | Required (for deviation context) |
| Map provider credentials | External | Needs selection and provisioning |
| PostGIS spatial functions | Module-1 | Available (PostgreSQL + PostGIS deployed) |

## Acceptance Criteria

- [ ] GPS ingest publishes `location.updated` events consumable by downstream services.
- [ ] Route deviations are detectable and generate alert events.
- [ ] Geofence thresholds are configurable per route.
- [ ] Route planner displays real path geometry from a provider (not placeholder polyline).
- [ ] Route optimization returns non-mocked ordering with distance/duration metrics.

## Verification

| Test Type | Scope |
|---|---|
| Contract test | `location.updated` event envelope matches v1 event catalog |
| Geofence scenario test | On-route, near-route, and off-route positions produce correct results |
| Integration test | GPS event → geofence check → deviation alert published |
| Visual verification | Admin dashboard map renders real route geometry and live bus positions |
| Performance test | GPS ingest p95 < 200ms under 100 updates/sec per school |

## Demo Impact

After Phase 3 completion, the demo can show **real route intelligence** — live deviation detection, accurate route display on the map, and ETA estimates — instead of placeholder optimization output.

## Related Documents

- [Phase-1-ParentSafetyCommunication.md](Phase-1-ParentSafetyCommunication.md) — Event pipeline foundation
- [Phase-2-DriverPresence.md](Phase-2-DriverPresence.md) — Route state dependency
- [../GapAnalysis.md](../GapAnalysis.md) — Gap: "GPS intelligence" (High), "Route optimization" (Medium)
- [../../Design/DataArchitecture.md](../../Design/DataArchitecture.md) — GPS data domain
- [../../sdlc_guidelines/08_tech_specific/postgresql_postgis.md](../../sdlc_guidelines/08_tech_specific/postgresql_postgis.md) — PostGIS guidelines
