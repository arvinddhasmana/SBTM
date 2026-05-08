# Live Demo: Simulated Bus Movement in Driver App (Mock GPS)

- Document owner: Product, QA, and Engineering
- Last reviewed: 2026-05-08
- Primary use: Runbook for a live demo where a real Driver App on a phone drives GPS updates (simulated via mock-location), while Admin + Parent portals update from the backend

## Goal

Run a live demo with this setup:

1. A real phone runs the **Driver App** and uses a **GPS Mock Location** app to simulate a bus moving along a route.
2. The Driver App updates its UI based on GPS updates.
3. The driver can interact with the Driver App (panic/alerts + actions) during the demo.
4. The same GPS updates are sent to backend services so **Admin** and **Parent** portals see the bus moving.

This document focuses on the **driver-in-the-loop** approach. If you only need movement without a phone, the repo also contains a full simulator (`scripts/simulate-demo.sh`) referenced below.

## Recommended Tools (Free)

### GPS mock location (Android)

Recommended (route playback + GPX import):

- **GPS Joystick** (The App Ninjas) — supports GPX routes, speed control, pause/resume, and works well for “drive a route” demos.

Alternatives (point-to-point or simpler UI; may not support GPX as well):

- **Fake GPS Location** (Lexa)
- **Fake GPS** (varies by vendor; avoid unknown publishers)

Notes:

- Android mock-location is straightforward and reliable for demos.
- iOS mock-location on a _real device_ is much harder without dev tooling; for iOS, prefer running the Driver App on **Android** for the demo, or use Xcode location simulation for a debug build on a connected device.

### Connectivity / tunneling (when the phone cannot reach your backend)

Use one of these when the Driver phone is not on the same network as your backend:

- **Same Wi‑Fi LAN** (best for reliability; no tunnel needed)
- **ngrok** (free tier available; mentioned in `apps/driver-app/README.md`)
- **Cloudflare Tunnel** (free tier; good alternative to ngrok)
- **Tailscale** (free tier; simplest “private LAN over the internet” approach)

### Helpful demo utilities

- **Expo Go** (for quickly running the Driver App from `pnpm exec expo start`)
- **Android Developer Options** (to enable Mock Location app)
- **Screen recording** (Android built-in) for backup evidence if the live map glitches
- **Postman/Insomnia** (optional) for API sanity checks (login, route list, live location)

## Prerequisites

- Node.js installed and repo dependencies installed (`pnpm install` from repo root).
- Docker Desktop / Docker Engine available for local backend (recommended for repeatable demos).
- An **Android phone** available for the Driver App (preferred).
- Backend + portals are reachable from the phone (same Wi‑Fi or tunnel).

## Step-by-step (Manual + Automated)

### 1) Start backend + seed demo data (Automated)

From repo root:

1. Reset and seed the demo environment:

   ```bash
   ./scripts/reset-demo-db.sh
   ```

2. Verify the demo environment:

   ```bash
   ./scripts/verify-demo.sh
   ```

Expected outcome:

- API Gateway is running (default: `http://localhost:3001/api/v1`).
- Demo users exist (password `Admin123!`) and portals can log in.

Related references:

- `docs/Demo/DEMO_SETUP_GUIDE.md`
- `docs/Demo/LiveDemoScript.md`

### 2) Open Admin + Parent portals (Manual)

If running locally, open:

- Admin Dashboard (default): `http://localhost:5173`
- Parent Portal (default): `http://localhost:5174`

Logins (demo):

- Admin: `osta.admin@sbtm.demo` / `Admin123!`
- Parent: `parent1.stbern@sbtm.demo` (or another seeded parent) / `Admin123!`

### 3) Run the Driver App on a phone (Manual)

Follow the Driver App’s official setup:

- `apps/driver-app/README.md`

Minimum configuration:

1. Create env file:

   ```bash
   cp apps/driver-app/.env.example apps/driver-app/.env
   ```

2. Set `EXPO_PUBLIC_API_URL` so the phone can reach your backend:
   - Same Wi‑Fi LAN: `http://<YOUR_LAPTOP_LAN_IP>:3001/api/v1`
   - Tunnel: `https://<YOUR_TUNNEL_HOST>/api/v1`

3. Start Metro bundler:

   ```bash
   cd apps/driver-app
   pnpm exec expo start
   ```

4. On the Android phone, open **Expo Go** and scan the QR code.

Driver App notes for demos:

- Grant “Allow all the time” (background location) if prompted.
- Disable battery optimizations for Expo Go / the Driver App (Android Settings → Battery → Unrestricted), otherwise GPS updates may pause.

### 4) Enable Mock Location on Android (Manual)

On the Android driver phone:

1. Enable Developer Options:
   - Settings → About phone → tap “Build number” 7 times
2. Enable mock locations:
   - Settings → System → Developer options → **Select mock location app**
3. Choose your GPS mock app (e.g., **GPS Joystick**).
4. Keep Location set to high accuracy (Settings → Location → Location services).

### 5) Create a route file (GPX) from repo demo track (Automated)

The repository already contains realistic waypoint tracks used by the demo simulator:

- `scripts/demo-gps-track.json`

You can convert one route’s waypoints to a GPX file and import it into GPS Joystick.

