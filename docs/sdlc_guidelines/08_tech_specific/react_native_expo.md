# React Native and Expo Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: React Native and Expo conventions for the SBTM driver app

## Purpose

Define mobile development standards for the SBTM driver app (`apps/driver-app`), which uses React Native with Expo.

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React Native |
| Toolchain | Expo |
| Navigation | React Navigation |
| State management | React hooks + context |
| HTTP client | Fetch API or Axios |
| Real-time | Socket.IO client |
| Type checking | TypeScript (strict mode) |
| Testing | Jest + React Native Testing Library |

## Project Structure

```
apps/driver-app/
├── App.tsx               # Entry point
├── app.json              # Expo configuration
├── src/
│   ├── navigation/       # Navigator setup (stack, tab)
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── RouteScreen.tsx
│   │   └── AlertScreen.tsx
│   ├── components/       # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API client functions
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   └── config/           # App configuration
├── assets/               # Images, fonts
└── jest.config.js
```

## Mobile-Specific Rules

### GPS and Location

- Use Expo Location API for foreground location tracking.
- Request location permissions explicitly with clear purpose messaging.
- Send GPS updates to the backend at the configured interval (default: 5 seconds).
- Handle permission denial gracefully — show an explanation and retry option.

```typescript
import * as Location from 'expo-location';

const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  // Show permission explanation UI
  return;
}
```

### Offline Resilience

- Cache active route data locally for offline access.
- Queue GPS updates and presence events when offline; sync when reconnected.
- Show clear offline indicators in the UI.
- Retry failed API calls with exponential backoff.

### Battery Optimization

- Use foreground location only when the driver has an active route.
- Stop location updates when the driver ends the route.
- Minimize background processing to preserve battery.

## Component Conventions

- Use function components with hooks (no class components).
- Screen components go in `src/screens/`, reusable components in `src/components/`.
- Use React Navigation for screen transitions. Define navigator types centrally.

```typescript
// Type-safe navigation
type RootStackParamList = {
  Home: undefined;
  Route: { routeId: string };
  Alert: { alertId: string };
};
```

## API Integration

- Same patterns as the web app — centralize API calls in `src/services/`.
- Handle network errors explicitly (mobile networks are unreliable).
- Include device information headers for debugging:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'X-Device-Platform': Platform.OS,
  'X-App-Version': Constants.expoConfig?.version,
}
```

## Testing

- Unit tests for hooks and utilities using Jest.
- Component tests using React Native Testing Library.
- Manual testing on both iOS and Android devices.
- Use Expo Go for rapid development testing.

## Related Documents

- [react_vite.md](react_vite.md) — Web frontend conventions
- [socketio_sse.md](socketio_sse.md) — Real-time patterns
- [../04_coding_standards/typescript_standards.md](../04_coding_standards/typescript_standards.md) — TypeScript rules
