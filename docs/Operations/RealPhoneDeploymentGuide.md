# Real Phone Deployment Guide

Deploy the SBTM backend and test the Driver App on a real phone — GPS tracking, board/alight events, and emergency alerts over a live bus route.

## Architecture

```
┌─────────────┐     HTTPS/ngrok      ┌─────────────────────────────┐
│  Your Phone  │ ──────────────────→  │   Dev Machine               │
│  (Driver App)│                      │                             │
│              │  GPS events ────→    │  Docker Compose Stack       │
│              │  Board/Alight ──→    │  ┌─ API Gateway      :3001  │
│              │  Emergency ─────→    │  ├─ GPS Tracking     :3002  │
│              │  Lifecycle ─────→    │  ├─ Emergency Alerts :3003  │
└─────────────┘                      │  ├─ Student Presence :3004  │
                                     │  ├─ PostgreSQL        :5433  │
┌─────────────┐                      │  └─ Redis             :6379  │
│  Browser     │ ← SSE/Polling ───   │                             │
│  (Dashboard) │                      │  Admin Dashboard     :5173  │
└─────────────┘                      │  Parent Portal        :3000  │
                                     └─────────────────────────────┘
```

## Connectivity Options

| Method                     | Cost         | Works on mobile data? | Setup effort         |
| -------------------------- | ------------ | --------------------- | -------------------- |
| **ngrok** (recommended)    | Free tier    | Yes                   | Install ngrok        |
| **Cloudflare Tunnel**      | Free         | Yes                   | Install cloudflared  |
| **LAN only**               | Free         | No — same WiFi only   | None                 |
| **Oracle Cloud Free Tier** | Free forever | Yes                   | 2 ARM VMs            |
| **Hetzner VPS**            | ~$4/mo       | Yes                   | Cheapest paid option |

For a driving test away from home WiFi, use **ngrok** (free tier is sufficient).

## Prerequisites

