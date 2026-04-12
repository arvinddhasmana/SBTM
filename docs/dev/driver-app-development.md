# Driver App — Development Guide

> **Audience:** Developers setting up the Driver App for the first time, or debugging a broken local environment.
> **Last updated:** 2026-04-12

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

The Driver App is a React Native / Expo mobile app for school bus drivers. It handles route selection, GPS tracking, student boarding/alighting, and emergency alerts.

### Tech Stack

| Layer        | Library                                 |
| ------------ | --------------------------------------- |
| Framework    | React Native 0.81 + Expo SDK 54         |
| State        | Zustand                                 |
| Navigation   | React Navigation 7 (native stack)       |
| HTTP         | Axios (with JWT interceptor)            |
| Storage      | Expo Secure Store                       |
| Maps         | React Native Maps                       |
| Location     | expo-location (foreground + background) |
| BLE          | react-native-ble-plx                    |
| Connectivity | @react-native-community/netinfo         |

### Source Layout

```
apps/driver-app/
├── index.ts                    # App entry point (registerRootComponent)
├── App.tsx                     # Root component, auth restore, nav tree
├── app.json                    # Expo config (permissions, plugins)
├── .env                        # Local env vars (not committed)
├── .env.example                # Template — copy to .env
└── src/
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── RouteSelectScreen.tsx
    │   ├── ActiveRouteScreen.tsx
    │   └── RosterScreen.tsx
    ├── services/
    │   ├── api.service.ts          # Axios instance + JWT interceptor
    │   ├── auth.service.ts         # Login, session restore, logout
    │   ├── gps.service.ts          # Foreground + background location
    │   ├── connectivity.service.ts # Network monitor, offline flush
    │   ├── ble.service.ts          # Bluetooth SmartTag detection
    │   ├── emergency.service.ts    # Panic button events
    │   ├── presence.service.ts     # Board/alight events
    │   ├── roster.service.ts       # Student roster fetch
    │   ├── route-lifecycle.service.ts
    │   └── offline-queue.service.ts
    ├── store/
    │   └── useDriverStore.ts       # Zustand store
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

| Tool  | Notes                                                                                                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ngrok | Free tier is enough. [ngrok.com/download](https://ngrok.com/download) — needed because WSL2 Docker ports are not directly reachable from your phone |

### Not needed for Expo Go development

- `eas-cli` — only required for building APKs to distribute
- Expo account — only required for EAS builds and `--tunnel` (Expo's own tunnel)
- Android Studio / Xcode — only required for emulators
- USB debugging — only required for direct APK install via `adb`

---

## First-Time Setup

### 1. Install dependencies

**From the workspace root** (not from inside `apps/driver-app`):

```bash
# Correct — installs all workspace packages including driver-app
pnpm install

# Wrong — triggers yarn build scripts that fail, misses workspace linking
cd apps/driver-app && pnpm install
```

Why: this is a pnpm workspace. `pnpm install` at the root resolves all packages together and avoids post-install script failures from packages that expect `yarn`.

### 2. Create the `.env` file

```bash
cp apps/driver-app/.env.example apps/driver-app/.env
```

Default value in `.env.example` targets the Android emulator (`10.0.2.2`). You will update this to your actual backend URL in the next sections.

### 3. Start the backend

The driver app communicates with the API Gateway on port 3001. Start the full stack from the workspace root:

```bash
docker compose up -d
```

Verify the API is healthy:

```bash
curl http://localhost:3001/api/v1/health
# Expected: {"status":"ok",...}
```

### 4. Seed the database (first time only)

```bash
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql
```

Verify the driver can log in:

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver1@sbtm.demo","password":"Admin123!"}'
# Expected: {"accessToken":"eyJ...","user":{...}}
```

---

## Running the App

### Option A: Expo Go on a Physical Device (Recommended)

Expo Go lets you run the app on your phone without building an APK. The Metro bundler serves the JavaScript bundle; the phone runs the native shell from the Expo Go app.

**When to use:** Day-to-day development, testing login, routes, presence. Fastest iteration cycle.

**Limitation:** BLE (Bluetooth SmartTag scanning) does not work in Expo Go — it requires a native build. GPS and all other features work fine.

#### Non-WSL2 (native Linux / macOS)

1. Ensure your phone and development machine are on the same WiFi.
2. Update `.env` with your LAN IP:

   ```bash
   # Find your machine's IP
   hostname -I | awk '{print $1}'
   # e.g. 192.168.1.42

   # Update .env
   sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://192.168.1.42:3001/api/v1|" \
     apps/driver-app/.env
   ```

3. Start Metro:
   ```bash
   cd apps/driver-app
   pnpm exec expo start
   ```
4. Open Expo Go on your phone → scan the QR code.

#### WSL2 (Windows Subsystem for Linux)

