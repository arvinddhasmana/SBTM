# Parent App (Mobile) — Development Guide

> **Audience:** Developers setting up the Parent Mobile App for the first time, or debugging a broken local environment.
> **Last updated:** 2026-04-27

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [First-Time Setup](#first-time-setup)
4. [Running the App](#running-the-app)
5. [WSL2 Networking](#wsl2-networking)
6. [Building an APK](#building-an-apk)
7. [Testing](#testing)
8. [Environment Variables](#environment-variables)
9. [Known Issues and Fixes](#known-issues-and-fixes)
10. [Daily Workflow Cheat Sheet](#daily-workflow-cheat-sheet)

---

## Overview

The Parent Mobile App is a React Native / Expo mobile app for parents of school bus riders. It provides real-time GPS tracking of their child's bus, emergency alert notifications, absence reporting, and notification preference management.

The stack mirrors the Driver App exactly — same React Native + Expo version, same state management, same navigation library.

### Tech Stack

| Layer         | Library                              |
| ------------- | ------------------------------------ |
| Framework     | React Native 0.81 + Expo SDK 54      |
| State         | Zustand                              |
| Navigation    | React Navigation 7 (native stack)    |
| HTTP          | Axios (with JWT interceptor)         |
| Storage       | Expo Secure Store                    |
| Maps          | React Native Maps                    |
| Connectivity  | @react-native-community/netinfo      |
| Notifications | expo-notifications (FCM placeholder) |

### Key Differences from Driver App

| Feature             | Driver App                      | Parent App                       |
| ------------------- | ------------------------------- | -------------------------------- |
| Bluetooth (BLE)     | Yes — SmartTag scanning         | **No** — parents don't scan tags |
| GPS publishing      | Yes — driver publishes location | **No** — read-only map view      |
| Background location | Yes — continuous route tracking | **No** — foreground only         |
| Push notifications  | Panic / emergency (receive)     | Bus events + emergency (receive) |
| Google Maps API key | Required for Android build      | Required for Android build       |

### Source Layout

```
apps/parent-app-mobile/
├── index.ts                    # App entry point (registerRootComponent)
├── App.tsx                     # Root component, auth restore, nav tree
├── app.json                    # Expo config (permissions, plugins)
├── .env                        # Local env vars (not committed)
├── .env.example                # Template — copy to .env
└── src/
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── DashboardScreen.tsx         # Child cards with bus status
    │   ├── MapScreen.tsx               # Live GPS map (read-only)
    │   ├── NotificationsScreen.tsx     # Alert history
    │   ├── AbsenceReportScreen.tsx     # Submit absence request
    │   └── SettingsScreen.tsx          # Notification preferences
    ├── services/
    │   ├── ApiService.ts               # Axios instance + JWT interceptor
    │   ├── AuthService.ts              # Login, session restore, logout
    │   ├── ParentApiService.ts         # Parent-specific API endpoints
    │   ├── ConnectivityService.ts      # Network monitor
    │   └── NotificationService.ts     # FCM (placeholder, graceful fallback)
    ├── components/
    │   ├── GlassCard.tsx               # Glassmorphic card container
    │   ├── GlassButton.tsx             # Animated button with variants
    │   ├── GlassModal.tsx              # Slide-up modal with blur
    │   ├── StatusBadge.tsx             # Child/bus status indicator
    │   └── LoadingSpinner.tsx          # Gradient ring spinner
    ├── store/
    │   └── useParentStore.ts           # Zustand store
    └── types/
        └── index.ts
```

---

## Prerequisites

### Required for all platforms

| Tool           | Version | Notes                                          |
| -------------- | ------- | ---------------------------------------------- |
| Docker Desktop | Latest  | Runs the full backend stack                    |
| Node.js        | 20+     | Managed by the monorepo                        |
| pnpm           | 9+      | **Use pnpm, not npm** — root workspace manager |
| Expo Go        | Latest  | Install on your Android/iOS test device        |

### Required for WSL2 users

| Tool  | Notes                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ngrok | Free tier is enough. [ngrok.com/download](https://ngrok.com/download) — needed because WSL2 Docker ports are not reachable by phone |

### Not needed for Expo Go development

- `eas-cli` — only required for building APKs to distribute
- Expo account — only required for EAS builds
- Android Studio / Xcode — only required for emulators
- USB debugging — only required for direct APK install via `adb`

---

## First-Time Setup

### 1. Install dependencies

**From the workspace root** (not from inside `apps/parent-app-mobile`):

```bash
# Correct — installs all workspace packages including parent-app-mobile
pnpm install

# Wrong — triggers yarn build scripts that fail, misses workspace linking
cd apps/parent-app-mobile && pnpm install
```

Why: this is a pnpm workspace. `pnpm install` at the root resolves all packages together and avoids post-install script failures.

### 2. Create the `.env` file

```bash
cp apps/parent-app-mobile/.env.example apps/parent-app-mobile/.env
```

Default value targets the Android emulator (`10.0.2.2`). Update to your actual backend URL in the next sections.

### 3. Start the backend

The parent app talks to the API Gateway on port 3001. Use the hybrid dev script to start infrastructure + backend services:

```bash
./scripts/dev-hybrid.sh
```

Or start just the Docker infrastructure:

```bash
./scripts/dev-hybrid.sh --infra-only
```

Verify the API is healthy:

```bash
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok",...}
```

### 4. Seed the database (first time only)

If the database has not been seeded, the parent accounts won't exist:

```bash
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
```

Verify a parent account works:

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent1@sbtm.demo","password":"Admin123!"}'
# Expected: {"accessToken":"eyJ...","user":{"role":"PARENT",...}}
```

---

## Running the App

### Option A: Expo Go on a Physical Device (Recommended)

Expo Go lets you run the app on your phone without building an APK. The Metro bundler serves the JavaScript bundle; the phone runs the native shell from the Expo Go app.

**When to use:** Day-to-day development, testing all parent features. Fastest iteration cycle.

**Note:** Push notifications (expo-notifications) require a built APK/IPA to fully function — Expo Go provides limited notification support. All other features (GPS map, alerts, absence reporting, settings) work fine in Expo Go.

#### Non-WSL2 (native Linux / macOS)

1. Ensure your phone and development machine are on the same WiFi.
2. Update `.env` with your LAN IP:

   ```bash
   # Find your machine's IP
   hostname -I | awk '{print $1}'
   # e.g. 192.168.1.42

   # Update .env
   sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://192.168.1.42:3001/api/v1|" \
     apps/parent-app-mobile/.env
   ```

3. Start Metro:
   ```bash
   cd apps/parent-app-mobile
   pnpm exec expo start
   ```
4. Open Expo Go on your phone → scan the QR code.

#### WSL2 (Windows Subsystem for Linux)

WSL2 runs a separate Linux kernel inside a VM. Your phone on WiFi cannot directly reach ports inside the WSL2 VM — use ngrok tunnels for both the backend and Metro bundler.

See [WSL2 Networking](#wsl2-networking) for the full setup.

---

### Option B: Android Emulator

**Prerequisite:** Android Studio installed with an AVD created.

The emulator uses `10.0.2.2` to reach host localhost:

```bash
# .env.example defaults to the emulator address:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1

cd apps/parent-app-mobile
pnpm run android
# or: pnpm exec expo start --android
```

**WSL2 note:** Emulator from WSL2 requires ADB bridging — complex and unreliable. Use physical device with Expo Go + ngrok for daily development instead.

---

### Option C: Web Browser

```bash
cd apps/parent-app-mobile
pnpm run web
```

**Limitations:** `react-native-maps` and expo-notifications do not work on web. Use for layout/UI-only development.

---

## WSL2 Networking

### Why the phone cannot reach WSL2 services

```
Your development machine:
┌─────────────────────────────────────────┐
│  Windows (Wi-Fi IP: 192.168.2.135)      │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │  WSL2 VM                           │ │
│  │   ├─ Metro (port 8081)             │ │
│  │   └─ Docker                        │ │
│  │       └─ API Gateway (port 3001)   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         ↑ Phone cannot reach these
         (no Windows process forwarding
          to WSL2 VM for these ports)
```

Docker Desktop's port mappings are visible within WSL2 but not exposed on the Windows network interface. ngrok runs inside WSL2 and creates public HTTPS tunnels your phone can reach from any network.

### Solution: ngrok tunnels for both Metro and the API

#### Step 1 — Install ngrok (one time)

```bash
curl -Lo ~/ngrok.tgz https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xf ~/ngrok.tgz -C ~/
sudo mv ~/ngrok /usr/local/bin/
ngrok version
```

#### Step 2 — Authenticate (one time)

1. Sign up at [https://ngrok.com/signup](https://ngrok.com/signup)
2. Copy your authtoken from the dashboard
3. Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

#### Step 3 — Tunnel the backend (Terminal 1, keep open)

```bash
ngrok http 3001
# Note the HTTPS URL, e.g.: https://a1b2-192-168-2-135.ngrok-free.app
```

#### Step 4 — Update `.env` with the ngrok URL

```bash
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://YOUR-URL.ngrok-free.app/api/v1|" \
  apps/parent-app-mobile/.env

# Verify
cat apps/parent-app-mobile/.env
```

**Important:** the URL must end with `/api/v1`.

#### Step 5 — Start Metro with tunnel (Terminal 2)

```bash
cd apps/parent-app-mobile
pnpm exec expo start --tunnel
```

Expo's `--tunnel` proxies Metro through its own tunnel service. The QR code contains a public URL your phone can scan.

#### Step 6 — Scan and log in

Open Expo Go → scan the QR code → log in with `parent1@sbtm.demo` / `Admin123!`.

### ngrok URL changes on each restart

Free ngrok tunnels generate a new URL each session:

```bash
# 1. Start ngrok, note new URL
ngrok http 3001

# 2. Update .env
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://NEW-URL.ngrok-free.app/api/v1|" \
  apps/parent-app-mobile/.env

# 3. Restart Metro (picks up new .env)
cd apps/parent-app-mobile && pnpm exec expo start --tunnel
```

---

## Building an APK

### Option A: EAS Cloud Build (recommended — no Android SDK required)

Before building for the first time:

```bash
# Install EAS CLI globally (one time)
pnpm add -g eas-cli

# Log in to your Expo account
eas login

# Initialize a real EAS project (replaces the placeholder project ID in app.json)
cd apps/parent-app-mobile
eas init
```

After `eas init`, commit the updated `app.json` (it will have a real `projectId`).

```bash
# Build preview APK (~10 minutes on Expo servers)
eas build --platform android --profile preview
```

When complete, EAS prints a download URL. Install directly from the URL or scan the QR code.

### Google Maps API Key for Android builds

`react-native-maps` on Android standalone builds requires a Google Maps API key. Add it to the project the same way as the Driver App:

1. Create a key in [Google Cloud Console](https://console.cloud.google.com/google/maps-apis), restricted to `com.sbtm.parent`.
2. Store it as an EAS secret:
   ```bash
   eas env:create --scope project --name GOOGLE_MAPS_ANDROID_API_KEY --value YOUR_KEY --visibility secret
   ```
3. Create `apps/parent-app-mobile/app.config.js` to inject it (copy from `apps/driver-app/app.config.js`, change the `console.warn` package name reference).

### Option B: Local Build (requires Android SDK + JDK 17)

```bash
cd apps/parent-app-mobile
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

---

## Testing

### Unit tests

```bash
# From workspace root
pnpm test

# Parent app only
cd apps/parent-app-mobile
pnpm run test

# With coverage
pnpm run test -- --coverage
```

Test files live alongside the source they cover:

```
src/services/AuthService.test.ts
src/services/ApiService.test.ts
src/services/ParentApiService.test.ts
src/store/useParentStore.test.ts
src/components/GlassCard.test.tsx
src/components/GlassButton.test.tsx
```

### TypeScript check

```bash
cd apps/parent-app-mobile
npx tsc --noEmit
```

---

## Environment Variables

Variables prefixed `EXPO_PUBLIC_` are inlined into the JS bundle at build time.

| Variable              | Required | Scope           | Description                                              |
| --------------------- | -------- | --------------- | -------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Yes      | Public (bundle) | Full base URL of the API Gateway **including `/api/v1`** |

### URL patterns by target

| Target                 | Value                                    |
| ---------------------- | ---------------------------------------- |
| Android emulator       | `http://10.0.2.2:3001/api/v1`            |
| iOS simulator          | `http://localhost:3001/api/v1`           |
| Physical device — LAN  | `http://192.168.x.x:3001/api/v1`         |
| Physical device — WSL2 | `https://xxxx.ngrok-free.app/api/v1`     |
| CI / staging           | `https://your-server.example.com/api/v1` |

---

## Known Issues and Fixes

### 1. `pnpm install` fails with `yarn build` error

**Symptom:**

```
npm error command failed: sh -c yarn build
npm error sh: yarn: not found
```

**Cause:** Running `pnpm install` inside `apps/parent-app-mobile/` hits a post-install script that requires yarn.

**Fix:** Always install from the workspace root:

```bash
cd /path/to/SBTM
pnpm install
```

### 2. Port conflict when starting Metro

**Symptom:**

```
Port 8081 is running this app in another window
```

**Cause:** A previous Metro process (likely from the Driver App) is still running.

**Fix:**

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null
```

Note: you cannot run both the Driver App and Parent App on the same Metro port simultaneously. Either use different ports (`--port 8082`) or stop one before starting the other.

### 3. Login returns 404

**Symptom:** "Request failed with status code 404" on login.

**Cause:** `EXPO_PUBLIC_API_URL` is missing the `/api/v1` suffix.

**Fix:** Ensure `.env` ends with `/api/v1`:

```
EXPO_PUBLIC_API_URL=https://your-url.ngrok-free.app/api/v1
```

### 4. Login succeeds but dashboard shows no children

**Symptom:** Login works, Dashboard shows "No children linked to your account".

**Cause:** The database wasn't seeded, or the parent account has no linked children in the seed data.

**Fix:** Re-run the seed script:

```bash
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
```

Use `parent1@sbtm.demo` — this account has children and routes linked in the seed data.

### 5. Phone shows "Failed to download remote update" in Expo Go

**Cause:** The phone cannot reach the Metro bundler address.

**Fix:** Start Metro with `--tunnel`:

```bash
pnpm exec expo start --tunnel
```

### 6. Map screen shows blank / no map tiles

**Cause:** `react-native-maps` in Expo Go uses Google Maps on Android. On first run it may need a moment to load tiles, or the device needs an active internet connection.

**Note:** The Google Maps API key is not needed for Expo Go — Expo Go bundles its own key. For standalone builds, see [Google Maps API Key for Android builds](#google-maps-api-key-for-android-builds).

### 7. EAS project ID placeholder error

**Symptom:**

```
Error: eas.json: The "extra.eas.projectId" field in app.json is a placeholder.
```

**Cause:** The `app.json` ships with `"projectId": "PLACEHOLDER-PARENT-APP-PROJECT-ID"`.

**Fix:** Run `eas init` from `apps/parent-app-mobile` to register the project and replace the placeholder with a real ID. Only needed for EAS builds — Expo Go development is unaffected.

---

## Daily Workflow Cheat Sheet

### WSL2 (standard dev session)

```bash
# Terminal 1 — ensure backend is running
./scripts/dev-hybrid.sh --infra-only   # or full ./scripts/dev-hybrid.sh

# Terminal 2 — start ngrok backend tunnel (note new URL each session)
ngrok http 3001

# Update .env with the new ngrok URL
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://NEW-URL.ngrok-free.app/api/v1|" \
  apps/parent-app-mobile/.env

# Terminal 3 — start Metro
cd apps/parent-app-mobile
pnpm exec expo start --tunnel
```

Then open Expo Go on your phone and scan the QR code.

### Non-WSL2 (same-network device)

```bash
# Ensure backend is running
./scripts/dev-hybrid.sh --infra-only

# Update .env with your machine's LAN IP (if it changed)
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):3001/api/v1|" \
  apps/parent-app-mobile/.env

# Start Metro
cd apps/parent-app-mobile
pnpm exec expo start
```

### Demo credentials

| Role   | Email               | Password    | Children linked |
| ------ | ------------------- | ----------- | --------------- |
| Parent | `parent1@sbtm.demo` | `Admin123!` | Yes (seeded)    |
| Parent | `parent2@sbtm.demo` | `Admin123!` | Yes (seeded)    |
| Driver | `driver1@sbtm.demo` | `Admin123!` | N/A             |

### Useful pnpm commands

```bash
# Install / update packages
pnpm install                          # from workspace root

# Run app
pnpm exec expo start                  # Metro, Expo Go QR
pnpm exec expo start --tunnel         # Metro via tunnel (WSL2)
pnpm exec expo start --go             # Force Expo Go mode
pnpm run android                      # Open on Android emulator
pnpm run ios                          # Open in iOS simulator
pnpm run web                          # Open in browser (limited)

# Tests
pnpm run test                         # Unit tests (Jest)
npx tsc --noEmit                      # TypeScript check

# Check Expo package compatibility
pnpm exec expo install --check
```
