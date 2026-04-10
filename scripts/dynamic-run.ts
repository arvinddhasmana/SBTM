/**
 * Dynamic Single-Bus Simulation Runner
 *
 * Features over singlebus-run.ts:
 *   - AM alert: 1 non-critical (LATE_ARRIVAL) auto-resolved
 *   - PM alerts: 1 non-critical (ROUTE_DEVIATION) + 1 critical (PANIC_BUTTON)
 *   - Bus halts during unresolved critical alert (polls until resolved/confirmed/false-alarm)
 *   - Driver explicitly confirms route completion after last student drop
 *   - No Phase C demos (fleet assignment / absence confirmation)
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://127.0.0.1:3001/api/v1';

// Global state for independent GPS broadcasting
let currentPosition: [number, number] | null = null;
let currentRouteId: string | null = null;
let currentVehicleId: string | null = null;
let isSimulationRunning = true;

async function apiPost(url: string, body: any, token?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`[API ERROR] ${url} - Status: ${response.status} ${response.statusText}`);
      console.error(`  > Body: ${JSON.stringify(body)}`);
      return null;
    }
    return response.json();
  } catch (e: any) {
    console.error(`[API FETCH ERROR] ${url} - Error: ${e.message}`);
    return null;
  }
}

async function apiGet(url: string, token: string) {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.error(`[API ERROR] GET ${url} - Status: ${response.status} ${response.statusText}`);
      return null;
    }
    return response.json();
  } catch (e: any) {
    console.error(`[API FETCH ERROR] GET ${url} - Error: ${e.message}`);
    return null;
  }
}

async function apiPatch(url: string, token: string, body: Record<string, unknown> = {}) {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`[API ERROR] PATCH ${url} - Status: ${response.status} ${response.statusText}`);
      return null;
    }
    return response.json();
  } catch (e: any) {
    console.error(`[API FETCH ERROR] PATCH ${url} - Error: ${e.message}`);
    return null;
  }
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Admin123!' }),
  });
  if (!res.ok) {
    console.error(`[AUTH ERROR] Failed to login: ${email}`);
    process.exit(1);
  }
  const { accessToken } = (await res.json()) as any;
  if (!accessToken) {
    console.error(`[AUTH ERROR] No access token for: ${email}`);
    process.exit(1);
  }
  return accessToken;
}

/**
 * Independent GPS loop: Sends the latest known position to the server
 * at a consistent interval, regardless of bus speed or stop status.
 */
