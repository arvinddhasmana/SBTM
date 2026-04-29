/**
 * Seeded-DB Multi-Bus Simulation Runner
 *
 * Reads everything from the existing seeded DB (via `docker exec psql`),
 * builds the lap configs in memory, and drives both buses concurrently:
 *
 *   - GPS broadcaster per bus (independent of stops)
 *   - Stop detection + BOARD/ALIGHT presence events using stop coordinates
 *   - Lifecycle events: ROUTE_STARTED / ROUTE_COMPLETED
 *   - Alerts auto-distributed across the 4 routes:
 *       Bus 1 AM  : LATE_ARRIVAL    (Tier 2, auto-resolved later in the lap)
 *       Bus 1 PM  : ROUTE_DEVIATION (Tier 2, auto-resolved later in the lap)
 *       Bus 2 AM  : LATE_ARRIVAL    (Tier 2, auto-resolved later in the lap)
 *       Bus 2 PM  : PANIC_BUTTON    (Tier 1, CRITICAL — bus halts until resolved)
 *
 * Inputs (env):
 *   SCHOOL_ID     UUID of the chosen school
 *   ROUTE_IDS     space-separated list of 4 route ids (am1 pm1 am2 pm2)
 *   DRIVER_EMAIL  driver login email for the school
 *
 * Args:
 *   intervalSeconds (default 1)
 */

import { execFileSync } from 'child_process';

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const CONTAINER = 'sbtm-postgres-1';
const ADMIN_EMAIL = 'osta.admin@sbtm.demo';
const PASSWORD = 'Admin123!';

// ───────────────────────── psql helpers ─────────────────────────

function psql(query: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'sbms',
      '-t',
      '-A',
      '-F',
      '\t',
      '-c',
      query,
    ],
    { encoding: 'utf8' },
  ).trim();
}

function psqlRows(query: string): string[][] {
  const out = psql(query);
  if (!out) return [];
  return out.split('\n').map((r) => r.split('\t'));
}

// ─────────────────── polyline decoder (Google) ───────────────────

function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const out: [number, number][] = [];
  const factor = Math.pow(10, precision);
  while (index < str.length) {
    let byte: number;
    let shift = 0;
    let result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    out.push([lat / factor, lng / factor]);
  }
  return out;
}

// ─────────────────── HTTP helpers ───────────────────

async function apiPost(url: string, body: unknown, token?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!r.ok) {
      console.error(`[API ERROR] POST ${url} -> ${r.status}`);
      return null;
    }
    return r.json();
  } catch (e: any) {
    console.error(`[API FETCH ERROR] POST ${url}: ${e.message}`);
    return null;
  }
}

async function apiPatch(url: string, token: string, body: unknown = {}) {
  try {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error(`[API ERROR] PATCH ${url} -> ${r.status}`);
    return r.ok ? r.json() : null;
  } catch (e: any) {
    console.error(`[API FETCH ERROR] PATCH ${url}: ${e.message}`);
    return null;
  }
}

async function apiGet(url: string, token: string) {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

async function login(email: string): Promise<string> {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!r.ok) {
    console.error(`[AUTH] Login failed for ${email}: ${r.status}`);
    process.exit(1);
  }
  const j = (await r.json()) as { accessToken?: string };
  if (!j.accessToken) {
    console.error(`[AUTH] No access token returned for ${email}`);
    process.exit(1);
  }
  return j.accessToken;
}

// ─────────────────── config builder ───────────────────

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  studentIds: string[];
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
}
interface RouteCfg {
  id: string;
  name: string;
  direction: 'AM' | 'PM';
  vehicleId: string;
  driverId: string;
  decoded: [number, number][];
  stops: Stop[];
  students: Student[]; // all students assigned to this lap
}
interface BusCfg {
  vehicleId: string;
  am: RouteCfg;
  pm: RouteCfg;
}

