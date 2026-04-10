/**
 * Dynamic Config Generator for SBTM Simulation
 *
 * Usage: npx tsx scripts/dynamic-generate-config.ts <schoolLat> <schoolLng> [schoolName]
 *
 * Generates `scripts/dynamic-config.json` by:
 *   1. Computing a "last stop" ~2-3 km from the school at a random bearing
 *   2. Fetching road-aligned polylines from OSRM (last_stop→school for AM, school→last_stop for PM)
 *   3. Distributing 8 stops evenly along the polyline
 *   4. Assigning 15 students across stops and linking 10 parents
 */

import * as fs from 'fs';
import * as path from 'path';

const OSRM_URL = 'http://localhost:5000/route/v1/driving';
const OUTPUT_PATH = path.join(process.cwd(), 'scripts/dynamic-config.json');

const STOP_COUNT = 8;
const STUDENT_COUNT = 15;
const PARENT_COUNT = 10;

// Street-name fragments for generating stop labels
const STREET_NAMES = [
  'Elm St',
  'Maple Ave',
  'Oak Dr',
  'Pine Rd',
  'Cedar Ln',
  'Birch Blvd',
  'Willow Way',
  'Spruce Ct',
  'Ash Pl',
  'Poplar Cr',
  'Walnut St',
  'Cherry Ln',
  'Hickory Dr',
  'Alder Ave',
  'Linden Rd',
  'Hazel Ct',
];

const FIRST_NAMES = [
  'Liam',
  'Olivia',
  'Noah',
  'Emma',
  'James',
  'Ava',
  'Benjamin',
  'Sophia',
  'Lucas',
  'Isabella',
  'Henry',
  'Mia',
  'Alexander',
  'Charlotte',
  'William',
];

const LAST_NAMES = [
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Garcia',
  'Martinez',
  'Robinson',
  'Clark',
  'Rodriguez',
  'Lewis',
  'Lee',
  'Walker',
];

const PARENT_FIRST_NAMES = [
  'Michael',
  'Jessica',
  'Robert',
  'Amanda',
  'Daniel',
  'Laura',
  'Christopher',
  'Emily',
  'Matthew',
  'Stephanie',
];

const PARENT_LAST_NAMES = [
  'Anderson',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Garcia',
  'Martinez',
  'Robinson',
];

// --- Polyline Decode ---

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

// --- Geo Helpers ---

function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distKm: number,
): [number, number] {
  const R = 6371; // Earth radius km
  const d = distKm / R;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return [
    parseFloat(((lat2 * 180) / Math.PI).toFixed(6)),
    parseFloat(((lng2 * 180) / Math.PI).toFixed(6)),
  ];
}

// --- OSRM ---

async function getOsrmRoute(
  start: [number, number],
  end: [number, number],
): Promise<{ polyline: string; decoded: [number, number][] } | null> {
  const url = `${OSRM_URL}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=polyline`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as any;
    if (data.code !== 'Ok') throw new Error(`OSRM Error: ${data.code}`);
    const polyline = data.routes[0].geometry;
    const decoded = decodePolyline(polyline);
    return { polyline, decoded };
  } catch (e: any) {
    console.error(`Failed to fetch OSRM route: ${e.message}`);
    return null;
  }
}

// --- Student/Parent Generation ---

function generateStudents(): Array<{ id: string; firstName: string; lastName: string }> {
  return Array.from({ length: STUDENT_COUNT }, (_, i) => ({
    id: `20000000-0000-0000-0000-${String(101 + i).padStart(12, '0')}`,
    firstName: FIRST_NAMES[i],
    lastName: LAST_NAMES[i],
  }));
}

function generateParents(
  students: Array<{ id: string }>,
): Array<{
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  studentIds: string[];
}> {
  // First 5 parents get 2 children (=10), next 5 parents get 1 child (=5) → total 15
  const parents: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    studentIds: string[];
  }> = [];

  let studentIdx = 0;
  for (let i = 0; i < PARENT_COUNT; i++) {
    const childCount = i < 5 ? 2 : 1;
    const childIds = students.slice(studentIdx, studentIdx + childCount).map((s) => s.id);
    studentIdx += childCount;

    parents.push({
      userId: `20000000-0000-0000-0000-${String(301 + i).padStart(12, '0')}`,
      email: `dparent${i + 1}@sbtm.demo`,
      firstName: PARENT_FIRST_NAMES[i],
      lastName: PARENT_LAST_NAMES[i],
      studentIds: childIds,
    });
  }
  return parents;
}

// --- Stop Generation ---

function distributeStudentsAcrossStops(
  students: Array<{ id: string }>,
  stopCount: number,
): string[][] {
  // Spread students roughly evenly, 1-3 per stop
  const distribution: string[][] = Array.from({ length: stopCount }, () => []);
  for (let i = 0; i < students.length; i++) {
    distribution[i % stopCount].push(students[i].id);
  }
  return distribution;
}

