/**
 * SBTM Demo Simulation Runner
 *
 * Runs on top of seeded data from reset-demo-db.sh.
 * Does NOT create any new data entities.
 *
 * For each school/route:
 *   - Route 1: Full alert lifecycle (all Tier 1 + Tier 2 alerts, auto-managed)
 *   - Other routes: 0 or 1 Tier-2 alert
 *
 * Critical (Tier 1) alerts halt the bus until resolved.
 * All alerts are auto-confirmed, escalated, status-updated, and resolved.
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://127.0.0.1:3001/api/v1';

// ─── Polyline Decoder (Google Encoded Polyline Algorithm) ───────

function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
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

    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

// ─── HTTP Helpers ───────────────────────────────────────────────

async function apiPost(url: string, body: any, token?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      console.error(`[API ERROR] POST ${url} — ${response.status} ${response.statusText}`);
      return null;
    }
    return response.json();
  } catch (e: any) {
    console.error(`[API FETCH ERROR] POST ${url} — ${e.message}`);
    return null;
  }
}

async function apiGet(url: string, token: string) {
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function apiPatch(url: string, token: string, body: Record<string, unknown> = {}) {
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`[API ERROR] PATCH ${url} — ${response.status} ${response.statusText}`);
      return null;
    }
    return response.json();
  } catch (e: any) {
    console.error(`[API FETCH ERROR] PATCH ${url} — ${e.message}`);
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Alert Definitions ──────────────────────────────────────────

const ALERT_DESCRIPTIONS: Record<string, (vehicleId: string, routeId: string) => string> = {
  LATE_DEPARTURE: (v, r) =>
    `Bus ${v} departed 12 minutes behind schedule on route ${r}. Driver was delayed at the depot due to a vehicle inspection.`,
  MEDICAL: (v, _r) =>
    `Medical concern reported on Bus ${v}. A student reported feeling unwell — possible motion sickness. Driver assessing the situation.`,
  LATE_ARRIVAL: (v, r) =>
    `Bus ${v} is running approximately 15 minutes behind schedule on route ${r}. Traffic congestion reported on the planned path.`,
  ROUTE_DEVIATION: (v, r) =>
    `Bus ${v} has deviated from the planned route ${r}. Driver has taken an alternate path due to road construction ahead.`,
  PANIC_BUTTON: (v, _r) =>
    `Emergency panic button was pressed on Bus ${v}. Driver has reported a safety concern near the current location. Awaiting confirmation.`,
  INCIDENT: (v, r) =>
    `An incident has been reported on Bus ${v} on route ${r}. A minor collision occurred near a bus stop. All students are safe, authorities notified.`,
};

/**
 * Full alert schedule for Route 1 PM of each school.
 * Each entry: [progressPercent, eventType, resolvePercent, ...optional intermediate actions]
 */
interface AlertScheduleEntry {
  triggerAt: number; // progress fraction 0–1
  eventType: string;
  resolveAt: number; // progress fraction 0–1
  /** How to resolve: confirm (Tier 1), false-alarm (Tier 1 MEDICAL), resolve (Tier 2) */
  governance: 'confirm' | 'false-alarm' | 'resolve';
  /** Whether the bus should halt until this alert is resolved */
  halts: boolean;
  /** Intermediate actions before resolution: [progressFraction, actionType] */
  intermediateActions?: Array<{
    at: number;
    action: 'status-update' | 'request-info';
    notes: string;
  }>;
}

