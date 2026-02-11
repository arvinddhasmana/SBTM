# Module 3 - Driver App (Mobile)

## Status
Implemented as a demo-first Expo app with mock auth.

## Location
- `apps/driver-app`

## Tech Stack
- React Native (Expo)
- Zustand state management
- React Navigation
- Expo Location, Secure Store

## Functionality
- Mock login (`driver@test.com` / `password`)
- Route selection and active route screen
- GPS tracking via `expo-location`
- Panic button posting to emergency endpoint
- Local roster status toggles

## Integration Notes
- Base URL is hardcoded in `apps/driver-app/src/services/api.service.ts`.
- GPS and emergency posts work if API base URL is configured.
- Presence updates are not wired to the presence service yet.

## Gaps / Next Steps
- Real auth against API gateway
- Driver schedule from backend
- Presence event integration
- Offline buffering and retry queue
