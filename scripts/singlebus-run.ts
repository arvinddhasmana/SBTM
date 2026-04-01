import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:3001/api/v1';

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
      console.error(`API Error: ${url} -> ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Response: ${text}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`API Exception: ${url} -> ${e}`);
    return false;
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

  console.log(`--- Starting ${routeKey.toUpperCase()} Lap (${routeId}) ---`);

  for (let i = 0; i < decoded.length; i++) {
    const [lat, lng] = decoded[i];
    const timestamp = new Date().toISOString();

    // 1. GPS update
    await apiPost(
      `${API_BASE}/routes/locations`,
      {
        vehicleId,
        routeId,
        timestamp,
        lat,
        lng,
        speedKph: 30,
      },
      driverToken,
    );

    // 2. Stop Detection
    const stop = stops.find(
      (s: any) =>
        !visitedStops.has(s.label) &&
        Math.abs(s.lat - lat) < 0.0001 &&
        Math.abs(s.lng - lng) < 0.0001,
    );

    if (stop) {
      visitedStops.add(stop.label);
      const event = routeKey === 'am' ? 'BOARD' : 'ALIGHT';
      console.log(`Reached ${stop.label} - ${event} students: ${stop.students.join(', ')}`);
      for (const studentId of stop.students) {
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
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 3. Special Logic: Board all for PM at start, Alight all for AM at end
    if (i === 0 && routeKey === 'pm') {
      console.log(`Boarding all students at ${schoolName}`);
      for (const studentId of allStudents) {
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId,
            vehicleId,
            routeId,
            eventType: 'BOARD',
            timestamp,
            source: 'MANUAL',
          },
          driverToken,
        );
      }
    }

    if (i === decoded.length - 1 && routeKey === 'am') {
      console.log(`Alighting all students at ${schoolName}`);
      for (const studentId of allStudents) {
        await apiPost(
          `${API_BASE}/student-presence-events`,
          {
            schoolId,
            studentId,
            vehicleId,
            routeId,
            eventType: 'ALIGHT',
            timestamp,
            source: 'MANUAL',
          },
          driverToken,
        );
      }
    }

    // 4. Late Arrival Alert on PM route
    if (routeKey === 'pm' && i === Math.floor((decoded.length * 2) / 3)) {
      console.log('[ALERT] Triggering LATE_ARRIVAL for PM route');
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

    await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
  }
}

async function main() {
  const configPath = path.join(process.cwd(), 'scripts/singlebus-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const interval = parseFloat(process.argv[2]) || 1;

  // Login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.bus.driverEmail, password: 'Admin123!' }),
  });
  const { accessToken: driverToken } = (await loginRes.json()) as any;

  await runLap(config, 'am', driverToken, interval);
  console.log('Waiting 5 seconds between laps...');
  await new Promise((r) => setTimeout(r, 5000));
  await runLap(config, 'pm', driverToken, interval);

  console.log('Simulation Finished Successfully!');
}

main().catch(console.error);
