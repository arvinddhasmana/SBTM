# Module 3 - Driver App (Mobile)

> **⚠ Historical — v1 Era.** This module document reflects the v1 driver app API surface. For the current v2 driver app design (shapes-based nav, `stx_boarding_events`) see [Architecture.md](../Design/Architecture.md).

- Last reviewed: 2026-03-30

## Status

Implemented with live gateway integration (Phase 2 complete).

## Source of Truth

- Current implementation: this document
- Upgrade deliverables: `docs/prd/UpgradePlan/Phase-2-DriverPresence.md`
- Phase plan: `docs/prd/PhaseWiseImplementationPlan.md`

## Location

- `apps/driver-app`

## Tech Stack

- React Native 0.81.5 + Expo ~54.0.29
- React 19.1.0
- Zustand 5.0.9 (state management)
- React Navigation 7.1.25 + Native Stack 7.8.6
- React Native Maps 1.26.20
- Expo Location 19.0.8, Expo Secure Store 15.0.8
- react-native-ble-plx 3.5.1 (BLE SmartTag scanning)
- Axios 1.13.2 (HTTP client)
- AsyncStorage 3.0.1 (offline queue persistence)
- Testing: Jest 29.7.0 + jest-expo 54.0.16
- TypeScript ~5.9.2
- Expo New Architecture enabled (`newArchEnabled: true`)

## Functionality

- Gateway login
- Schedule and route selection
- GPS tracking via `expo-location`; `vehicleId` sourced from route assignment (no hardcoded values)
- Route lifecycle recording: ROUTE_STARTED and ROUTE_COMPLETED events sent to backend via `route-lifecycle.service.ts`
- Roster fetched from `GET /driver/me/routes/:routeId/students` at route start (server-authoritative, not local-only)
- Manual presence event toggling with optimistic update + server confirmation; `pendingSync` / `serverConfirmed` visual indicators in RosterScreen
- BLE/SmartTag scanning via `ble.service.ts`: deduplication (5 s window), batching (50 detections / 10 s), battery-safe stop-on-unmount; detections forwarded to `POST /presence-events`
- Panic button posting to emergency endpoint
- Offline queueing for GPS, emergency, presence, and lifecycle submissions

## Integration Notes

- Base URL is configured via `EXPO_PUBLIC_API_URL`.
- GPS and emergency posts use gateway endpoints.
- Presence events (both manual toggles and BLE detections) use gateway `POST /student-presence-events` and `POST /presence-events` respectively.
- Route lifecycle events use gateway `POST /routes/lifecycle-events`.
- Roster is fetched from `GET /driver/me/routes/:routeId/students`; `schoolId` is always sourced from the authenticated JWT, never from the client payload.
- **JWT Token Structure**: The `assignedRouteIds` field in the JWT payload contains an array of UUID route identifiers (not string-based route codes). Driver schedule and route access control is enforced based on these UUIDs.
- BLE permissions: iOS requires `NSBluetoothAlwaysUsageDescription`; Android requires `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`.

## Services

| Service                 | File                                  | Role                                                     |
| ----------------------- | ------------------------------------- | -------------------------------------------------------- |
| `ApiService`            | `services/api.service.ts`             | HTTP client with auth token injection                    |
| `AuthService`           | `services/auth.service.ts`            | Login, token storage, profile                            |
| `GpsService`            | `services/gps.service.ts`             | Expo Location wrapper, tracking loop                     |
| `PresenceService`       | `services/presence.service.ts`        | Manual presence events + BLE batch upload + roster fetch |
| `RosterService`         | `services/roster.service.ts`          | Fetches route student roster from gateway                |
| `RouteLifecycleService` | `services/route-lifecycle.service.ts` | Records ROUTE_STARTED / ROUTE_COMPLETED                  |
| `BleService`            | `services/ble.service.ts`             | BLE SmartTag scanning state machine                      |
| `OfflineQueueService`   | `services/offline-queue.service.ts`   | Durable offline buffer                                   |

## Gaps / Next Steps

- None for Phase 2 scope. Remaining roadmap items captured in `docs/prd/PhaseWiseImplementationPlan.md`.