WSL2 runs a separate Linux kernel inside a VM. Docker containers and Metro run inside that VM. Your phone on WiFi cannot directly reach ports in the WSL2 VM — even with Windows Firewall rules, there is no Windows-side process listening to forward the traffic.

**Solution: use ngrok for both the backend API and the Metro bundler.**

See [WSL2 Networking](#wsl2-networking) for the full explanation and step-by-step setup.

---

### Option B: Android Emulator

**Prerequisite:** Android Studio installed with an AVD (Android Virtual Device) created.

The emulator uses a special IP `10.0.2.2` to reach the host machine's localhost:

```bash
# .env is already pre-configured with the emulator address:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1

cd apps/driver-app
pnpm run android
# or: pnpm exec expo start --android
```

**WSL2 note:** Running an Android emulator from WSL2 requires ADB bridging from Windows to WSL2. This is complex and prone to breakage across WSL2 restarts. For daily development, use a physical device with Expo Go + ngrok instead.

---

### Option C: Web Browser

```bash
cd apps/driver-app
pnpm run web
# or: pnpm exec expo start --web
```

**Limitations:** BLE and background GPS do not work on web. The web target exists for UI-only development only.

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

Docker Desktop's port mappings (`0.0.0.0:3001->3001`) are visible within WSL2 but are not exposed on the Windows network interface. `netstat` on Windows shows nothing listening on port 3001 — so your phone's TCP connection has nowhere to go.

### Solution: ngrok tunnels for both Metro and the API

ngrok runs inside WSL2 and can reach both Docker (`localhost:3001`) and Metro (`localhost:8081`). It creates public HTTPS URLs that your phone can reach from any network.

#### Step 1 — Install ngrok

```bash
# Download binary (no sudo required)
curl -Lo ~/ngrok.tgz https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xf ~/ngrok.tgz -C ~/
sudo mv ~/ngrok /usr/local/bin/
ngrok version   # should print: ngrok version 3.x
```

#### Step 2 — Register and authenticate (free account)

1. Sign up at [https://ngrok.com/signup](https://ngrok.com/signup)
2. Copy your authtoken from the dashboard
3. Run:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

#### Step 3 — Tunnel the backend (Terminal 1, keep open)

```bash
ngrok http 3001
```

You will see output like:

```
Forwarding   https://a1b2-192-168-2-135.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL.**

#### Step 4 — Update `.env` with the ngrok backend URL

```bash
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://YOUR-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# Verify
cat apps/driver-app/.env
# Expected last line: EXPO_PUBLIC_API_URL=https://YOUR-URL.ngrok-free.app/api/v1
```

**Important:** the URL must end with `/api/v1`. Without it, every request hits the root of the server and returns 404.

#### Step 5 — Start Metro with tunnel (Terminal 2)

```bash
cd apps/driver-app
pnpm exec expo start --tunnel
```

Expo's `--tunnel` proxies Metro through its own tunnel service (independent of your ngrok). The QR code in your terminal will contain a public URL your phone can scan.

#### Step 6 — Scan and log in

Open Expo Go → scan the QR code → app loads → log in with `driver1@sbtm.demo` / `Admin123!`.

### ngrok URL changes on each restart

Free ngrok tunnels generate a new URL every time you start `ngrok http 3001`. Each dev session:

```bash
# 1. Start ngrok, note new URL
ngrok http 3001

# 2. Update .env
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://NEW-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# 3. Restart Metro (picks up new .env)
cd apps/driver-app && pnpm exec expo start --tunnel
```

If you want a permanent static URL, ngrok's paid plan ($10/mo) supports custom domains.

---

## Building an APK

### Option A: EAS Cloud Build (no Android SDK required)

```bash
# Install EAS CLI globally (one time)
pnpm add -g eas-cli

# Log in to your Expo account
eas login

# First time: link the project
cd apps/driver-app
eas build:configure

# Build preview APK (~10 minutes on Expo servers)
eas build --platform android --profile preview
```

When complete, you get a download URL. Install on your phone directly from the URL, or download and transfer via USB.

### Option B: Local Build (requires Android SDK + JDK 17)

```bash
# Generate the native Android project
cd apps/driver-app
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

Install:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## Testing

### Unit tests

```bash
# From workspace root (runs all packages via Turborepo)
pnpm test

# Driver app only
cd apps/driver-app
pnpm run test

# With coverage
pnpm run test -- --coverage
```

Test files live next to the services they test:

```
src/services/gps.service.test.ts
src/services/ble.service.test.ts
src/services/roster.service.test.ts
src/services/presence.service.test.ts
src/services/route-lifecycle.service.test.ts
```

### TypeScript check

```bash
cd apps/driver-app
npx tsc --noEmit
```

---

## Environment Variables

All variables are prefixed `EXPO_PUBLIC_` so Expo injects them into the JS bundle at build time.

| Variable              | Required | Description                                              |
| --------------------- | -------- | -------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Yes      | Full base URL of the API Gateway **including `/api/v1`** |

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

**Cause:** Running `pnpm install` inside `apps/driver-app/` hits a post-install script in `@react-native-async-storage/async-storage` that requires yarn. This package is managed by pnpm at the workspace level.

**Fix:** Always install from the workspace root:

```bash
cd /path/to/SBTM
pnpm install
```

---

### 2. `expo-task-manager` version not found

**Symptom:**

```
npm error notarget No matching version found for expo-task-manager@~12.2.0
```

**Cause:** The version constraint `~12.2.0` was wrong — that version doesn't exist. Expo SDK 54 requires `~14.0.9`.

**Fix:** Already corrected in `package.json`. If you see this on a fresh checkout, run `pnpm install` from the root.

---

### 3. `--no-dev-client` flag unknown

**Symptom:**

```
unknown or unexpected option: --no-dev-client
```

**Cause:** This flag does not exist in Expo CLI. Expo Go is the default when no custom dev client is installed.

**Fix:** Remove the flag. Use `pnpm exec expo start` or `pnpm exec expo start --go` to explicitly target Expo Go.

---

### 4. Port conflict when starting Metro

**Symptom:**

```
Port 8081 is running this app in another window (pid XXXXX)
✔ Use port 8082 instead? … yes
```

**Cause:** A previous Metro process was not cleanly stopped.

**Fix:**

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:8082 | xargs kill -9 2>/dev/null
```

---

### 5. Login returns 404

**Symptom:** App shows "Request failed with status code 404" on login.

**Cause:** `EXPO_PUBLIC_API_URL` is missing the `/api/v1` suffix. The app calls `POST /auth/login` against the base URL, producing `https://your-url.ngrok-free.app/auth/login` (404) instead of `https://your-url.ngrok-free.app/api/v1/auth/login` (200).

**Fix:** Ensure `.env` ends with `/api/v1`:

```
EXPO_PUBLIC_API_URL=https://your-url.ngrok-free.app/api/v1
```

---

### 6. Login returns 500 after a successful POST /auth/login

**Symptom:** ngrok logs show `POST /auth/login 200` then `GET /driver/me/schedule 500`.

**Cause:** The `routes` table in the database was not seeded. The login succeeds but `getScheduleForDriver` queries `routes` with string IDs (`ROUTE-SingleBus-AM`) against a UUID-typed column, causing a PostgreSQL parse error.

**Fix:** The seed data in `scripts/init-db.sql` has been corrected. If working with an existing database, run this once:

```bash
docker compose exec postgres psql -U postgres -d sbms -c "
INSERT INTO routes (id, \"schoolId\", name, direction, \"vehicleId\", \"startTime\") VALUES
  ('a0000001-0000-0000-0000-000000000001',
   'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
   'Single Bus AM', 'AM', 'BUS-01', '07:15'),
  ('a0000001-0000-0000-0000-000000000002',
   'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
   'Single Bus PM', 'PM', 'BUS-01', '15:00')
ON CONFLICT (id) DO NOTHING;

UPDATE users
SET \"assignedRouteIds\" =
  'a0000001-0000-0000-0000-000000000001,a0000001-0000-0000-0000-000000000002'
WHERE email = 'driver1@sbtm.demo';
"
```

---

### 7. Phone shows "Failed to download remote update" in Expo Go

**Cause:** Expo Go can scan the QR code but cannot download the JS bundle from Metro. This is a network reachability issue — your phone cannot reach Metro's address.

**Fix:** Start Metro with `--tunnel`:

```bash
pnpm exec expo start --tunnel
```

---

## Daily Workflow Cheat Sheet

### WSL2 (standard dev session)

```bash
# Terminal 1 — verify backend is running
docker compose ps | grep api-gateway

# Terminal 2 — start ngrok backend tunnel (note new URL each session)
ngrok http 3001

# Update .env with the new ngrok URL
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://NEW-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# Terminal 3 — start Metro
cd apps/driver-app
pnpm exec expo start --tunnel
```

Then open Expo Go on your phone and scan the QR code.

### Non-WSL2 (same-network device)

```bash
# Verify backend
docker compose ps | grep api-gateway

# Start Metro
cd apps/driver-app
pnpm exec expo start

# On first run or IP change, update .env:
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$(hostname -I | awk '{print $1}'):3001/api/v1|" \
  apps/driver-app/.env
```

### Demo credentials

| Role         | Email                    | Password    |
| ------------ | ------------------------ | ----------- |
| Driver       | `driver1@sbtm.demo`      | `Admin123!` |
| School Admin | `school.admin@sbtm.demo` | `Admin123!` |
| Parent       | `parent1@sbtm.demo`      | `Admin123!` |

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
pnpm run web                          # Open in browser

# Tests
pnpm run test                         # Unit tests (Jest)
npx tsc --noEmit                      # TypeScript check

# Check Expo package compatibility
pnpm exec expo install --check
```