const ROUTE1_ALERT_SCHEDULE: AlertScheduleEntry[] = [
  {
    triggerAt: 0.08,
    eventType: 'LATE_DEPARTURE',
    resolveAt: 0.22,
    governance: 'resolve',
    halts: false,
    intermediateActions: [
      {
        at: 0.15,
        action: 'status-update',
        notes:
          'Driver confirmed — bus left depot 12 min late due to pre-trip inspection delay. Now en route.',
      },
    ],
  },
  {
    triggerAt: 0.18,
    eventType: 'MEDICAL',
    resolveAt: 0.3,
    governance: 'false-alarm',
    halts: false,
    intermediateActions: [
      {
        at: 0.22,
        action: 'request-info',
        notes: 'Requesting more details from driver about student condition.',
      },
      {
        at: 0.27,
        action: 'request-info',
        notes:
          'Driver reports student is feeling better after opening a window. No medical assistance needed.',
      },
    ],
  },
  {
    triggerAt: 0.28,
    eventType: 'LATE_ARRIVAL',
    resolveAt: 0.4,
    governance: 'resolve',
    halts: false,
    intermediateActions: [
      {
        at: 0.34,
        action: 'status-update',
        notes:
          'Traffic clearing up ahead. ETA adjusted — bus should recover 8 of the 15 lost minutes.',
      },
    ],
  },
  {
    triggerAt: 0.45,
    eventType: 'ROUTE_DEVIATION',
    resolveAt: 0.58,
    governance: 'resolve',
    halts: false,
    intermediateActions: [
      {
        at: 0.5,
        action: 'status-update',
        notes:
          'Driver rerouted due to construction on Elm St. Taking Cedar Ln detour. Will rejoin planned route at Oak Dr.',
      },
    ],
  },
  {
    triggerAt: 0.62,
    eventType: 'PANIC_BUTTON',
    resolveAt: 0.78,
    governance: 'confirm',
    halts: true,
    intermediateActions: [
      {
        at: 0.66,
        action: 'request-info',
        notes: 'School admin requesting immediate status from driver.',
      },
      {
        at: 0.7,
        action: 'status-update',
        notes:
          'Driver reports: aggressive individual approached the bus at a stop. Doors locked, all students safe. Police contacted.',
      },
      {
        at: 0.74,
        action: 'status-update',
        notes:
          'Police arrived on scene. Individual has left the area. Clearing bus to resume route.',
      },
    ],
  },
  {
    triggerAt: 0.82,
    eventType: 'INCIDENT',
    resolveAt: 0.94,
    governance: 'confirm',
    halts: true,
    intermediateActions: [
      {
        at: 0.86,
        action: 'request-info',
        notes: 'Requesting incident details and student headcount from driver.',
      },
      {
        at: 0.9,
        action: 'status-update',
        notes:
          'Minor fender-bender with a parked car. No injuries. All 15 students accounted for. Exchanging insurance info.',
      },
    ],
  },
];

// A single mild Tier 2 alert for non-primary routes
const MILD_ALERT_OPTIONS = ['LATE_ARRIVAL', 'ROUTE_DEVIATION', 'LATE_DEPARTURE'];

// ─── Types ──────────────────────────────────────────────────────

interface StopInfo {
  id: string;
  sequence: number;
  name: string;
  lat: number;
  lng: number;
}

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  amStopId: string;
  pmStopId: string;
}

interface RouteConfig {
  routeNumber: number;
  busId: string;
  am: { routeRefId: string; polyline: string; stops: StopInfo[] };
  pm: { routeRefId: string; polyline: string; stops: StopInfo[] };
  students: StudentInfo[];
}

interface SchoolConfig {
  code: string;
  schoolId: string;
  schoolName: string;
  schoolLat: number;
  schoolLng: number;
  schoolAdminEmail: string;
  schoolAdminId: string;
  driverEmail: string;
  driverId: string;
  parents: Array<{ id: string; email: string; firstName: string; lastName: string }>;
  routes: RouteConfig[];
}

interface SimConfig {
  gpsDelay: number;
  schools: SchoolConfig[];
}

// ─── Per-Route GPS Loop ─────────────────────────────────────────

interface GpsState {
  position: [number, number] | null;
  routeId: string | null;
  vehicleId: string | null;
  running: boolean;
}

async function startGpsLoop(state: GpsState, driverToken: string, intervalSeconds: number) {
  while (state.running) {
    if (state.position && state.routeId && state.vehicleId) {
      await apiPost(
        `${API_BASE}/routes/locations`,
        {
          vehicleId: state.vehicleId,
          routeId: state.routeId,
          timestamp: new Date().toISOString(),
          lat: state.position[0],
          lng: state.position[1],
          speedKph: 30,
        },
        driverToken,
      );
    }
    await sleep(intervalSeconds * 1000);
  }
}