Example: generate a GPX for `ROUTE-R01` from the default track:

```bash
mkdir -p /tmp/sbtm-demo-gpx
node - <<'NODE'
const fs = require('fs');
const path = require('path');

const trackPath = path.resolve('scripts/demo-gps-track.json');
const routeId = process.env.ROUTE_ID || 'ROUTE-R01';

const data = JSON.parse(fs.readFileSync(trackPath, 'utf8'));
const trackName = data.defaultTrack || Object.keys(data.tracks)[0];
const route = (data.tracks?.[trackName]?.routes || []).find(r => r.routeId === routeId);
if (!route) {
  console.error(`Route not found: ${routeId} (track=${trackName})`);
  process.exit(1);
}
const points = route.waypoints || [];
if (!points.length) {
  console.error(`No waypoints for route: ${routeId}`);
  process.exit(1);
}

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SBTM demo" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${esc(`${routeId} (${trackName})`)}</name><trkseg>
${points.map(p => `    <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join('\n')}
  </trkseg></trk>
</gpx>
`;

const out = path.resolve('/tmp/sbtm-demo-gpx', `${routeId}.gpx`);
fs.writeFileSync(out, gpx, 'utf8');
console.log(out);
NODE
```

Optional: pick a different route by setting `ROUTE_ID`:

```bash
ROUTE_ID=ROUTE-R02 node - <<'NODE'
const fs = require('fs');
const path = require('path');

const trackPath = path.resolve('scripts/demo-gps-track.json');
const routeId = process.env.ROUTE_ID || 'ROUTE-R02';

const data = JSON.parse(fs.readFileSync(trackPath, 'utf8'));
const trackName = data.defaultTrack || Object.keys(data.tracks)[0];
const route = (data.tracks?.[trackName]?.routes || []).find(r => r.routeId === routeId);
if (!route) process.exit(1);

const points = route.waypoints || [];
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SBTM demo" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${esc(`${routeId} (${trackName})`)}</name><trkseg>
${points.map(p => `    <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`).join('\n')}
  </trkseg></trk>
</gpx>
`;

const out = path.resolve('/tmp/sbtm-demo-gpx', `${routeId}.gpx`);
fs.writeFileSync(out, gpx, 'utf8');
console.log(out);
NODE
```

Transfer `/tmp/sbtm-demo-gpx/ROUTE-R01.gpx` to your phone (USB, email to yourself, Google Drive, etc.).

### 6) Play the route on the phone (Manual)

In **GPS Joystick** (or equivalent):

1. Import the GPX file.
2. Choose a playback mode (follow route / continuous).
3. Set a realistic speed (e.g., 20–40 km/h).
4. Start playback.

Expected outcome:

- The Driver App’s map marker moves (it uses `expo-location` watch updates).
- The Driver App posts points to the backend at `POST /api/v1/routes/locations`.

### 7) Drive the demo flow (Manual)

1. Driver App:
   - Log in as a demo driver (example from simulator config: `driver1@sbtm.demo` / `Admin123!`)
   - Select a route and start tracking (Active Route screen)
2. Confirm movement in Admin Dashboard:
   - Open the live tracking view for the same route/vehicle; verify the bus marker moves
3. Confirm movement in Parent Portal:
   - Open a child card on that route; verify location/ETA updates
4. Trigger driver actions during playback:
   - Use the Driver App’s emergency/panic action
   - Perform any route lifecycle actions supported by the screen (start/stop/complete)

## Optional: Hybrid Demo (Driver phone + scripted events)

If you want the driver phone to provide “real movement”, but still want additional events (alerts/presence) without manual tapping, you can run the simulator for everything _except_ the driver route, or run it on a different route:

- Simulator entry point: `scripts/simulate-demo.sh`
- Track config: `scripts/demo-gps-track.json`

Reference command (full automation, no phone required):

```bash
./scripts/simulate-demo.sh --interval 5 --laps 3
```

## Troubleshooting

### Driver App does not move, even though GPS Joystick is playing

- Confirm Android Developer Options → “Select mock location app” points to your mock app.
- Confirm Driver App has location permission (foreground and background).
- Disable battery optimizations for Expo Go / the Driver App.
- Keep the screen on during the demo (some phones throttle background tasks aggressively).

### Admin/Parent portals do not show movement

- Verify `EXPO_PUBLIC_API_URL` points to a backend reachable from the phone.
- If using LAN IP, ensure phone and laptop are on the same Wi‑Fi and no firewall blocks port `3001`.
- If using a tunnel, ensure the tunnel URL includes the `/api/v1` suffix.
- Confirm backend is seeded and healthy: `./scripts/verify-demo.sh`

### Backend receives points but UI does not update

- Refresh the Admin/Parent portals (polling/WS connection may have dropped).
- Confirm you are viewing the correct route/vehicle.

## Demo-day checklist

- [ ] Run `./scripts/reset-demo-db.sh` and `./scripts/verify-demo.sh`
- [ ] Confirm Admin + Parent portals login works
- [ ] Confirm Driver App connects to backend (`EXPO_PUBLIC_API_URL`)
- [ ] Confirm mock GPS playback moves the Driver App marker
- [ ] Confirm Admin + Parent portals reflect movement
- [ ] Rehearse 1–2 driver actions (panic + lifecycle event)