function loadRoute(routeId: string): RouteCfg {
  const rows = psqlRows(
    `SELECT id, name, direction, "vehicleId", "driverId", polyline FROM routes_reference WHERE id = '${routeId}';`,
  );
  if (rows.length === 0) throw new Error(`Route ${routeId} not found`);
  const [id, name, direction, vehicleId, driverId, polyline] = rows[0];
  if (!polyline) throw new Error(`Route ${routeId} has no polyline`);

  const stopRows = psqlRows(
    `SELECT id, "stopName", lat, lng FROM route_stops_reference WHERE "routeId" = '${routeId}' ORDER BY "sequenceOrder";`,
  );
  const colStop = direction === 'AM' ? '"amStopId"' : '"pmStopId"';
  const colRoute = direction === 'AM' ? '"amRouteId"' : '"pmRouteId"';
  const studentRows = psqlRows(
    `SELECT id, "firstName", "lastName", ${colStop} FROM students_reference WHERE ${colRoute} = '${routeId}' ORDER BY id;`,
  );

  const studentsByStop = new Map<string, string[]>();
  const students: Student[] = [];
  for (const [sid, fn, ln, stopId] of studentRows) {
    students.push({ id: sid, firstName: fn, lastName: ln });
    if (stopId) {
      if (!studentsByStop.has(stopId)) studentsByStop.set(stopId, []);
      studentsByStop.get(stopId)!.push(sid);
    }
  }

  const stops: Stop[] = stopRows.map(([sid, sname, latS, lngS]) => ({
    id: sid,
    name: sname,
    lat: parseFloat(latS),
    lng: parseFloat(lngS),
    studentIds: studentsByStop.get(sid) ?? [],
  }));

  return {
    id,
    name,
    direction: direction as 'AM' | 'PM',
    vehicleId,
    driverId,
    decoded: decodePolyline(polyline),
    stops,
    students,
  };
}

// ─────────────────── per-bus simulation state ───────────────────

interface BusState {
  vehicleId: string;
  position: [number, number] | null;
  routeId: string | null;
  running: boolean;
}

const busStates = new Map<string, BusState>();