function generateStops(
  decoded: [number, number][],
  students: Array<{ id: string }>,
  prefix: 'AM' | 'PM',
): Array<{
  lat: number;
  lng: number;
  label: string;
  students: string[];
  pauseSeconds: number;
  speedKph: number;
}> {
  const step = Math.floor(decoded.length / (STOP_COUNT + 1));
  const studentDist = distributeStudentsAcrossStops(students, STOP_COUNT);

  return Array.from({ length: STOP_COUNT }, (_, i) => {
    const pt = decoded[step * (i + 1)];
    const streetA = STREET_NAMES[i * 2];
    const streetB = STREET_NAMES[i * 2 + 1];
    return {
      lat: pt[0],
      lng: pt[1],
      label: `${prefix} Stop ${i + 1} - ${streetA} & ${streetB}`,
      students: studentDist[i],
      pauseSeconds: 5,
      speedKph: 0,
    };
  });
}

// --- Main ---

async function main() {
  const schoolLat = parseFloat(process.argv[2]);
  const schoolLng = parseFloat(process.argv[3]);
  const schoolName = process.argv[4] || 'Dynamic School';

  if (isNaN(schoolLat) || isNaN(schoolLng)) {
    console.error('Usage: npx tsx scripts/dynamic-generate-config.ts <lat> <lng> [schoolName]');
    process.exit(1);
  }

  console.log(`Generating config for ${schoolName} at (${schoolLat}, ${schoolLng})...`);

  // 1. Generate a "last stop" area within ~0.8-1.2 km of the school
  //    Bias bearing toward residential areas (west/northwest: 240-340°)
  const bearing = 240 + Math.random() * 100; // 240°-340° (west to north-northwest)
  const distKm = 0.8 + Math.random() * 0.4; // 0.8-1.2 km — stays within neighborhood
  const lastStop = destinationPoint(schoolLat, schoolLng, bearing, distKm);
  console.log(
    `Last stop area at (${lastStop[0]}, ${lastStop[1]}) — ${distKm.toFixed(1)}km, bearing ${bearing.toFixed(0)}°`,
  );

  // 2. Fetch OSRM polylines
  console.log('Fetching AM route from OSRM (last_stop → school)...');
  const amRoute = await getOsrmRoute(lastStop, [schoolLat, schoolLng]);
  if (!amRoute) {
    console.error('Failed to get AM route from OSRM. Is the OSRM container running?');
    console.error('Start it with: docker start sbtm-osrm');
    process.exit(1);
  }

  console.log('Fetching PM route from OSRM (school → last_stop)...');
  const pmRoute = await getOsrmRoute([schoolLat, schoolLng], lastStop);
  if (!pmRoute) {
    console.error('Failed to get PM route from OSRM.');
    process.exit(1);
  }

  console.log(
    `AM polyline: ${amRoute.decoded.length} points, PM polyline: ${pmRoute.decoded.length} points`,
  );

  // 3. Generate entities
  const students = generateStudents();
  const parents = generateParents(students);

  // 4. AM stops along last_stop→school polyline
  const amStops = generateStops(amRoute.decoded, students, 'AM');

  // 5. PM stops along school→last_stop polyline (reversed stop order so farthest students are dropped first)
  const pmStops = generateStops(pmRoute.decoded, students, 'PM');

  // 6. Build config
  const config = {
    superAdmin: {
      userId: '10000000-0000-0000-0000-000000000000',
      email: 'super.admin@sbtm.demo',
    },
    ostaAdmin: {
      userId: '10000000-0000-0000-0000-000000000001',
      email: 'osta.admin@sbtm.demo',
    },
    boardAdmin: {
      userId: '10000000-0000-0000-0000-000000000003',
      email: 'board.admin@sbtm.demo',
    },
    schoolAdmin: {
      userId: '10000000-0000-0000-0000-000000000002',
      email: 'school.admin@sbtm.demo',
    },
    school: {
      id: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
      name: schoolName,
      boardId: 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
      lat: schoolLat,
      lng: schoolLng,
    },
    bus: {
      vehicleId: 'BUS-02',
      driverId: 'driver-002',
      driverEmail: 'driver2@sbtm.demo',
    },
    parents,
    students,
    am: {
      routeId: 'ROUTE-Dynamic-AM',
      polyline: amRoute.polyline,
      decoded: amRoute.decoded,
      stops: amStops,
      start: [amRoute.decoded[0][0], amRoute.decoded[0][1]],
      end: [
        amRoute.decoded[amRoute.decoded.length - 1][0],
        amRoute.decoded[amRoute.decoded.length - 1][1],
      ],
    },
    pm: {
      routeId: 'ROUTE-Dynamic-PM',
      polyline: pmRoute.polyline,
      decoded: pmRoute.decoded,
      stops: pmStops,
      start: [pmRoute.decoded[0][0], pmRoute.decoded[0][1]],
      end: [
        pmRoute.decoded[pmRoute.decoded.length - 1][0],
        pmRoute.decoded[pmRoute.decoded.length - 1][1],
      ],
    },
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(config, null, 2));
  console.log(`Config written to ${OUTPUT_PATH}`);
  console.log(`  - ${students.length} students, ${parents.length} parents`);
  console.log(`  - AM: ${amStops.length} stops, ${amRoute.decoded.length} polyline points`);
  console.log(`  - PM: ${pmStops.length} stops, ${pmRoute.decoded.length} polyline points`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
