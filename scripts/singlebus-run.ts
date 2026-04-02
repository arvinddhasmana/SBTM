import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:3001/api/v1';

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
      // Silence noisy errors during stop/pause for a cleaner console
      return false;
    }
    return true;
  } catch (e) {
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

    // Trigger Late Arrival alert periodically for PM
    if (routeKey === 'pm' && i === Math.floor((decoded.length * 2) / 3)) {
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
  const { accessToken: driverToken } = (await loginRes.json()) as any;

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
