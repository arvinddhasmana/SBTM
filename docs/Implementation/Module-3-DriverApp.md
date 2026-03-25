# Module 3 - Driver App (Mobile)

## Status
Implemented with live gateway integration (Phase 2 complete).

## Source of Truth
- Current implementation: this document
- Upgrade deliverables: `docs/prd/UpgradePlan/Phase-2-DriverPresence.md`
- Phase plan: `docs/prd/PhaseWiseImplementationPlan.md`

## Location
- `apps/driver-app`

## Tech Stack
- React Native (Expo)
- Zustand state management
- React Navigation
- Expo Location, Secure Store
- react-native-ble-plx (BLE SmartTag scanning)

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
- BLE permissions: iOS requires `NSBluetoothAlwaysUsageDescription`; Android requires `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION`.

## Services
| Service | File | Role |
|---|---|---|
| `ApiService` | `services/api.service.ts` | HTTP client with auth token injection |
| `AuthService` | `services/auth.service.ts` | Login, token storage, profile |
| `GpsService` | `services/gps.service.ts` | Expo Location wrapper, tracking loop |
| `PresenceService` | `services/presence.service.ts` | Manual presence events + BLE batch upload + roster fetch |
| `RosterService` | `services/roster.service.ts` | Fetches route student roster from gateway |
| `RouteLifecycleService` | `services/route-lifecycle.service.ts` | Records ROUTE_STARTED / ROUTE_COMPLETED |
| `BleService` | `services/ble.service.ts` | BLE SmartTag scanning state machine |
| `OfflineQueueService` | `services/offline-queue.service.ts` | Durable offline buffer |

## Gaps / Next Steps
- None for Phase 2 scope. Remaining roadmap items captured in `docs/prd/PhaseWiseImplementationPlan.md`.
