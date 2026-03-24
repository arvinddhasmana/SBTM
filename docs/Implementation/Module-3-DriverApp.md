# Module 3 - Driver App (Mobile)

## Status
Implemented with live gateway integration.

## Source of Truth
- Current implementation: this document
- Upgrade gaps: `docs/prd/v1/UpgradePlan/GapAnalysis.md`
- Planned delivery phase: `docs/prd/v1/UpgradePlan/PhaseWiseImplementationPlan.md` Phase 2

## Location
- `apps/driver-app`

## Tech Stack
- React Native (Expo)
- Zustand state management
- React Navigation
- Expo Location, Secure Store

## Functionality
- Gateway login
- Schedule and route selection
- GPS tracking via `expo-location`
- Panic button posting to emergency endpoint
- Offline queueing for GPS, emergency, and presence submissions
- Local roster status toggles

## Integration Notes
- Base URL is configured via `EXPO_PUBLIC_API_URL`.
- GPS and emergency posts use gateway endpoints.
- Presence updates are not wired to the presence service yet.

## Gaps / Next Steps
- Presence event integration
- BLE scanning and authoritative roster-to-presence workflow
