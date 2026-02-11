# Module 3 - Driver App (Mobile)

## Status
Implemented with live gateway integration.

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
- Local roster status toggles

## Integration Notes
- Base URL is configured via `EXPO_PUBLIC_API_URL`.
- GPS and emergency posts use gateway endpoints.
- Presence updates are not wired to the presence service yet.

## Gaps / Next Steps
- Presence event integration
- Offline buffering and retry queue