async function startGpsLoop(driverToken: string, intervalSeconds: number) {
  console.log(`[GPS] Starting independent broadcaster (${intervalSeconds}s interval)`);

  while (isSimulationRunning) {
    if (currentPosition && currentRouteId && currentVehicleId) {
      await apiPost(
        `${API_BASE}/routes/locations`,
        {
          vehicleId: currentVehicleId,
          routeId: currentRouteId,
          timestamp: new Date().toISOString(),
          lat: currentPosition[0],
          lng: currentPosition[1],
          speedKph: 30,
        },
        driverToken,
      );
    }
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
}

const ALERT_DESCRIPTIONS: Record<string, (vehicleId: string, routeId: string) => string> = {
  LATE_ARRIVAL: (v, r) =>
    `Bus ${v} is running approximately 15 minutes behind schedule on route ${r}. Traffic congestion reported on the planned path.`,
  ROUTE_DEVIATION: (v, r) =>
    `Bus ${v} has deviated from the planned route ${r}. Driver has taken an alternate path due to road construction ahead.`,
  PANIC_BUTTON: (v, _r) =>
    `Emergency panic button was pressed on Bus ${v}. Driver has reported a safety concern near the current location.`,
};

async function runLap(
  config: any,
  routeKey: 'am' | 'pm',
  driverToken: string,
  adminToken: string,
  intervalSeconds: number,
) {
  const route = config[routeKey];
  const { routeId, decoded, stops } = route;
  const { vehicleId, driverId } = config.bus;
  const { id: schoolId, name: schoolName } = config.school;
  const allStudents = config.students;
  const visitedStops = new Set<string>();
  const sentAlerts = new Set<string>();
  const pendingAlerts: Array<{ alertId: string; eventType: string; resolveAt: number }> = [];

  currentRouteId = routeId;
  currentVehicleId = vehicleId;

  console.log(`\n--- Starting ${routeKey.toUpperCase()} Lap (${routeId}) ---`);

  // Record ROUTE_STARTED lifecycle event
  console.log(`[LIFECYCLE] Sending ROUTE_STARTED for ${routeId}`);
  await apiPost(
    `${API_BASE}/routes/lifecycle-events`,
    {
      routeId,
      vehicleId,
      eventType: 'ROUTE_STARTED',
      timestamp: new Date().toISOString(),
    },
    driverToken,
  );

  // PM route starts with boarding everyone at school
  if (routeKey === 'pm') {
    const [lat, lng] = decoded[0];
    currentPosition = [lat, lng];
    console.log(`[EVENT] Boarding all students at ${schoolName}`);
    for (const student of allStudents) {
      await apiPost(
        `${API_BASE}/student-presence-events`,
        {
          schoolId,
          studentId: student.id,
          vehicleId,
          routeId,
          eventType: 'BOARD',
          timestamp: new Date().toISOString(),
          source: 'MANUAL',
        },
        driverToken,
      );
    }
  }

  // Movement Loop
  for (let i = 0; i < decoded.length; i++) {
    const [lat, lng] = decoded[i];
    currentPosition = [lat, lng];
    const timestamp = new Date().toISOString();

    // Stop Detection
    const stopIdx = stops.findIndex(
      (s: any) =>
        !visitedStops.has(s.label) &&
        Math.abs(s.lat - lat) < 0.0001 &&
        Math.abs(s.lng - lng) < 0.0001,
    );

    if (stopIdx !== -1) {
      const stop = stops[stopIdx];
      visitedStops.add(stop.label);
      const event = routeKey === 'am' ? 'BOARD' : 'ALIGHT';

      console.log(`[STOP] Reached ${stop.label} - ${event} students: ${stop.students.join(', ')}`);

      for (const studentId of stop.students) {
        const student = allStudents.find((s: any) => s.id === studentId);
        const name = student ? `${student.firstName} ${student.lastName}` : studentId;

        console.log(`  > ${event}: ${name}`);
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId,
            vehicleId,
            routeId,
            eventType: event,
            timestamp,
            source: 'MANUAL',
          },
          driverToken,
        );
      }

      console.log(`[WAIT] Pausing at stop for 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }

    // AM: Alight all at school (final destination)
    if (i === decoded.length - 1 && routeKey === 'am') {
      console.log(`[EVENT] Alighting all students at ${schoolName}`);
      for (const student of allStudents) {
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId: student.id,
            vehicleId,
            routeId,
            eventType: 'ALIGHT',
            timestamp: new Date().toISOString(),
            source: 'MANUAL',
          },
          driverToken,
        );
      }
    }

    // Check for pending alert auto-resolutions
    for (let a = pendingAlerts.length - 1; a >= 0; a--) {
      const pending = pendingAlerts[a];
      if (i >= pending.resolveAt) {
        console.log(`[ALERT RESOLVED] Auto-resolving ${pending.eventType} (${pending.alertId})`);
        await apiPatch(`${API_BASE}/alerts/${pending.alertId}/resolve`, adminToken);
        pendingAlerts.splice(a, 1);
      }
    }

    // === AM ALERTS ===
    // 1 non-critical: LATE_ARRIVAL at 30%, auto-resolved at 60%
    if (routeKey === 'am') {
      if (i === Math.floor(decoded.length * 0.3) && !sentAlerts.has('AM_LATE_ARRIVAL')) {
        sentAlerts.add('AM_LATE_ARRIVAL');
        const desc = ALERT_DESCRIPTIONS.LATE_ARRIVAL(vehicleId, routeId);
        console.log(
          `[ALERT] Dispatching LATE_ARRIVAL (Tier 2, non-critical): ${desc.substring(0, 60)}...`,
        );
        const result = await apiPost(
          `${API_BASE}/emergency-events`,
          {
            schoolId,
            vehicleId,
            routeId,
            driverId,
            timestamp,
            lat,
            lng,
            eventType: 'LATE_ARRIVAL',
            description: desc,
          },
          driverToken,
        );
        if (result?.alertId) {
          pendingAlerts.push({
            alertId: result.alertId,
            eventType: 'LATE_ARRIVAL',
            resolveAt: Math.floor(decoded.length * 0.6),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // === PM ALERTS ===
    if (routeKey === 'pm') {
      // 1. Non-critical: ROUTE_DEVIATION at 20%, auto-resolved at 40%
      if (i === Math.floor(decoded.length * 0.2) && !sentAlerts.has('PM_ROUTE_DEVIATION')) {
        sentAlerts.add('PM_ROUTE_DEVIATION');
        const desc = ALERT_DESCRIPTIONS.ROUTE_DEVIATION(vehicleId, routeId);
        console.log(
          `[ALERT] Dispatching ROUTE_DEVIATION (Tier 2, non-critical): ${desc.substring(0, 60)}...`,
        );
        const result = await apiPost(
          `${API_BASE}/emergency-events`,
          {
            schoolId,
            vehicleId,
            routeId,
            driverId,
            timestamp,
            lat,
            lng,
            eventType: 'ROUTE_DEVIATION',
            description: desc,
          },
          driverToken,
        );
        if (result?.alertId) {
          pendingAlerts.push({
            alertId: result.alertId,
            eventType: 'ROUTE_DEVIATION',
            resolveAt: Math.floor(decoded.length * 0.4),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 2. Critical: PANIC_BUTTON at 50% — bus HALTS until resolved
      if (i === Math.floor(decoded.length * 0.5) && !sentAlerts.has('PM_PANIC_BUTTON')) {
        sentAlerts.add('PM_PANIC_BUTTON');
        const desc = ALERT_DESCRIPTIONS.PANIC_BUTTON(vehicleId, routeId);
        console.log(
          `[ALERT] Dispatching PANIC_BUTTON (Tier 1, CRITICAL): ${desc.substring(0, 60)}...`,
        );
        const result = await apiPost(
          `${API_BASE}/emergency-events`,
          {
            schoolId,
            vehicleId,
            routeId,
            driverId,
            timestamp,
            lat,
            lng,
            eventType: 'PANIC_BUTTON',
            description: desc,
          },
          driverToken,
        );

        if (result?.alertId) {
          console.log(`\x1b[31m[HALT] Bus stopped — awaiting critical alert resolution...\x1b[0m`);
          console.log(
            `\x1b[33m[HALT] Resolve/Confirm/False-Alarm the alert on the Dashboard to resume.\x1b[0m`,
          );

          // Poll until the alert is resolved, confirmed, or marked false alarm
          let alertResolved = false;
          while (!alertResolved) {
            await new Promise((r) => setTimeout(r, 5000));
            const alertData = await apiGet(`${API_BASE}/alerts/${result.alertId}`, adminToken);
            if (alertData && ['RESOLVED', 'CONFIRMED', 'FALSE_ALARM'].includes(alertData.status)) {
              alertResolved = true;
              console.log(
                `\x1b[32m[RESUME] Critical alert ${alertData.status} — bus resuming route\x1b[0m`,
              );
            } else {
              process.stdout.write('.');
            }
          }
        }
      }
    }

    // Control movement speed between polyline points
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }

  // Driver confirms route completion
  console.log(`\x1b[36m[LIFECYCLE] Driver confirming end of active route ${routeId}\x1b[0m`);
  await apiPost(
    `${API_BASE}/routes/lifecycle-events`,
    {
      routeId,
      vehicleId,
      eventType: 'ROUTE_COMPLETED',
      timestamp: new Date().toISOString(),
    },
    driverToken,
  );
}

async function main() {
  const configPath = path.join(process.cwd(), 'scripts/dynamic-config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`Config not found at ${configPath}. Run dynamic-simulate.sh first.`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const interval = parseFloat(process.argv[2]) || 1;

  console.log('--- SBTM Dynamic Single-Bus Simulation ---');
  console.log(`School: ${config.school.name} (${config.school.lat}, ${config.school.lng})`);
  console.log(`Students: ${config.students.length}, Parents: ${config.parents.length}`);
  console.log(`AM Stops: ${config.am.stops.length}, PM Stops: ${config.pm.stops.length}`);

  // Authenticate Driver
  const driverToken = await login(config.bus.driverEmail);

  // Authenticate Admin (for resolving alerts)
  const adminToken = await login('osta.admin@sbtm.demo');

  // Start the background GPS broadcaster
  startGpsLoop(driverToken, interval);

  // Execute AM Lap
  await runLap(config, 'am', driverToken, adminToken, interval);

  console.log('\n--- Simulation Hiatus (5s) ---');
  await new Promise((r) => setTimeout(r, 5000));

  // Execute PM Lap
  await runLap(config, 'pm', driverToken, adminToken, interval);

  isSimulationRunning = false;
  console.log('\n[COMPLETE] Dynamic simulation cycle finished.');
}

main().catch(console.error);
