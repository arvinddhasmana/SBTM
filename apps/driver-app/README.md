# Driver App

Mobile companion for school bus drivers in the SBTM ecosystem.

## Features

- **Route Selection** — choose AM/PM run at the start of each shift
- **Live GPS Tracking** — foreground and background location reporting every 5 seconds
- **Student Roster** — board and alight students with a single tap
- **Emergency Alerts** — one-tap PANIC button with offline buffering
- **Offline Support** — GPS and presence events queue locally and flush on reconnect

## Tech Stack

|              |                                              |
| ------------ | -------------------------------------------- |
| Framework    | React Native 0.81 + Expo SDK 54              |
| State        | Zustand                                      |
| Navigation   | React Navigation 7 (native stack)            |
| HTTP         | Axios + JWT interceptor                      |
| Storage      | Expo Secure Store                            |
| Location     | expo-location (foreground + background task) |
| BLE          | react-native-ble-plx                         |
| Connectivity | @react-native-community/netinfo              |

## Module Structure

```
apps/driver-app/
├── index.ts                       # App entry (registerRootComponent)
├── App.tsx                        # Root: auth restore, nav tree, connectivity
├── app.json                       # Expo config, permissions, plugins
├── .env                           # Local config (not committed)
├── .env.example                   # Template — copy to .env to start
└── src/
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── RouteSelectScreen.tsx
    │   ├── ActiveRouteScreen.tsx
    │   └── RosterScreen.tsx
    ├── services/
    │   ├── api.service.ts          # Axios instance, JWT attach, 401 handler
    │   ├── auth.service.ts         # Login, session restore, logout
    │   ├── gps.service.ts          # Location tracking + background task
    │   ├── connectivity.service.ts # Network monitor, offline flush on reconnect
    │   ├── ble.service.ts          # Bluetooth SmartTag detection
    │   ├── emergency.service.ts    # Panic events + offline queue
    │   ├── presence.service.ts     # Board/alight events
    │   ├── roster.service.ts       # Student roster
    │   ├── route-lifecycle.service.ts
    │   └── offline-queue.service.ts
    ├── store/
    │   └── useDriverStore.ts
    └── types/
        └── index.ts
```

## Setup

This app lives inside a pnpm workspace. **Always install from the repository root**, not from this directory:

```bash
# From the repo root
pnpm install
```

Copy the environment template:

```bash
cp apps/driver-app/.env.example apps/driver-app/.env
```

Then start the backend (required before running the app):

```bash
docker compose up -d
```

Seed the database on first run:

```bash
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
```

## Running

### With Expo Go on a physical device

```bash
cd apps/driver-app

# Same-network device (update IP first — see below)
pnpm exec expo start

# WSL2 / cross-network device (uses ngrok tunnel for Metro)
pnpm exec expo start --tunnel
```

Scan the QR code with Expo Go on your phone.

**Update `.env` with your machine's IP** (non-WSL2, same WiFi):

```bash
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):3001/api/v1|" \
  apps/driver-app/.env
```

**WSL2 users must also tunnel the backend:**

```bash
# Terminal 1 — tunnel backend (note the HTTPS URL)
ngrok http 3001

# Update .env with ngrok URL (must include /api/v1)
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://YOUR-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# Terminal 2 — start Metro with tunnel
cd apps/driver-app
pnpm exec expo start --tunnel
```

See [docs/dev/driver-app-development.md](../../docs/dev/driver-app-development.md) for the full WSL2 networking explanation.

### Android emulator

```bash
pnpm run android
```

The `.env.example` default (`http://10.0.2.2:3001/api/v1`) works for the Android emulator out of the box.

### Web browser

```bash
pnpm run web
```

BLE and background GPS are not available on web.

## Testing

```bash
# Unit tests
pnpm run test

# TypeScript check
npx tsc --noEmit
```

## Environment Variables

| Variable              | Required | Description                                    |
| --------------------- | -------- | ---------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Yes      | API Gateway URL **including `/api/v1`** suffix |

Common values:

```bash
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1

# Physical device on same WiFi
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001/api/v1

# WSL2 / ngrok
EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app/api/v1
```

## Demo Credentials

| Role   | Email               | Password    |
| ------ | ------------------- | ----------- |
| Driver | `driver1@sbtm.demo` | `Admin123!` |

## Further Reading

- [Driver App Development Guide](../../docs/dev/driver-app-development.md) — full setup, WSL2 networking, known issues
- [Real Phone Deployment Guide](../../docs/RealPhoneDeploymentGuide.md) — building APKs, EAS, driving test setup
- [Architecture](../../docs/Design/Architecture.md)
