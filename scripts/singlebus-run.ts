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
      return false;
    }
    return true;
  } catch (e: any) {
    console.error(`[API FETCH ERROR] ${url} - Error: ${e.message}`);
    return false;
  }
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

async function runLap(
  config: any,
  routeKey: 'am' | 'pm',
  driverToken: string,
  intervalSeconds: number,
) {
  const route = config[routeKey];
  const { routeId, decoded, stops } = route;
  const { vehicleId, driverId } = config.bus;
  const { id: schoolId, name: schoolName } = config.school;
  const allStudents = config.students;
  const visitedStops = new Set<string>();
  const sentAlerts = new Set<string>();

  currentRouteId = routeId;
  currentVehicleId = vehicleId;

  console.log(`\n--- Starting ${routeKey.toUpperCase()} Lap (${routeId}) ---`);

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

    // Trigger Tactical Alerts throughout the journey for demonstration
    if (routeKey === 'pm') {
      // 1. Late Arrival Alert early in the route (20%)
      if (i === Math.floor(decoded.length * 0.2) && !sentAlerts.has('LATE_ARRIVAL')) {
        sentAlerts.add('LATE_ARRIVAL');
        console.log('[ALERT] Dispatching LATE_ARRIVAL notification');
        await apiPost(
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
          },
          driverToken,
        );
      }

      // 2. Route Diversion Alert in the middle (40%)
      if (i === Math.floor(decoded.length * 0.4) && !sentAlerts.has('ROUTE_DEVIATION')) {
        sentAlerts.add('ROUTE_DEVIATION');
        console.log('[ALERT] Dispatching ROUTE_DEVIATION notification');
        await apiPost(
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
          },
          driverToken,
        );
      }

      // 3. Panic Alert late in the route (60%)
      if (i === Math.floor(decoded.length * 0.6) && !sentAlerts.has('PANIC_BUTTON')) {
        sentAlerts.add('PANIC_BUTTON');
        console.log('[ALERT] Dispatching PANIC_BUTTON notification');
        await apiPost(
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
          },
          driverToken,
        );
      }
    }

    // Control movement speed between polyline points
    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
}

async function main() {
  const configPath = path.join(process.cwd(), 'scripts/singlebus-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const interval = parseFloat(process.argv[2]) || 1;

  console.log('--- SBTM Single-Bus High-Fidelity Simulation ---');

  // Authenticate Driver
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.bus.driverEmail, password: 'Admin123!' }),
  });
  if (!loginRes.ok) {
    console.error(`[AUTH ERROR] Failed to login driver: ${config.bus.driverEmail}`);
    process.exit(1);
  }
  const { accessToken: driverToken } = (await loginRes.json()) as any;
  if (!driverToken) {
    console.error(`[AUTH ERROR] No access token returned for driver.`);
    process.exit(1);
  }

  // Start the background GPS broadcaster
  startGpsLoop(driverToken, interval);

  // Execute Laps
  await runLap(config, 'am', driverToken, interval);

  console.log('\n--- Simulation Hiatus (5s) ---');
  await new Promise((r) => setTimeout(r, 5000));

  await runLap(config, 'pm', driverToken, interval);

  isSimulationRunning = false;
  console.log('\n[COMPLETE] Simulation cycle finished.');
}

main().catch(console.error);