|                                      | Notes                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| Docker Desktop                       | Runs the full backend stack                                                                 |
| Node.js 20+ and pnpm 9+              | Use `pnpm`, not `npm` — this is a pnpm workspace                                            |
| ngrok                                | [ngrok.com/download](https://ngrok.com/download) — required for WSL2, recommended elsewhere |
| Expo Go on Android                   | For development testing without building an APK                                             |
| `eas-cli` (`npm install -g eas-cli`) | Only needed if building an APK via EAS cloud                                                |
| Expo account                         | Only needed for EAS APK builds                                                              |
| Android phone with USB debugging     | Only needed for direct `adb install` of APK                                                 |

## Quick Start (all-in-one script)

```bash
# Start backend + ngrok tunnel + seed DB + print all URLs
./scripts/phone-deploy.sh --ngrok
```

This starts the minimal Docker stack, seeds the demo database, starts an ngrok tunnel, writes `apps/driver-app/.env`, starts the Dashboard and Portal, and prints all credentials.

---

## Step-by-Step

### Step 1 — Start the backend

```bash
# Start the full stack
docker compose up -d

# First-time only: seed the demo database
docker compose exec -T postgres psql -U postgres -d sbms < scripts/init-db.sql

# Verify the API is healthy
curl http://localhost:3001/api/v1/health
```

Alternatively, start only the services the driver app needs:

```bash
docker compose up -d postgres redis api-gateway gps-tracking emergency-alerts student-presence
```

### Step 2 — Open a tunnel to the backend

```bash
ngrok http 3001
```

Note the HTTPS forwarding URL (e.g., `https://a1b2-xx-xx.ngrok-free.app`).

**WSL2 users:** Docker ports are only accessible inside the WSL2 VM — your phone cannot reach them from the LAN even with Windows Firewall rules open. ngrok is the correct solution and not optional on WSL2.

### Step 3 — Configure the driver app

```bash
# IMPORTANT: end with /api/v1 — without it, all requests return 404
sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://YOUR-NGROK-URL.ngrok-free.app/api/v1|" \
  apps/driver-app/.env

# Install/update packages (from workspace root)
pnpm install
```

Verify the login endpoint through the tunnel before opening the app:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://YOUR-NGROK-URL.ngrok-free.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver1@sbtm.demo","password":"Admin123!"}'
# Expected: 200
```

### Step 4 — Run on Expo Go (development testing)

```bash
cd apps/driver-app

# WSL2 — must also tunnel Metro
pnpm exec expo start --tunnel

# Non-WSL2 (same-network device)
pnpm exec expo start
```

Open Expo Go on your phone and scan the QR code.

### Step 5 — Build an APK (optional — for install without Expo Go)

#### Option A: EAS cloud build (no Android SDK needed)

```bash
cd apps/driver-app

# Link to your Expo account (one time)
eas login
eas build:configure

# Build — takes ~10 minutes on Expo servers
eas build --platform android --profile preview

# Download the APK from the URL printed at the end
```

#### Option B: Local build (requires Android SDK + JDK 17)

```bash
cd apps/driver-app

# Generate native Android project
npx expo prebuild --platform android

# Build
cd android && ./gradlew assembleRelease

# APK output path
# android/app/build/outputs/apk/release/app-release.apk
```

### Step 6 — Install APK on device

```bash
# Via USB (requires adb)
adb install android/app/build/outputs/apk/release/app-release.apk

# Alternatively: share the file via email or Google Drive and open on device
```

### Step 7 — Test the full flow

**On your phone (Driver App):**

1. Log in with `driver1@sbtm.demo` / `Admin123!`
2. Select the **Single Bus AM** or **Single Bus PM** route
3. Grant location permissions — choose **"Allow all the time"** for background tracking
4. Tap **Start Route**
5. Open **Roster** to board and alight students
6. Tap **PANIC** to test emergency alerts
7. Lock screen — GPS should continue via background task (check the notification in Android status bar)

**On your computer (Admin Dashboard at http://localhost:5173):**

1. Log in with `school.admin@sbtm.demo` / `Admin123!`
2. Watch the live map for the bus position updating in real time
3. Check the Alerts panel for the PANIC alert
4. Check the Passenger Feed for board/alight events

**On your computer (Parent Portal at http://localhost:3000):**

1. Log in with `parent1@sbtm.demo` / `Admin123!`
2. Go to the Map page to see the live bus location

---

## Event Flow Reference

| Event          | Driver Action              | API Endpoint                    | Verify On                  |
| -------------- | -------------------------- | ------------------------------- | -------------------------- |
| GPS Location   | Automatic every 5 s / 10 m | `POST /routes/locations`        | Dashboard → Live Map       |
| Route Start    | Select route → Start       | `POST /routes/lifecycle-events` | Dashboard → Routes         |
| Board Student  | Tap student → Boarded      | `POST /student-presence-events` | Dashboard → Passenger Feed |
| Alight Student | Tap student → Alighted     | `POST /student-presence-events` | Dashboard → Passenger Feed |
| Panic Alert    | Tap PANIC                  | `POST /emergency-events`        | Dashboard → Alerts         |
| Route End      | Tap End Route              | `POST /routes/lifecycle-events` | Dashboard → Routes         |
| Background GPS | Lock screen                | Background task continues       | Dashboard → Live Map       |
| Offline Buffer | Airplane mode              | Events queue locally            | Arrive after reconnect     |

---

## Credentials Reference

All passwords are `Admin123!`.

| Role                      | Email                    |
| ------------------------- | ------------------------ |
| Super Admin               | `super.admin@sbtm.demo`  |
| OSTA Admin                | `osta.admin@sbtm.demo`   |
| Board Admin               | `board.admin@sbtm.demo`  |
| School Admin (Greenfield) | `school.admin@sbtm.demo` |
| **Driver**                | **`driver1@sbtm.demo`**  |
| Parent 1                  | `parent1@sbtm.demo`      |
| Parent 2                  | `parent2@sbtm.demo`      |
| Parent 4                  | `parent4@sbtm.demo`      |
| Parent 5                  | `parent5@sbtm.demo`      |

---

## Troubleshooting

### App shows "network error" or "Request failed with status code 404" on login

- Confirm `EXPO_PUBLIC_API_URL` in `apps/driver-app/.env` ends with `/api/v1`
- Confirm ngrok is still running and the URL matches
- Test the endpoint directly: `curl https://YOUR-URL.ngrok-free.app/api/v1/health`

### Login succeeds but app shows error (status 500)

The schedule endpoint (`GET /driver/me/schedule`) returned 500. This means the `routes` table in the database is not seeded. Fix for an existing database:

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

This fix is already applied in `scripts/init-db.sql` — it only needs to be run manually against databases seeded before this fix.

### Expo Go shows "Failed to download remote update"

Metro is running but your phone cannot reach it. Start Metro with the tunnel flag:

```bash
pnpm exec expo start --tunnel
```

### GPS not updating on the dashboard

- Check that you granted **"Allow all the time"** location permission on Android
- Disable battery optimization for the SBTM Driver app in Android settings
- Verify the **"SBTM Driver — Tracking route in progress"** notification is visible while routing

### ngrok tunnel stopped working

Free ngrok sessions expire after 8 hours. Restart with `ngrok http 3001`, update `.env`, and restart Metro.

### Port conflict when starting Metro

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
```

---

## Stopping Everything

```bash
docker compose down          # stop and remove containers
pkill -f 'ngrok http'        # stop ngrok
```

---

## Related Docs

- [Driver App Development Guide](dev/driver-app-development.md) — detailed setup, WSL2 networking, known issues
- [Demo Setup Guide](Demo/DEMO_SETUP_GUIDE.md) — full demo simulation with all roles
- [Local Dev Testing Guide](dev/local_dev_testing_guide.md) — Mock / Hybrid / Full Docker modes