// ─── Route Simulation ───────────────────────────────────────────

async function simulateRoute(
  school: SchoolConfig,
  route: RouteConfig,
  direction: 'am' | 'pm',
  driverToken: string,
  adminToken: string,
  gpsState: GpsState,
  alertSchedule: AlertScheduleEntry[],
  gpsDelay: number,
  tag: string,
) {
  const lap = direction === 'am' ? route.am : route.pm;
  const routeId = lap.routeRefId;
  const { busId } = route;
  const { schoolId, schoolName, driverId, schoolAdminId } = school;
  const decoded = decodePolyline(lap.polyline);

  if (decoded.length === 0) {
    console.log(`${tag} [SKIP] No polyline data for ${routeId}`);
    return;
  }

  gpsState.routeId = routeId;
  gpsState.vehicleId = busId;

  console.log(`${tag} --- Starting ${direction.toUpperCase()} (${routeId}, ${busId}) ---`);

  // ROUTE_STARTED
  await apiPost(
    `${API_BASE}/routes/lifecycle-events`,
    { routeId, vehicleId: busId, eventType: 'ROUTE_STARTED', timestamp: new Date().toISOString() },
    driverToken,
  );

  // PM: Board all students at school first
  if (direction === 'pm') {
    const [lat, lng] = decoded[0];
    gpsState.position = [lat, lng];
    console.log(`${tag} [BOARD] All students boarding at ${schoolName}`);
    for (const s of route.students) {
      await apiPost(
        `${API_BASE}/student-presence-events`,
        {
          schoolId,
          studentId: s.id,
          vehicleId: busId,
          routeId,
          eventType: 'BOARD',
          timestamp: new Date().toISOString(),
          source: 'SMARTTAG',
        },
        driverToken,
      );
    }
    await sleep(2000);
  }

  // Build stop lookup: stopId → students at that stop
  const stopStudents = new Map<string, StudentInfo[]>();
  for (const s of route.students) {
    const stopId = direction === 'am' ? s.amStopId : s.pmStopId;
    if (!stopId) continue;
    const arr = stopStudents.get(stopId) || [];
    arr.push(s);
    stopStudents.set(stopId, arr);
  }

  const visitedStops = new Set<string>();
  const pendingAlerts: Array<{
    alertId: string;
    entry: AlertScheduleEntry;
    intermediatesDone: Set<number>;
    resolved: boolean;
  }> = [];
  const sentAlerts = new Set<string>();

  // Movement loop
  for (let i = 0; i < decoded.length; i++) {
    const [lat, lng] = decoded[i];
    gpsState.position = [lat, lng];
    const progress = i / decoded.length;
    const timestamp = new Date().toISOString();

    // Stop detection (proximity to known stops)
    for (const stop of lap.stops) {
      if (visitedStops.has(stop.id)) continue;
      if (Math.abs(stop.lat - lat) < 0.0003 && Math.abs(stop.lng - lng) < 0.0003) {
        visitedStops.add(stop.id);
        const event = direction === 'am' ? 'BOARD' : 'ALIGHT';
        const studentsAtStop = stopStudents.get(stop.id) || [];

        if (studentsAtStop.length > 0) {
          console.log(
            `${tag} [STOP ${stop.sequence}] ${stop.name} — ${event} ${studentsAtStop.length} student(s)`,
          );
          for (const s of studentsAtStop) {
            await apiPost(
              `${API_BASE}/student-presence-events`,
              {
                schoolId,
                studentId: s.id,
                vehicleId: busId,
                routeId,
                eventType: event,
                timestamp,
                source: 'SMARTTAG',
              },
              driverToken,
            );
          }
        } else {
          console.log(`${tag} [STOP ${stop.sequence}] ${stop.name} — no students assigned`);
        }

        // STOP_REACHED lifecycle event
        await apiPost(
          `${API_BASE}/routes/lifecycle-events`,
          { routeId, vehicleId: busId, eventType: 'STOP_REACHED', stopId: stop.id, timestamp },
          driverToken,
        );

        await sleep(2000); // pause at stop
      }
    }

    // AM: Alight all at school (final point)
    if (i === decoded.length - 1 && direction === 'am') {
      console.log(`${tag} [ALIGHT] All students arriving at ${schoolName}`);
      for (const s of route.students) {
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId: s.id,
            vehicleId: busId,
            routeId,
            eventType: 'ALIGHT',
            timestamp: new Date().toISOString(),
            source: 'SMARTTAG',
          },
          driverToken,
        );
      }
    }

    // ── Alert triggers ──
    for (const entry of alertSchedule) {
      const key = `${direction}_${entry.eventType}_${entry.triggerAt}`;
      if (sentAlerts.has(key)) continue;
      if (progress < entry.triggerAt) continue;

      sentAlerts.add(key);
      const desc = ALERT_DESCRIPTIONS[entry.eventType](busId, routeId);
      const tierLabel = entry.governance === 'resolve' ? 'Tier 2' : 'Tier 1';
      console.log(
        `${tag} \x1b[31m[ALERT] ${entry.eventType} (${tierLabel}) at ${(progress * 100).toFixed(0)}%\x1b[0m`,
      );
      console.log(`${tag}   ${desc.substring(0, 80)}...`);

      const result = await apiPost(
        `${API_BASE}/emergency-events`,
        {
          schoolId,
          vehicleId: busId,
          routeId,
          driverId,
          timestamp,
          lat,
          lng,
          eventType: entry.eventType,
          description: desc,
        },
        driverToken,
      );

      if (result?.alertId) {
        pendingAlerts.push({
          alertId: result.alertId,
          entry,
          intermediatesDone: new Set(),
          resolved: false,
        });

        // If this alert halts the bus, wait for resolution
        if (entry.halts) {
          console.log(
            `${tag} \x1b[31m[HALT] Bus ${busId} stopped — awaiting alert resolution...\x1b[0m`,
          );

          // Tier 1 halting alerts: request-info first (works on PENDING_CONFIRMATION),
          // then confirm (transitions to CONFIRMED), then status-updates, then resolve.
          const actions = entry.intermediateActions || [];
          const requestInfoActions = actions.filter((a) => a.action === 'request-info');
          const statusUpdateActions = actions.filter((a) => a.action === 'status-update');

          // 1. Request-info actions (valid on PENDING_CONFIRMATION)
          for (const action of requestInfoActions) {
            await sleep(8000);
            console.log(`${tag} \x1b[33m[REQUEST-INFO] ${action.notes.substring(0, 80)}...\x1b[0m`);
            await apiPatch(`${API_BASE}/alerts/${result.alertId}/request-info`, adminToken, {
              actorUserId: schoolAdminId,
              actorRole: 'SCHOOL_ADMIN',
            });
          }

          // 2. Confirm/False-alarm (transitions alert to CONFIRMED or FALSE_ALARM)
          await sleep(5000);
          if (entry.governance === 'confirm') {
            console.log(
              `${tag} \x1b[32m[CONFIRM] Admin confirming ${entry.eventType} — parents will be notified\x1b[0m`,
            );
            await apiPatch(`${API_BASE}/alerts/${result.alertId}/confirm`, adminToken, {
              actorUserId: schoolAdminId,
              actorRole: 'SCHOOL_ADMIN',
            });
          } else if (entry.governance === 'false-alarm') {
            console.log(
              `${tag} \x1b[32m[FALSE ALARM] Admin marking ${entry.eventType} as false alarm\x1b[0m`,
            );
            await apiPatch(`${API_BASE}/alerts/${result.alertId}/false-alarm`, adminToken, {
              actorUserId: schoolAdminId,
              actorRole: 'SCHOOL_ADMIN',
              notes: `${entry.eventType} determined to be a false alarm. No further action needed.`,
            });
          }

          // 3. Status-updates (valid on CONFIRMED)
          for (const action of statusUpdateActions) {
            await sleep(5000);
            console.log(
              `${tag} \x1b[33m[STATUS-UPDATE] ${action.notes.substring(0, 80)}...\x1b[0m`,
            );
            await apiPatch(`${API_BASE}/alerts/${result.alertId}/status-update`, adminToken, {
              notes: action.notes,
              actorUserId: schoolAdminId,
              actorRole: 'SCHOOL_ADMIN',
            });
          }

          // 4. Resolve
          await sleep(5000);
          console.log(
            `${tag} \x1b[32m[RESOLVE] Resolving ${entry.eventType} — bus resuming\x1b[0m`,
          );
          await apiPatch(`${API_BASE}/alerts/${result.alertId}/resolve`, adminToken, {
            notes: `${entry.eventType} fully resolved. Bus ${busId} cleared to resume route.`,
            actorUserId: schoolAdminId,
            actorRole: 'SCHOOL_ADMIN',
          });

          // Mark as done
          const pending = pendingAlerts.find((p) => p.alertId === result.alertId);
          if (pending) pending.resolved = true;

          console.log(`${tag} \x1b[32m[RESUME] Bus ${busId} resuming route\x1b[0m`);
        }
      }

      await sleep(3000);
    }

    // Non-halting alert lifecycle: intermediate actions and resolution
    for (const pending of pendingAlerts) {
      if (pending.resolved) continue;
      if (pending.entry.halts) continue; // handled inline above

      // Intermediate actions
      for (let ai = 0; ai < (pending.entry.intermediateActions?.length || 0); ai++) {
        if (pending.intermediatesDone.has(ai)) continue;
        const action = pending.entry.intermediateActions![ai];
        if (progress < action.at) continue;
        pending.intermediatesDone.add(ai);

        console.log(
          `${tag} \x1b[33m[${action.action.toUpperCase()}] ${pending.entry.eventType}: ${action.notes.substring(0, 70)}...\x1b[0m`,
        );
        if (action.action === 'status-update') {
          await apiPatch(`${API_BASE}/alerts/${pending.alertId}/status-update`, adminToken, {
            notes: action.notes,
            actorUserId: schoolAdminId,
            actorRole: 'SCHOOL_ADMIN',
          });
        } else if (action.action === 'request-info') {
          await apiPatch(`${API_BASE}/alerts/${pending.alertId}/request-info`, adminToken, {
            actorUserId: schoolAdminId,
            actorRole: 'SCHOOL_ADMIN',
          });
        }
      }

      // Resolution
      if (progress >= pending.entry.resolveAt) {
        const action = pending.entry.governance;
        if (action === 'confirm') {
          console.log(
            `${tag} \x1b[32m[CONFIRM] ${pending.entry.eventType} (${pending.alertId})\x1b[0m`,
          );
          await apiPatch(`${API_BASE}/alerts/${pending.alertId}/confirm`, adminToken, {
            actorUserId: schoolAdminId,
            actorRole: 'SCHOOL_ADMIN',
          });
        } else if (action === 'false-alarm') {
          console.log(
            `${tag} \x1b[32m[FALSE ALARM] ${pending.entry.eventType} (${pending.alertId})\x1b[0m`,
          );
          await apiPatch(`${API_BASE}/alerts/${pending.alertId}/false-alarm`, adminToken, {
            actorUserId: schoolAdminId,
            actorRole: 'SCHOOL_ADMIN',
            notes: `${pending.entry.eventType} determined to be a false alarm after investigation.`,
          });
        } else {
          console.log(
            `${tag} \x1b[32m[RESOLVE] ${pending.entry.eventType} (${pending.alertId})\x1b[0m`,
          );
          await apiPatch(`${API_BASE}/alerts/${pending.alertId}/resolve`, adminToken, {
            notes: `${pending.entry.eventType} resolved. Situation normalized.`,
            actorUserId: schoolAdminId,
            actorRole: 'SCHOOL_ADMIN',
          });
        }
        pending.resolved = true;
      }
    }

    // Movement delay
    await sleep(gpsDelay * 1000);
  }

  // ROUTE_COMPLETED
  console.log(`${tag} [LIFECYCLE] ROUTE_COMPLETED for ${routeId}`);
  await apiPost(
    `${API_BASE}/routes/lifecycle-events`,
    {
      routeId,
      vehicleId: busId,
      eventType: 'ROUTE_COMPLETED',
      timestamp: new Date().toISOString(),
    },
    driverToken,
  );
}

