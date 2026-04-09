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
  INCIDENT: (v, r) =>
    `An incident has been reported on Bus ${v} on route ${r}. A minor fender-bender occurred near the bus stop. All students are safe.`,
  MEDICAL: (v, _r) =>
    `Medical concern reported on Bus ${v}. A student reported feeling unwell — possible motion sickness.`,
  LATE_DEPARTURE: (v, r) =>
    `Bus ${v} departed 12 minutes behind schedule on route ${r}. Driver was delayed at the depot.`,
};

// Governance action to take for each alert type when the simulation "resolves" it.
// Tier 1 alerts use confirm/false-alarm; Tier 2 alerts use resolve.
type GovernanceAction = 'confirm' | 'false-alarm' | 'resolve';
const ALERT_GOVERNANCE: Record<string, GovernanceAction> = {
  PANIC_BUTTON: 'confirm',
  INCIDENT: 'confirm',
  MEDICAL: 'false-alarm',
  LATE_ARRIVAL: 'resolve',
  ROUTE_DEVIATION: 'resolve',
  LATE_DEPARTURE: 'resolve',
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

  // 1. Initial State Check: PM route starts with boarding everyone at school
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

  // 2. Movement Loop
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
        // Find student name from config for better logging
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

      // Pause at stop (independent of GPS loop which continues in background)
      console.log(`[WAIT] Pausing at stop for 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }

    // Special Logic: Alight all for AM at the final destination (School)
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

    // Check for pending alert resolutions (using governance actions)
    if (routeKey === 'pm') {
      for (let a = pendingAlerts.length - 1; a >= 0; a--) {
        const pending = pendingAlerts[a];
        if (i >= pending.resolveAt) {
          const action = ALERT_GOVERNANCE[pending.eventType] || 'resolve';
          if (action === 'confirm') {
            console.log(
              `[GOVERNANCE] Confirming Tier 1 alert ${pending.eventType} (${pending.alertId}) — parents will be notified`,
            );
            await apiPatch(`${API_BASE}/alerts/${pending.alertId}/confirm`, adminToken, {
              actorUserId: '10000000-0000-0000-0000-000000000002',
              actorRole: 'SCHOOL_ADMIN',
            });
          } else if (action === 'false-alarm') {
            console.log(
              `[GOVERNANCE] Marking ${pending.eventType} (${pending.alertId}) as FALSE ALARM — no parent notification`,
            );
            await apiPatch(`${API_BASE}/alerts/${pending.alertId}/false-alarm`, adminToken, {
              actorUserId: '10000000-0000-0000-0000-000000000002',
              actorRole: 'SCHOOL_ADMIN',
              notes: `${pending.eventType} determined to be a false alarm during simulation.`,
            });
          } else {
            console.log(
              `[ALERT RESOLVED] Resolving Tier 2 alert ${pending.eventType} (${pending.alertId})`,
            );
            await apiPatch(`${API_BASE}/alerts/${pending.alertId}/resolve`, adminToken);
          }
          pendingAlerts.splice(a, 1);
        }
      }
    }

    // Trigger Tactical Alerts throughout the journey for demonstration
    // Alert schedule:  10% LATE_DEPARTURE (Tier 2, resolve)
    //                  15% MEDICAL (Tier 1, false-alarm)
    //                  20% LATE_ARRIVAL (Tier 2, resolve)
    //                  40% ROUTE_DEVIATION (Tier 2, resolve)
    //                  60% PANIC_BUTTON (Tier 1, confirm → parents notified)
    //                  80% INCIDENT (Tier 1, confirm → parents notified)
    if (routeKey === 'pm') {
      // 0. Late Departure Alert early (10%) — Tier 2, admin-only
      if (i === Math.floor(decoded.length * 0.1) && !sentAlerts.has('LATE_DEPARTURE')) {
        sentAlerts.add('LATE_DEPARTURE');
        const desc = ALERT_DESCRIPTIONS.LATE_DEPARTURE(vehicleId, routeId);
        console.log(`[ALERT] Dispatching LATE_DEPARTURE (Tier 2): ${desc.substring(0, 60)}...`);
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
            eventType: 'LATE_DEPARTURE',
            description: desc,
          },
          driverToken,
        );
        if (result?.alertId) {
          pendingAlerts.push({
            alertId: result.alertId,
            eventType: 'LATE_DEPARTURE',
            resolveAt: Math.floor(decoded.length * 0.25),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 0b. Medical Alert (15%) — Tier 1, will be marked as false alarm
      if (i === Math.floor(decoded.length * 0.15) && !sentAlerts.has('MEDICAL')) {
        sentAlerts.add('MEDICAL');
        const desc = ALERT_DESCRIPTIONS.MEDICAL(vehicleId, routeId);
        console.log(
          `[ALERT] Dispatching MEDICAL (Tier 1 — will be false-alarmed): ${desc.substring(0, 60)}...`,
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
            eventType: 'MEDICAL',
            description: desc,
          },
          driverToken,
        );
        if (result?.alertId) {
          pendingAlerts.push({
            alertId: result.alertId,
            eventType: 'MEDICAL',
            resolveAt: Math.floor(decoded.length * 0.25),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 1. Late Arrival Alert (20%) — Tier 2, resolve
      if (i === Math.floor(decoded.length * 0.2) && !sentAlerts.has('LATE_ARRIVAL')) {
        sentAlerts.add('LATE_ARRIVAL');
        const desc = ALERT_DESCRIPTIONS.LATE_ARRIVAL(vehicleId, routeId);
        console.log(`[ALERT] Dispatching LATE_ARRIVAL: ${desc.substring(0, 60)}...`);
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
            resolveAt: Math.floor(decoded.length * 0.3),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 2. Route Deviation Alert in the middle (40%) — Tier 2, resolve
      if (i === Math.floor(decoded.length * 0.4) && !sentAlerts.has('ROUTE_DEVIATION')) {
        sentAlerts.add('ROUTE_DEVIATION');
        const desc = ALERT_DESCRIPTIONS.ROUTE_DEVIATION(vehicleId, routeId);
        console.log(`[ALERT] Dispatching ROUTE_DEVIATION (Tier 2): ${desc.substring(0, 60)}...`);
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
            resolveAt: Math.floor(decoded.length * 0.5),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 3. Panic Alert late in the route (60%) — Tier 1, will be confirmed
      if (i === Math.floor(decoded.length * 0.6) && !sentAlerts.has('PANIC_BUTTON')) {
        sentAlerts.add('PANIC_BUTTON');
        const desc = ALERT_DESCRIPTIONS.PANIC_BUTTON(vehicleId, routeId);
        console.log(
          `[ALERT] Dispatching PANIC_BUTTON (Tier 1 — will be confirmed): ${desc.substring(0, 60)}...`,
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
          pendingAlerts.push({
            alertId: result.alertId,
            eventType: 'PANIC_BUTTON',
            resolveAt: Math.floor(decoded.length * 0.7),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // 4. Incident Alert near end of route (80%) — Tier 1, will be confirmed
      if (i === Math.floor(decoded.length * 0.8) && !sentAlerts.has('INCIDENT')) {
        sentAlerts.add('INCIDENT');
        const desc = ALERT_DESCRIPTIONS.INCIDENT(vehicleId, routeId);
        console.log(
          `[ALERT] Dispatching INCIDENT (Tier 1 — will be confirmed): ${desc.substring(0, 60)}...`,
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
            eventType: 'INCIDENT',
            description: desc,
          },
          driverToken,
        );
        if (result?.alertId) {
          pendingAlerts.push({
            alertId: result.alertId,
            eventType: 'INCIDENT',
            resolveAt: Math.floor(decoded.length * 0.9),
          });
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // Control movement speed between polyline points
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }

  // Record ROUTE_COMPLETED lifecycle event
  console.log(`[LIFECYCLE] Sending ROUTE_COMPLETED for ${routeId}`);
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

/**
 * Phase C: Fleet Assignment Workflow Demo
 * OSTA admin proposes BUS-01 for the AM route → School admin accepts.
 */
async function runFleetAssignmentDemo(config: any) {
  console.log('\n\x1b[33m========== PHASE C: Fleet Assignment Workflow ==========\x1b[0m');

  const ostaToken = await login(config.ostaAdmin.email);
  const schoolAdminToken = await login(config.schoolAdmin.email);
  const today = new Date().toISOString().split('T')[0];

  // 1. OSTA proposes a fleet assignment
  console.log('[FLEET] OSTA Admin proposing BUS-01 for AM route...');
  const proposal = await apiPost(
    `${API_BASE}/fleet-assignments`,
    {
      schoolId: config.school.id,
      routeId: config.am.routeId,
      vehicleId: config.bus.vehicleId,
      driverId: config.bus.driverId,
      effectiveDate: today,
      notes: 'Initial fleet assignment for Single Bus AM route demo.',
    },
    ostaToken,
  );
  if (proposal?.id) {
    console.log(`[FLEET] Proposal created: ${proposal.id} (status: ${proposal.status})`);

    // 2. OSTA lists fleet assignments to verify
    const assignments = await apiGet(`${API_BASE}/fleet-assignments`, ostaToken);
    console.log(`[FLEET] OSTA sees ${assignments?.length ?? 0} fleet assignment(s)`);

    // 3. School Admin accepts the proposal
    console.log('[FLEET] School Admin accepting the proposal...');
    const accepted = await apiPatch(
      `${API_BASE}/fleet-assignments/${proposal.id}/accept`,
      schoolAdminToken,
    );
    if (accepted) {
      console.log(`[FLEET] Assignment ${proposal.id} → status: ${accepted.status}`);
    }
  } else {
    console.error('[FLEET] Failed to create fleet assignment proposal');
  }

  console.log('\x1b[33m========== Fleet Assignment Demo Complete ==========\x1b[0m');
}

/**
 * Phase C: Absence Confirmation Workflow Demo
 * Parent reports Alice absent for PM → School admin confirms.
 */
async function runAbsenceConfirmationDemo(config: any) {
  console.log('\n\x1b[33m========== PHASE C: Absence Confirmation Workflow ==========\x1b[0m');

  const parent1Token = await login(config.parents[0].email);
  const schoolAdminToken = await login(config.schoolAdmin.email);
  const today = new Date().toISOString().split('T')[0];
  const aliceId = config.students[0].id;
  const aliceName = `${config.students[0].firstName} ${config.students[0].lastName}`;

  // 1. Parent reports Alice absent for PM
  console.log(
    `[ABSENCE] Parent (${config.parents[0].firstName}) reporting ${aliceName} absent for PM...`,
  );
  const absence = await apiPost(
    `${API_BASE}/absences`,
    {
      studentId: aliceId,
      tripDate: today,
      routeType: 'PM',
      notes: 'Family appointment this afternoon.',
    },
    parent1Token,
  );
  if (absence?.id) {
    console.log(
      `[ABSENCE] Absence reported: ${absence.id} (status: ${absence.confirmationStatus ?? 'PENDING'})`,
    );

    // 2. School Admin views absences
    const absences = await apiGet(`${API_BASE}/absences?date=${today}`, schoolAdminToken);
    console.log(`[ABSENCE] School Admin sees ${absences?.length ?? 0} absence(s) for today`);

    // 3. School Admin confirms the absence
    console.log('[ABSENCE] School Admin confirming the absence...');
    const confirmed = await apiPatch(
      `${API_BASE}/absences/${absence.id}/confirm`,
      schoolAdminToken,
    );
    if (confirmed) {
      console.log(`[ABSENCE] Absence ${absence.id} → status: ${confirmed.confirmationStatus}`);
    }
  } else {
    console.error('[ABSENCE] Failed to report absence');
  }

  console.log('\x1b[33m========== Absence Confirmation Demo Complete ==========\x1b[0m');
}

async function main() {
  const configPath = path.join(process.cwd(), 'scripts/singlebus-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const interval = parseFloat(process.argv[2]) || 1;

  console.log('--- SBTM Single-Bus High-Fidelity Simulation ---');

  // Authenticate Driver
  const driverToken = await login(config.bus.driverEmail);

  // Authenticate Admin (for resolving alerts)
  const adminToken = await login('osta.admin@sbtm.demo');

  // ===== Phase C: Fleet Assignment Workflow (before AM lap) =====
  await runFleetAssignmentDemo(config);

  // Start the background GPS broadcaster
  startGpsLoop(driverToken, interval);

  // Execute AM Lap
  await runLap(config, 'am', driverToken, adminToken, interval);

  // ===== Phase C: Absence Confirmation Workflow (between laps) =====
  await runAbsenceConfirmationDemo(config);

  console.log('\n--- Simulation Hiatus (5s) ---');
  await new Promise((r) => setTimeout(r, 5000));

  await runLap(config, 'pm', driverToken, adminToken, interval);

  isSimulationRunning = false;
  console.log('\n[COMPLETE] Simulation cycle finished.');
}

main().catch(console.error);