async function gpsLoop(driverToken: string, intervalSeconds: number) {
  console.log(`[GPS] broadcaster started (${intervalSeconds}s)`);
  while ([...busStates.values()].some((b) => b.running)) {
    for (const b of busStates.values()) {
      if (b.position && b.routeId) {
        await apiPost(
          `${API_BASE}/routes/locations`,
          {
            vehicleId: b.vehicleId,
            routeId: b.routeId,
            timestamp: new Date().toISOString(),
            lat: b.position[0],
            lng: b.position[1],
            speedKph: 30,
          },
          driverToken,
        );
      }
    }
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
  console.log(`[GPS] broadcaster stopped`);
}

// ─────────────────── alert plan ───────────────────

type AlertType = 'LATE_ARRIVAL' | 'ROUTE_DEVIATION' | 'PANIC_BUTTON';
interface AlertPlan {
  type: AlertType;
  triggerFraction: number; // 0..1 along decoded
  resolveFraction?: number; // for non-critical, auto-resolve at this point
  critical?: boolean; // bus halts until resolved on dashboard
}

function planAlertsFor(busIdx: number, direction: 'AM' | 'PM'): AlertPlan[] {
  // 0-indexed: bus 0 = pair 1, bus 1 = pair 2
  if (busIdx === 0 && direction === 'AM') {
    return [{ type: 'LATE_ARRIVAL', triggerFraction: 0.3, resolveFraction: 0.6 }];
  }
  if (busIdx === 0 && direction === 'PM') {
    return [{ type: 'ROUTE_DEVIATION', triggerFraction: 0.25, resolveFraction: 0.55 }];
  }
  if (busIdx === 1 && direction === 'AM') {
    return [{ type: 'LATE_ARRIVAL', triggerFraction: 0.4, resolveFraction: 0.7 }];
  }
  // bus 1 PM — critical halt
  return [{ type: 'PANIC_BUTTON', triggerFraction: 0.5, critical: true }];
}

const ALERT_DESC: Record<AlertType, (v: string, r: string) => string> = {
  LATE_ARRIVAL: (v, r) =>
    `Bus ${v} is running ~15 min behind schedule on ${r}. Traffic congestion on planned path.`,
  ROUTE_DEVIATION: (v, r) =>
    `Bus ${v} has deviated from ${r}. Driver took alternate path due to road construction.`,
  PANIC_BUTTON: (v, _r) =>
    `Emergency panic button pressed on Bus ${v}. Driver reports safety concern.`,
};

// ─────────────────── lap runner ───────────────────

async function runLap(
  bus: BusCfg,
  busIdx: number,
  routeKey: 'am' | 'pm',
  schoolId: string,
  driverToken: string,
  adminToken: string,
  intervalSeconds: number,
) {
  const route = bus[routeKey];
  const { id: routeId, decoded, stops, vehicleId, driverId, students } = route;
  const state = busStates.get(vehicleId)!;
  state.routeId = routeId;
  state.position = decoded[0];

  const visited = new Set<string>();
  const sentAlerts = new Set<AlertType>();
  const pending: Array<{ alertId: string; type: AlertType; resolveAt: number }> = [];
  const alerts = planAlertsFor(busIdx, route.direction);

  const tag = `[Bus${busIdx + 1}/${route.direction}]`;
  console.log(
    `\n${tag} === START lap ${routeId} (${decoded.length} pts, ${stops.length} stops, ${students.length} students)`,
  );

  await apiPost(
    `${API_BASE}/routes/lifecycle-events`,
    { routeId, vehicleId, eventType: 'ROUTE_STARTED', timestamp: new Date().toISOString() },
    driverToken,
  );

  // PM lap: students board at school start
  if (routeKey === 'pm' && students.length) {
    console.log(`${tag} BOARD all ${students.length} students at school`);
    for (const s of students) {
      await apiPost(
        `${API_BASE}/student-presence-events`,
        {
          schoolId,
          studentId: s.id,
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

  for (let i = 0; i < decoded.length; i++) {
    const [lat, lng] = decoded[i];
    state.position = [lat, lng];
    const ts = new Date().toISOString();

    // proximity stop detection (~11 m)
    const stopIdx = stops.findIndex(
      (s) => !visited.has(s.id) && Math.abs(s.lat - lat) < 0.0001 && Math.abs(s.lng - lng) < 0.0001,
    );

    if (stopIdx !== -1) {
      const stop = stops[stopIdx];
      visited.add(stop.id);
      const evt = routeKey === 'am' ? 'BOARD' : 'ALIGHT';
      console.log(`${tag} STOP ${stop.name} -> ${evt} ${stop.studentIds.length} student(s)`);
      for (const sid of stop.studentIds) {
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId: sid,
            vehicleId,
            routeId,
            eventType: evt,
            timestamp: ts,
            source: 'MANUAL',
          },
          driverToken,
        );
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // AM final destination = school: alight all
    if (i === decoded.length - 1 && routeKey === 'am' && students.length) {
      console.log(`${tag} ALIGHT all ${students.length} students at school`);
      for (const s of students) {
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId: s.id,
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

    // auto-resolve pending non-critical alerts
    for (let a = pending.length - 1; a >= 0; a--) {
      if (i >= pending[a].resolveAt) {
        console.log(`${tag} ALERT auto-resolve ${pending[a].type}`);
        await apiPatch(`${API_BASE}/alerts/${pending[a].alertId}/resolve`, adminToken);
        pending.splice(a, 1);
      }
    }

    // dispatch alerts per plan
    for (const plan of alerts) {
      if (sentAlerts.has(plan.type)) continue;
      if (i < Math.floor(decoded.length * plan.triggerFraction)) continue;
      sentAlerts.add(plan.type);
      const desc = ALERT_DESC[plan.type](vehicleId, routeId);
      console.log(
        `${tag} ALERT dispatch ${plan.type}${plan.critical ? ' (CRITICAL)' : ''}: ${desc.slice(0, 70)}...`,
      );
      const result = await apiPost(
        `${API_BASE}/emergency-events`,
        {
          schoolId,
          vehicleId,
          routeId,
          driverId,
          timestamp: ts,
          lat,
          lng,
          eventType: plan.type,
          description: desc,
        },
        driverToken,
      );
      const alertId = (result as any)?.alertId;
      if (!alertId) continue;

      if (plan.critical) {
        console.log(`\x1b[31m${tag} HALT — awaiting resolution on Dashboard\x1b[0m`);
        let resolved = false;
        while (!resolved) {
          await new Promise((r) => setTimeout(r, 5000));
          const a = await apiGet(`${API_BASE}/alerts/${alertId}`, adminToken);
          if (a && ['RESOLVED', 'CONFIRMED', 'FALSE_ALARM'].includes((a as any).status)) {
            resolved = true;
            console.log(`\x1b[32m${tag} RESUME (${(a as any).status})\x1b[0m`);
          } else {
            process.stdout.write('.');
          }
        }
      } else if (plan.resolveFraction !== undefined) {
        pending.push({
          alertId,
          type: plan.type,
          resolveAt: Math.floor(decoded.length * plan.resolveFraction),
        });
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }

  await apiPost(
    `${API_BASE}/routes/lifecycle-events`,
    { routeId, vehicleId, eventType: 'ROUTE_COMPLETED', timestamp: new Date().toISOString() },
    driverToken,
  );
  console.log(`${tag} === END lap ${routeId}`);
}

async function runBus(
  bus: BusCfg,
  busIdx: number,
  schoolId: string,
  driverToken: string,
  adminToken: string,
  intervalSeconds: number,
) {
  await runLap(bus, busIdx, 'am', schoolId, driverToken, adminToken, intervalSeconds);
  await new Promise((r) => setTimeout(r, 3000));
  await runLap(bus, busIdx, 'pm', schoolId, driverToken, adminToken, intervalSeconds);
  busStates.get(bus.vehicleId)!.running = false;
}

// ─────────────────── main ───────────────────

async function main() {
  const schoolId = process.env.SCHOOL_ID;
  const routeIdsCsv = process.env.ROUTE_IDS;
  const driverEmail = process.env.DRIVER_EMAIL;
  const interval = parseFloat(process.argv[2]) || 1;

  if (!schoolId || !routeIdsCsv || !driverEmail) {
    console.error('Missing env: SCHOOL_ID, ROUTE_IDS, DRIVER_EMAIL');
    process.exit(1);
  }
  const routeIds = routeIdsCsv.trim().split(/\s+/);
  if (routeIds.length !== 4) {
    console.error(
      `Expected 4 route ids (am1 pm1 am2 pm2), got ${routeIds.length}: ${routeIds.join(',')}`,
    );
    process.exit(1);
  }

  console.log('Loading route configs from DB...');
  const am1 = loadRoute(routeIds[0]);
  const pm1 = loadRoute(routeIds[1]);
  const am2 = loadRoute(routeIds[2]);
  const pm2 = loadRoute(routeIds[3]);

  if (am1.vehicleId !== pm1.vehicleId) {
    console.warn(
      `Pair 1 vehicle mismatch: AM=${am1.vehicleId} PM=${pm1.vehicleId} — using AM's vehicle for both`,
    );
    pm1.vehicleId = am1.vehicleId;
  }
  if (am2.vehicleId !== pm2.vehicleId) {
    console.warn(
      `Pair 2 vehicle mismatch: AM=${am2.vehicleId} PM=${pm2.vehicleId} — using AM's vehicle for both`,
    );
    pm2.vehicleId = am2.vehicleId;
  }

  const buses: BusCfg[] = [
    { vehicleId: am1.vehicleId, am: am1, pm: pm1 },
    { vehicleId: am2.vehicleId, am: am2, pm: pm2 },
  ];

  for (const b of buses) {
    busStates.set(b.vehicleId, {
      vehicleId: b.vehicleId,
      position: null,
      routeId: null,
      running: true,
    });
    // wipe stale GPS for clean demo
    try {
      execFileSync(
        'docker',
        [
          'exec',
          CONTAINER,
          'psql',
          '-U',
          'postgres',
          '-d',
          'sbms',
          '-c',
          `DELETE FROM location_points WHERE vehicle_id = '${b.vehicleId}';`,
        ],
        { stdio: 'ignore' },
      );
    } catch {
      /* ignore */
    }
  }

  console.log(`Authenticating driver: ${driverEmail}`);
  const driverToken = await login(driverEmail);
  console.log(`Authenticating admin: ${ADMIN_EMAIL}`);
  const adminToken = await login(ADMIN_EMAIL);

  // start GPS broadcaster (background)
  gpsLoop(driverToken, interval);

  // Drive both buses concurrently
  await Promise.all(
    buses.map((b, idx) => runBus(b, idx, schoolId, driverToken, adminToken, interval)),
  );

  console.log('\n[COMPLETE] All buses finished AM + PM laps.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