// ─── Per-School Simulation ──────────────────────────────────────

async function simulateSchool(school: SchoolConfig, gpsDelay: number) {
  const tag = `\x1b[36m[${school.code.toUpperCase()}]\x1b[0m`;
  console.log(`\n${tag} ========== ${school.schoolName} ==========`);

  // Authenticate
  const driverToken = await login(school.driverEmail);
  const adminToken = await login(school.schoolAdminEmail);

  // Run each route sequentially (routes share the same driver in demo data)
  for (const route of school.routes) {
    const routeTag = `${tag} [R${route.routeNumber}]`;

    // GPS broadcaster per bus
    const gpsState: GpsState = {
      position: null,
      routeId: null,
      vehicleId: null,
      running: true,
    };
    const gpsPromise = startGpsLoop(gpsState, driverToken, gpsDelay);

    // Determine alert schedule for this route
    const isAlertRoute = route.routeNumber === 1;

    // AM alerts: Route 1 gets a single Tier 2 (LATE_DEPARTURE), others get nothing
    const amAlerts: AlertScheduleEntry[] = isAlertRoute
      ? [
          {
            triggerAt: 0.25,
            eventType: 'LATE_ARRIVAL',
            resolveAt: 0.5,
            governance: 'resolve',
            halts: false,
            intermediateActions: [
              {
                at: 0.35,
                action: 'status-update',
                notes:
                  'Bus delayed due to heavy traffic on main corridor. Estimated 10 minute delay.',
              },
            ],
          },
        ]
      : [];

    // PM alerts: Route 1 gets full schedule, others get 0-1 mild alerts
    let pmAlerts: AlertScheduleEntry[];
    if (isAlertRoute) {
      pmAlerts = ROUTE1_ALERT_SCHEDULE;
    } else {
      // 50% chance of a single mild Tier 2 alert
      if (Math.random() > 0.5) {
        const alertType = MILD_ALERT_OPTIONS[route.routeNumber % MILD_ALERT_OPTIONS.length];
        pmAlerts = [
          {
            triggerAt: 0.3 + Math.random() * 0.2,
            eventType: alertType,
            resolveAt: 0.6 + Math.random() * 0.15,
            governance: 'resolve',
            halts: false,
          },
        ];
      } else {
        pmAlerts = [];
      }
    }

    // AM Lap
    await simulateRoute(
      school,
      route,
      'am',
      driverToken,
      adminToken,
      gpsState,
      amAlerts,
      gpsDelay,
      routeTag,
    );

    console.log(`${routeTag} --- Hiatus between AM/PM (5s) ---`);
    await sleep(5000);

    // PM Lap
    await simulateRoute(
      school,
      route,
      'pm',
      driverToken,
      adminToken,
      gpsState,
      pmAlerts,
      gpsDelay,
      routeTag,
    );

    // Stop GPS loop for this route
    gpsState.running = false;

    console.log(`${routeTag} Route ${route.routeNumber} complete.`);
    console.log('');
  }

  console.log(`${tag} ========== ${school.schoolName} DONE ==========\n`);
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const configPath = path.join(process.cwd(), 'scripts/demo-sim-config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`Config not found at ${configPath}. Run demo-simulate.sh first.`);
    process.exit(1);
  }

  const config: SimConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  console.log('\n\x1b[36m=== SBTM Demo Simulation ===\x1b[0m');
  console.log(`Schools: ${config.schools.length}`);
  console.log(`GPS delay: ${config.gpsDelay}s`);

  for (const school of config.schools) {
    console.log(`\n  ${school.schoolName}:`);
    console.log(`    Routes: ${school.routes.length}`);
    console.log(`    Driver: ${school.driverEmail}`);
    console.log(`    Admin:  ${school.schoolAdminEmail}`);
    console.log(`    Parents: ${school.parents.map((p) => p.email).join(', ')}`);
  }

  // Simulate schools sequentially (they share escalation infrastructure)
  for (const school of config.schools) {
    await simulateSchool(school, config.gpsDelay);
  }

  console.log('\n\x1b[32m=== Demo Simulation Complete ===\x1b[0m');
}

main().catch(console.error);
