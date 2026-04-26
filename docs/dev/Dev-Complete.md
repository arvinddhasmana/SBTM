# SBTM Developer Documentation -- Complete Reference

- Document owner: Engineering
- Last reviewed: 2026-04-14
- Primary use: Consolidated developer documentation combining all dev guides into a single reference

This document merges all SBTM developer documentation into one file for convenient offline reading, printing, or full-text search. Each section below contains the complete, unmodified content of its source file.

---

## Table of Contents

1. [Driver App -- Development Guide](#1-driver-app----development-guide) _(source: `docs/dev/driver-app-development.md`)_
2. [Local Development & Testing Guide](#2-local-development--testing-guide) _(source: `docs/dev/local_dev_testing_guide.md`)_
3. [Cloud Debugging Guide](cloud_debugging_guide.md) — debugging Azure-deployed `demo` / `production` (separate file; not inlined)

---

---

## 1. Driver App -- Development Guide

> **Source file:** `docs/dev/driver-app-development.md`

---

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

Variables prefixed `EXPO_PUBLIC_` are inlined into the JS bundle at build time.
Native-only secrets (e.g. the Google Maps key) are **not** prefixed and are
resolved by `app.config.js` from EAS-hosted secrets.

| Variable                      | Required                 | Scope                     | Description                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`         | Yes                      | Public (JS bundle)        | Full base URL of the API Gateway **including `/api/v1`**                                                                                                                                                                                                                                  |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Yes (Android standalone) | Native (Android manifest) | Google Maps SDK key. Stored as an EAS secret (project scope, `visibility=secret`) and injected into `AndroidManifest.xml` at build time via `app.config.js`. Not required for Expo Go. Restricted to package `com.sbtm.driver` + EAS keystore SHA-1 fingerprints in Google Cloud Console. |

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

---

---

## 2. Local Development & Testing Guide

> **Source file:** `docs/dev/local_dev_testing_guide.md`

---

# SBTM Local Development & Testing Guide

Efficient strategies for developing and testing the SBTM system locally. Three modes are available depending on what you're working on.

---

## Strategy Quick Reference

| Strategy        | What Starts                   | Best For                           | Command                   |
| :-------------- | :---------------------------- | :--------------------------------- | :------------------------ |
| **Mock Mode**   | Vite only                     | UI layout, styling, frontend logic | `./scripts/dev-mock.sh`   |
| **Hybrid Mode** | Docker infra + local services | Full-stack feature work            | `./scripts/dev-hybrid.sh` |
| **Full Docker** | Everything in containers      | CI/CD, final integration           | `docker compose up -d`    |

---

## Strategy 1: Mock Mode (Zero Backend)

The fastest path for UI-only changes. No Docker, no database, no backend services. All API calls return mock data from `src/services/mock/`.

```bash
./scripts/dev-mock.sh
```

- **URL**: `http://localhost:5173`
- **Login**: Any email/password works
- **Hot-reload**: Sub-100ms for CSS/TSX changes
- **Toggle at runtime**: Append `?mock=true` to any URL or set `VITE_USE_MOCK=true` in `.env`

### Mock Data Architecture

Mock code is completely separated from production code:

```
src/services/
├── api/           # Production API clients (axios)
│   ├── index.ts   # Barrel — conditionally exports mock or real
│   ├── auth.api.ts
│   ├── alerts.api.ts
│   └── ...
└── mock/          # Mock layer (only loaded when VITE_USE_MOCK=true)
    ├── index.ts   # Mock barrel
    ├── data/      # Pure data constants (one file per domain)
    │   ├── alerts.data.ts
    │   ├── routes.data.ts
    │   └── ...
    └── handlers/  # Mock API implementations
        ├── alerts.mock.ts
        ├── routes.mock.ts
        └── ...
```

> **To modify mock data**: Edit files in `src/services/mock/data/`. To change mock behavior, edit files in `src/services/mock/handlers/`.

---

## Strategy 2: Hybrid Mode (Docker Infra + Local Services)

Run infrastructure (Postgres, Redis, OSRM) in Docker while running application services directly on your machine for fast iteration.

### Full Hybrid (all services)

```bash
./scripts/dev-hybrid.sh
```

### Selective Services (only what you need)

```bash
./scripts/dev-hybrid.sh api-gateway gps-tracking
```

### Infrastructure Only (start services manually)

```bash
./scripts/dev-hybrid.sh --infra-only
cd services/api-gateway && pnpm run start:dev
```

### Environment Setup

Copy the template on first use:

```bash
cp .env.hybrid.template .env
```

Key settings for Hybrid mode:

- `DB_HOST=localhost`, `DB_PORT=5433` (Docker maps 5432→5433)
- `REDIS_HOST=localhost`, `REDIS_PORT=6379`
- All service URLs point to `http://localhost:300x`

### Stopping

```bash
./scripts/dev-stop.sh               # Stop everything
./scripts/dev-stop.sh --keep-infra  # Keep Docker running
```

### Running Simulation Data

To populate real-time GPS data on the map:

```bash
./scripts/simulate-demo.sh
```

---

## Strategy 3: Full Docker Mode

Runs everything in containers. Use for final integration testing or CI.

```bash
docker compose up -d --build
```

---

## User Accounts (Seed Data)

All accounts use password **`Admin123!`**.

| Role         | Email                    | Notes                                            |
| :----------- | :----------------------- | :----------------------------------------------- |
| SUPER_ADMIN  | `super.admin@sbtm.demo`  | Full system access                               |
| BOARD_ADMIN  | `board.admin@sbtm.demo`  | Board-level administration (OSDSB)               |
| OSTA_ADMIN   | `osta.admin@sbtm.demo`   | Fleet & route management                         |
| SCHOOL_ADMIN | `school.admin@sbtm.demo` | School-scoped operations (Greenfield Elementary) |
| DRIVER       | `driver1@sbtm.demo`      | Driver for BUS-01                                |
| PARENT       | `parent1@sbtm.demo`      | Parent portal (also parent2, parent4, parent5)   |

---

## Testing

### Frontend Tests (Vitest)

```bash
cd apps/admin-dashboard && pnpm run test
```

### Backend E2E Tests (Jest + Supertest)

```bash
cd services/<service-name> && pnpm run test:e2e
```

### E2E Browser UI Tests (Playwright)

Playwright tests run against the live admin dashboard and backend APIs. All 87 tests cover authentication, role-based sidebar navigation, route guards, compliance, students, and fleet pages.

**Prerequisites**: Hybrid or Full Docker mode must be running (backend + DB + admin-dashboard Vite dev server).

```bash
# Start the full stack first (choose one)
./scripts/dev-hybrid.sh           # Recommended for local E2E testing
# OR
docker compose up -d              # Full Docker mode

# Run all 87 E2E tests
pnpm --filter admin-dashboard test:e2e

# Run a single spec file
npx playwright test apps/admin-dashboard/e2e/auth.spec.ts

# Run with visible browser (headed mode)
pnpm --filter admin-dashboard test:e2e:headed

# Open the interactive Playwright UI
pnpm --filter admin-dashboard test:e2e:ui

# View the HTML test report after a run
npx playwright show-report apps/admin-dashboard/playwright-report
```

**Test files and coverage**:

| Spec file                    | Test IDs    | What it covers                           |
| :--------------------------- | :---------- | :--------------------------------------- |
| `auth.spec.ts`               | AT01–AT12   | Login form, role blocking, session flows |
| `sidebar-navigation.spec.ts` | SN01–SN18   | Role-based nav item visibility           |
| `route-guards.spec.ts`       | RG01–RG16   | Direct URL access enforcement per role   |
| `compliance.spec.ts`         | CP01–CP16   | Compliance page API + tab switching      |
| `students.spec.ts`           | STU01–STU12 | Students page tabs + API calls           |
| `fleet-assignments.spec.ts`  | FA01–FA10   | Fleet/assignments access per role        |

**loginAs fixture**: Tests use a shared `loginAs(page, role)` helper that:

1. Navigates to `/login`
2. Makes a real `POST /api/v1/auth/login` to obtain the `access_token` cookie (prevents 401 redirect from the api-client interceptor)
3. Sets `auth_user` in localStorage (used by `AuthContext` to set `isAuthenticated`)
4. Navigates to `/dashboard` and waits for React to fully bootstrap

### TypeScript Check

```bash
cd apps/admin-dashboard && npx tsc --noEmit
```

---

## Phase C: Testing New Workflows

These workflows require Hybrid or Full Docker mode with seeded data.

### Fleet Assignment Workflow

1. **Login as OSTA Admin** (`osta.admin@sbtm.demo`)
2. **Propose an assignment**:
   ```
   POST /api/v1/fleet-assignments
   { "routeId": "...", "busId": "...", "driverId": "...", "effectiveDate": "..." }
   ```
3. **Login as School Admin** (`school.admin@sbtm.demo`)
4. **Accept or reject**:
   ```
   PATCH /api/v1/fleet-assignments/:id/accept
   PATCH /api/v1/fleet-assignments/:id/reject
   ```

### Absence Confirmation Workflow

1. **Login as Parent** (`parent1@sbtm.demo`)
2. **Report an absence**:
   ```
   POST /api/v1/absences
   { "studentId": "...", "date": "...", "reason": "..." }
   ```
3. **Login as School Admin** (`school.admin@sbtm.demo`)
4. **Confirm or reject**:
   ```
   PATCH /api/v1/absences/:id/confirm
   PATCH /api/v1/absences/:id/reject
   ```

### Role-Based Sidebar

Login as each role (SUPER_ADMIN, BOARD_ADMIN, OSTA_ADMIN, SCHOOL_ADMIN, DRIVER, PARENT) and verify the sidebar shows only the menu items permitted for that role.

### Alert Ownership (School-Scoped)

1. Login as **School Admin** (`school.admin@sbtm.demo`)
2. Verify alerts are only visible/confirmable for routes belonging to Greenfield Elementary
3. Alerts from other schools should not appear

---

## Troubleshooting

| Problem                | Solution                                                                                          |
| :--------------------- | :------------------------------------------------------------------------------------------------ |
| 401 Unauthorized       | Clear `localStorage` (`localStorage.clear()`) and re-login                                        |
| DB connection refused  | Check `DB_HOST=localhost` and `DB_PORT=5433` in your env                                          |
| Port conflict          | Run `./scripts/dev-stop.sh` to kill stale processes. Check Docker isn't running the same service. |
| OSRM not starting      | Run `./scripts/setup-osrm.sh` first to download map data                                          |
| Service crash on start | Check logs in `.dev-logs/<service>.log`                                                           |

---

## AI Agent Recommendation

- For **UI-only changes**: Always use Mock Mode first (`./scripts/dev-mock.sh`).
- For **backend logic**: Use Hybrid Mode with only the relevant service.
- Never run Full Docker for iterative development--it's too slow.
