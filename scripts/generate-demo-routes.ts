/**
 * SBTM Demo Route Generator
 *
 * Generates deterministic demo seed data for 6 Ottawa schools:
 *   - 5 AM + 5 PM routes per school (OSRM road-aligned polylines)
 *   - 5-8 stops per route along actual roads
 *   - 15 students + 10 parents per school
 *   - 1 driver + 5 buses + 1 school admin per school
 *   - Each AM/PM route pair shares one dedicated bus
 *
 * Usage:
 *   npx tsx scripts/generate-demo-routes.ts            # Full generation (needs OSRM on :5000)
 *   npx tsx scripts/generate-demo-routes.ts --from-cache  # SQL-only from cached JSON
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Constants
// ============================================================================

const OSRM_URL = 'http://localhost:5000/route/v1/driving';
const CACHE_PATH = path.join(process.cwd(), 'scripts/demo-routes.json');
const SQL_PATH = path.join(process.cwd(), 'scripts/seed-demo.sql');

const ROUTES_PER_SCHOOL = 5;
const STUDENTS_PER_SCHOOL = 15;
const PARENTS_PER_SCHOOL = 10;

// Board UUIDs
const BOARDS = {
  OCDSB: 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
  OCSB: 'b1a2b3c4-d5e6-4f7a-8b9c-1d2e3f4a5b6c',
} as const;

// School definitions
const SCHOOLS = [
  {
    idx: 1,
    abbrev: 'STBERN',
    board: 'OCSB' as const,
    name: 'St. Bernadette Catholic Elementary School',
    lat: 45.270533724914415,
    lng: -75.88490468637625,
  },
  {
    idx: 2,
    abbrev: 'ALLSNT',
    board: 'OCSB' as const,
    name: 'All Saints High School',
    lat: 45.321918945667505,
    lng: -75.92505561029174,
  },
  {
    idx: 3,
    abbrev: 'SACRHRT',
    board: 'OCSB' as const,
    name: 'Sacred Heart Catholic High School (7-12)',
    lat: 45.264239460178125,
    lng: -75.91032339376542,
  },
  {
    idx: 4,
    abbrev: 'JYOUNG',
    board: 'OCDSB' as const,
    name: 'John Young Elementary School',
    lat: 45.29004470827141,
    lng: -75.88407039737974,
  },
  {
    idx: 5,
    abbrev: 'MPLWD',
    board: 'OCDSB' as const,
    name: 'Maplewood Secondary School',
    lat: 45.26742703969896,
    lng: -75.89142583068907,
  },
  {
    idx: 6,
    abbrev: 'AYJACK',
    board: 'OCDSB' as const,
    name: 'A.Y. Jackson S.S.',
    lat: 45.295263862678645,
    lng: -75.87950214831503,
  },
];

// Name pools
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
  'Amelia',
  'Ethan',
  'Harper',
  'Daniel',
  'Evelyn',
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
  'Hall',
  'Allen',
  'Young',
  'King',
  'Wright',
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
  'Sycamore Dr',
  'Laurel Way',
  'Chestnut Blvd',
  'Magnolia Ct',
];

const AM_START_TIMES = ['07:00', '07:10', '07:15', '07:25', '07:30'];
const PM_START_TIMES = ['14:45', '14:55', '15:00', '15:10', '15:15'];

// ============================================================================
// Seeded PRNG (Linear Congruential Generator) for determinism
// ============================================================================

function createRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

// ============================================================================
// UUID Generators (deterministic)
// ============================================================================

function schoolId(s: number): string {
  return `30000000-0000-0000-000${s}-000000000001`;
}

function schoolAdminId(s: number): string {
  return `30000000-0000-0000-000${s}-00000000000a`;
}

function driverId(s: number): string {
  return `30000000-0000-0000-000${s}-00000000000d`;
}

function studentId(s: number, n: number): string {
  return `30000000-0000-000${s}-0000-${String(n).padStart(12, '0')}`;
}

function parentId(s: number, n: number): string {
  return `30000000-0000-000${s}-0000-0000000${String(n).padStart(5, '0')}`;
}

function operationalRouteId(s: number, r: number, direction: 'AM' | 'PM'): string {
  const d = direction === 'AM' ? 1 : 2;
  return `a0000000-000${s}-00${String(r).padStart(2, '0')}-0000-00000000000${d}`;
}

function operationalStopId(s: number, r: number, direction: 'AM' | 'PM', stopSeq: number): string {
  const d = direction === 'AM' ? 1 : 2;
  return `a1000000-000${s}-00${String(r).padStart(2, '0')}-000${d}-${String(stopSeq).padStart(12, '0')}`;
}

function refRouteId(abbrev: string, r: number, direction: 'AM' | 'PM'): string {
  return `ROUTE-${abbrev}-R${String(r).padStart(2, '0')}-${direction}`;
}

function refStopId(abbrev: string, r: number, direction: 'AM' | 'PM', stopSeq: number): string {
  return `STOP-${abbrev}-R${String(r).padStart(2, '0')}-${direction}-S${String(stopSeq).padStart(2, '0')}`;
}

// ============================================================================
// Geo Helpers
// ============================================================================

function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distKm: number,
): [number, number] {
  const R = 6371;
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

// ============================================================================
// OSRM
// ============================================================================

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
    console.error(`  OSRM error: ${e.message}`);
    return null;
  }
}

// ============================================================================
// Stop Generation
// ============================================================================

function generateStops(
  decoded: [number, number][],
  stopCount: number,
  prefix: 'AM' | 'PM',
  routeNum: number,
  rng: () => number,
): Array<{ lat: number; lng: number; label: string; sequence: number }> {
  const step = Math.floor(decoded.length / (stopCount + 1));
  return Array.from({ length: stopCount }, (_, i) => {
    const ptIdx = step * (i + 1);
    const pt = decoded[Math.min(ptIdx, decoded.length - 1)];
    const streetIdx = ((routeNum - 1) * 4 + i) % STREET_NAMES.length;
    const streetIdx2 = ((routeNum - 1) * 4 + i + 1) % STREET_NAMES.length;
    return {
      lat: pt[0],
      lng: pt[1],
      label: `${prefix} Stop ${i + 1} - ${STREET_NAMES[streetIdx]} & ${STREET_NAMES[streetIdx2]}`,
      sequence: i + 1,
    };
  });
}

// ============================================================================
// Data Generation (per school)
// ============================================================================

interface RouteData {
  refId: string;
  opId: string;
  name: string;
  direction: 'AM' | 'PM';
  polyline: string;
  decoded: [number, number][];
  stops: Array<{
    refId: string;
    opId: string;
    lat: number;
    lng: number;
    label: string;
    sequence: number;
  }>;
  startTime: string;
  vehicleId: string;
  driverRefId: string;
}

interface SchoolData {
  school: (typeof SCHOOLS)[0];
  schoolUuid: string;
  boardId: string;
  routes: RouteData[];
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    grade: string;
    amRouteIdx: number;
    pmRouteIdx: number;
    amStopRefId: string;
    pmStopRefId: string;
  }>;
  parents: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    studentIds: string[];
  }>;
  schoolAdmin: { id: string; email: string; firstName: string; lastName: string };
  driver: { id: string; email: string; firstName: string; lastName: string; driverRefId: string };
  vehicles: Array<{ id: string; plate: string }>;
}

async function generateSchoolData(
  school: (typeof SCHOOLS)[0],
  useOsrm: boolean,
): Promise<SchoolData> {
  const s = school.idx;
  const abbrev = school.abbrev;
  const rng = createRng(s * 10000);

  console.log(`\n  School ${s}: ${school.name} (${abbrev})`);

  // Vehicles: 5 buses per school (one per AM/PM route pair)
  const vehicles: Array<{ id: string; plate: string }> = [];
  for (let v = 1; v <= ROUTES_PER_SCHOOL; v++) {
    vehicles.push({
      id: `BUS-${abbrev}-${String(v).padStart(2, '0')}`,
      plate: `ON-${String(3000 + s * 100 + v).padStart(4, '0')}`,
    });
  }

  // Driver
  const driverRefId = `driver-${abbrev.toLowerCase()}-01`;

  // Generate routes (5 corridors, AM + PM each)
  const routes: RouteData[] = [];

  for (let r = 1; r <= ROUTES_PER_SCHOOL; r++) {
    const routeRng = createRng(s * 10000 + r * 100);

    // Spread routes evenly around the school
    const baseBearing = (r - 1) * 72; // 0, 72, 144, 216, 288 degrees
    const jitter = (routeRng() - 0.5) * 20;
    const bearing = baseBearing + jitter;
    const distance = 1.5 + routeRng() * 2.5; // 1.5 - 4.0 km

    const endpoint = destinationPoint(school.lat, school.lng, bearing, distance);
    const stopCount = 5 + Math.floor(routeRng() * 4); // 5-8 stops

    console.log(
      `    Route R${String(r).padStart(2, '0')}: bearing ${bearing.toFixed(0)}°, ${distance.toFixed(1)}km, ${stopCount} stops`,
    );

    let amPolyline = '';
    let amDecoded: [number, number][] = [];
    let pmPolyline = '';
    let pmDecoded: [number, number][] = [];

    if (useOsrm) {
      // AM: endpoint -> school
      const amResult = await getOsrmRoute(endpoint, [school.lat, school.lng]);
      if (amResult) {
        amPolyline = amResult.polyline;
        amDecoded = amResult.decoded;
      } else {
        console.warn(`    WARNING: OSRM failed for R${r} AM, generating straight-line fallback`);
        amDecoded = generateStraightLine(endpoint, [school.lat, school.lng], 50);
      }

      // PM: school -> endpoint
      const pmResult = await getOsrmRoute([school.lat, school.lng], endpoint);
      if (pmResult) {
        pmPolyline = pmResult.polyline;
        pmDecoded = pmResult.decoded;
      } else {
        console.warn(`    WARNING: OSRM failed for R${r} PM, generating straight-line fallback`);
        pmDecoded = generateStraightLine([school.lat, school.lng], endpoint, 50);
      }
    }

    const amStops = generateStops(
      amDecoded.length > 0 ? amDecoded : [[0, 0]],
      stopCount,
      'AM',
      r,
      routeRng,
    );
    const pmStops = generateStops(
      pmDecoded.length > 0 ? pmDecoded : [[0, 0]],
      stopCount,
      'PM',
      r,
      routeRng,
    );

    // AM route
    routes.push({
      refId: refRouteId(abbrev, r, 'AM'),
      opId: operationalRouteId(s, r, 'AM'),
      name: `${abbrev} Route ${r} AM`,
      direction: 'AM',
      polyline: amPolyline,
      decoded: amDecoded,
      stops: amStops.map((st, i) => ({
        refId: refStopId(abbrev, r, 'AM', i + 1),
        opId: operationalStopId(s, r, 'AM', i + 1),
        ...st,
      })),
      startTime: AM_START_TIMES[(r - 1) % AM_START_TIMES.length],
      vehicleId: vehicles[r - 1].id,
      driverRefId,
    });

    // PM route
    routes.push({
      refId: refRouteId(abbrev, r, 'PM'),
      opId: operationalRouteId(s, r, 'PM'),
      name: `${abbrev} Route ${r} PM`,
      direction: 'PM',
      polyline: pmPolyline,
      decoded: pmDecoded,
      stops: pmStops.map((st, i) => ({
        refId: refStopId(abbrev, r, 'PM', i + 1),
        opId: operationalStopId(s, r, 'PM', i + 1),
        ...st,
      })),
      startTime: PM_START_TIMES[(r - 1) % PM_START_TIMES.length],
      vehicleId: vehicles[r - 1].id,
      driverRefId,
    });
  }

  // Students (15 per school, 3 per route corridor)
  const students: SchoolData['students'] = [];
  for (let i = 0; i < STUDENTS_PER_SCHOOL; i++) {
    const routeCorridorIdx = Math.floor(i / 3); // 0-4 (maps to routes R01-R05)
    const amRoute = routes[routeCorridorIdx * 2]; // AM route for this corridor
    const pmRoute = routes[routeCorridorIdx * 2 + 1]; // PM route for this corridor
    const stopIdx = i % Math.min(amRoute.stops.length, 3); // Distribute across first 3 stops

    const nameIdx = (s * 20 + i) % FIRST_NAMES.length;
    const lastNameIdx = (s * 20 + i) % LAST_NAMES.length;
    const grade =
      school.name.includes('Elementary') ||
      school.name.includes('Bernadette') ||
      school.name.includes('John Young')
        ? String(1 + (i % 6)) // Grades 1-6 for elementary
        : String(7 + (i % 6)); // Grades 7-12 for high/secondary

    students.push({
      id: studentId(s, i + 1),
      firstName: FIRST_NAMES[nameIdx],
      lastName: LAST_NAMES[lastNameIdx],
      grade,
      amRouteIdx: routeCorridorIdx * 2,
      pmRouteIdx: routeCorridorIdx * 2 + 1,
      amStopRefId: amRoute.stops[stopIdx]?.refId || amRoute.stops[0]?.refId || '',
      pmStopRefId: pmRoute.stops[stopIdx]?.refId || pmRoute.stops[0]?.refId || '',
    });
  }

  // Parents (10 per school: first 5 get 2 children, next 5 get 1 child = 15)
  const parents: SchoolData['parents'] = [];
  let studentIdx = 0;
  for (let i = 0; i < PARENTS_PER_SCHOOL; i++) {
    const childCount = i < 5 ? 2 : 1;
    const childIds = students.slice(studentIdx, studentIdx + childCount).map((st) => st.id);
    studentIdx += childCount;

    const nameIdx = (s * 10 + i) % PARENT_FIRST_NAMES.length;
    const lastNameIdx = (s * 10 + i) % PARENT_LAST_NAMES.length;

    parents.push({
      id: parentId(s, i + 1),
      email: `parent${i + 1}.${abbrev.toLowerCase()}@sbtm.demo`,
      firstName: PARENT_FIRST_NAMES[nameIdx],
      lastName: PARENT_LAST_NAMES[lastNameIdx],
      studentIds: childIds,
    });
  }

  return {
    school,
    schoolUuid: schoolId(s),
    boardId: BOARDS[school.board],
    routes,
    students,
    parents,
    schoolAdmin: {
      id: schoolAdminId(s),
      email: `admin.${abbrev.toLowerCase()}@sbtm.demo`,
      firstName: 'Admin',
      lastName: school.name.split(' ')[0],
    },
    driver: {
      id: driverId(s),
      email: `driver.${abbrev.toLowerCase()}@sbtm.demo`,
      firstName: 'Driver',
      lastName: school.name.split(' ')[0],
      driverRefId,
    },
    vehicles,
  };
}

function generateStraightLine(
  from: [number, number],
  to: [number, number],
  points: number,
): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    result.push([
      parseFloat((from[0] + t * (to[0] - from[0])).toFixed(6)),
      parseFloat((from[1] + t * (to[1] - from[1])).toFixed(6)),
    ]);
  }
  return result;
}

// ============================================================================
// SQL Generation
// ============================================================================

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

function generateSql(allSchools: SchoolData[]): string {
  const lines: string[] = [];

  lines.push('-- ============================================================================');
  lines.push('-- SBTM Demo Seed Data (6-School Setup)');
  lines.push('-- Generated by scripts/generate-demo-routes.ts');
  lines.push(
    '-- DO NOT EDIT MANUALLY - regenerate with: npx tsx scripts/generate-demo-routes.ts --from-cache',
  );
  lines.push('-- ============================================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // --- Schools ---
  lines.push('-- ===================== Schools =====================');
  for (const sd of allSchools) {
    lines.push(`INSERT INTO schools (id, name, "boardId", lat, lng) VALUES`);
    lines.push(
      `    ('${sd.schoolUuid}', '${escSql(sd.school.name)}', '${sd.boardId}', ${sd.school.lat}, ${sd.school.lng});`,
    );
  }
  lines.push('');

  // --- School Admins ---
  lines.push('-- ===================== School Admins =====================');
  for (const sd of allSchools) {
    lines.push(
      `INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "schoolId", "boardId") VALUES`,
    );
    lines.push(
      `    ('${sd.schoolAdmin.id}', '${sd.schoolAdmin.email}', crypt('Admin123!', gen_salt('bf')), 'SCHOOL_ADMIN', '${escSql(sd.schoolAdmin.firstName)}', '${escSql(sd.schoolAdmin.lastName)}', '${sd.schoolUuid}', '${sd.boardId}');`,
    );
  }
  lines.push('');

  // --- Drivers ---
  lines.push('-- ===================== Drivers =====================');
  for (const sd of allSchools) {
    const assignedRouteIds = sd.routes.map((r) => r.refId).join(',');
    lines.push(
      `INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "driverId", "assignedRouteIds", "schoolId", "boardId") VALUES`,
    );
    lines.push(
      `    ('${sd.driver.id}', '${sd.driver.email}', crypt('Admin123!', gen_salt('bf')), 'DRIVER', '${escSql(sd.driver.firstName)}', '${escSql(sd.driver.lastName)}', '${sd.driver.driverRefId}', '${assignedRouteIds}', '${sd.schoolUuid}', '${sd.boardId}');`,
    );
  }
  lines.push('');

  // --- Vehicles ---
  lines.push('-- ===================== Vehicles =====================');
  for (const sd of allSchools) {
    for (const vehicle of sd.vehicles) {
      lines.push(`INSERT INTO vehicles (id, "schoolId", "licensePlate", status) VALUES`);
      lines.push(`    ('${vehicle.id}', '${sd.schoolUuid}', '${vehicle.plate}', 'ACTIVE');`);
      lines.push(`INSERT INTO vehicles_reference (id, "plateNumber", capacity, status) VALUES`);
      lines.push(`    ('${vehicle.id}', '${vehicle.plate}', 48, 'ACTIVE');`);
    }
  }
  lines.push('');

  // --- Routes (operational + reference) ---
  lines.push('-- ===================== Routes =====================');
  for (const sd of allSchools) {
    for (const route of sd.routes) {
      // Operational route
      const polylineEsc = route.polyline ? `'${escSql(route.polyline)}'` : 'NULL';
      lines.push(
        `INSERT INTO routes (id, "schoolId", name, direction, "vehicleId", "startTime", polyline) VALUES`,
      );
      lines.push(
        `    ('${route.opId}', '${sd.schoolUuid}', '${escSql(route.name)}', '${route.direction}', '${route.vehicleId}', '${route.startTime}', ${polylineEsc});`,
      );

      // Reference route
      const schedule = JSON.stringify({
        startTime: route.startTime,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      });
      lines.push(
        `INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule, polyline, "schoolId", direction) VALUES`,
      );
      lines.push(
        `    ('${route.refId}', '${escSql(route.name)}', '${route.vehicleId}', '${route.driverRefId}', '${escSql(schedule)}', ${polylineEsc}, '${sd.schoolUuid}', '${route.direction}');`,
      );
    }
  }
  lines.push('');

  // --- Route Stops (operational + reference) ---
  lines.push('-- ===================== Route Stops =====================');
  for (const sd of allSchools) {
    for (const route of sd.routes) {
      for (const stop of route.stops) {
        // Operational stop
        lines.push(
          `INSERT INTO route_stops (id, "routeId", "sequence", "address", lat, lng, "location") VALUES`,
        );
        lines.push(
          `    ('${stop.opId}', '${route.opId}', ${stop.sequence}, '${escSql(stop.label)}', ${stop.lat}, ${stop.lng}, ST_SetSRID(ST_MakePoint(${stop.lng}, ${stop.lat}), 4326)::geography);`,
        );

        // Reference stop
        const arrivalMinutes =
          route.direction === 'AM'
            ? `${String(7 + Math.floor((stop.sequence * 5) / 60)).padStart(2, '0')}:${String((parseInt(route.startTime.split(':')[1]) + stop.sequence * 5) % 60).padStart(2, '0')}`
            : `${String(15 + Math.floor((stop.sequence * 5) / 60)).padStart(2, '0')}:${String((parseInt(route.startTime.split(':')[1]) + stop.sequence * 5) % 60).padStart(2, '0')}`;
        lines.push(
          `INSERT INTO route_stops_reference (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES`,
        );
        lines.push(
          `    ('${stop.refId}', '${route.refId}', ${stop.sequence}, '${escSql(stop.label)}', ${stop.lat}, ${stop.lng}, '${arrivalMinutes}');`,
        );
      }
    }
  }
  lines.push('');

  // --- Parents ---
  lines.push('-- ===================== Parents =====================');
  for (const sd of allSchools) {
    for (const parent of sd.parents) {
      // Collect all route ref IDs for the parent's children
      const childRouteIdSet = new Set<string>();
      for (const childId of parent.studentIds) {
        const student = sd.students.find((st) => st.id === childId);
        if (student) {
          childRouteIdSet.add(sd.routes[student.amRouteIdx].refId);
          childRouteIdSet.add(sd.routes[student.pmRouteIdx].refId);
        }
      }
      const childRouteIds = [...childRouteIdSet].join(',');

      lines.push(
        `INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "childRouteIds", "schoolId", "boardId") VALUES`,
      );
      lines.push(
        `    ('${parent.id}', '${parent.email}', crypt('Admin123!', gen_salt('bf')), 'PARENT', '${escSql(parent.firstName)}', '${escSql(parent.lastName)}', '${childRouteIds}', '${sd.schoolUuid}', '${sd.boardId}');`,
      );
    }
  }
  lines.push('');

  // --- Students ---
  lines.push('-- ===================== Students =====================');
  for (const sd of allSchools) {
    for (const student of sd.students) {
      const amRoute = sd.routes[student.amRouteIdx];
      const pmRoute = sd.routes[student.pmRouteIdx];
      const parentUser = sd.parents.find((p) => p.studentIds.includes(student.id));

      // Operational students table
      lines.push(
        `INSERT INTO students (id, first_name, last_name, grade, school_id, parent_user_id, am_route_id, pm_route_id, am_stop_id, pm_stop_id, external_student_id) VALUES`,
      );
      lines.push(
        `    ('${student.id}', '${escSql(student.firstName)}', '${escSql(student.lastName)}', '${student.grade}', '${sd.schoolUuid}', ${parentUser ? `'${parentUser.id}'` : 'NULL'}, '${amRoute.opId}', '${pmRoute.opId}', '${student.amStopRefId ? findOpStopId(amRoute, student.amStopRefId) : 'NULL'}', '${student.pmStopRefId ? findOpStopId(pmRoute, student.pmStopRefId) : 'NULL'}', '${student.id}');`,
      );

      // Reference students table
      lines.push(
        `INSERT INTO students_reference (id, "firstName", "lastName", grade, "parentId", "schoolId", "assignedRouteId", "amRouteId", "pmRouteId", "amStopId", "pmStopId") VALUES`,
      );
      lines.push(
        `    ('${student.id}', '${escSql(student.firstName)}', '${escSql(student.lastName)}', ${parseInt(student.grade)}, '${parentUser?.id || ''}', '${sd.schoolUuid}', '${amRoute.refId}', '${amRoute.refId}', '${pmRoute.refId}', '${student.amStopRefId}', '${student.pmStopRefId}');`,
      );
    }
  }
  lines.push('');

  // --- Student Tags (first 3 students per school) ---
  lines.push('-- ===================== Student Tags =====================');
  let tagCounter = 1;
  for (const sd of allSchools) {
    for (let i = 0; i < Math.min(3, sd.students.length); i++) {
      lines.push(`INSERT INTO student_tag ("schoolId", "studentId", "tagId", "tagType") VALUES`);
      lines.push(
        `    ('${sd.schoolUuid}', '${sd.students[i].id}', 'TAG-${String(tagCounter).padStart(3, '0')}', 'SMARTTAG');`,
      );
      tagCounter++;
    }
  }
  lines.push('');

  // --- Seed location points (one per route pair, offset from school to avoid bus-at-school issue) ---
  lines.push('-- ===================== Seed Location Points =====================');
  for (const sd of allSchools) {
    for (let r = 0; r < ROUTES_PER_SCHOOL; r++) {
      const amRoute = sd.routes[r * 2]; // AM route
      const pmRoute = sd.routes[r * 2 + 1]; // PM route

      // Place seed location at the first stop of the route (not at school)
      const amFirstStop = amRoute.stops[0];
      const pmFirstStop = pmRoute.stops[0];
      const amLat = amFirstStop?.lat || sd.school.lat + 0.005 * (r + 1);
      const amLng = amFirstStop?.lng || sd.school.lng + 0.005 * (r + 1);
      const pmLat = pmFirstStop?.lat || sd.school.lat - 0.005 * (r + 1);
      const pmLng = pmFirstStop?.lng || sd.school.lng - 0.005 * (r + 1);

      lines.push(
        `INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng, speed_kph, heading_deg) VALUES`,
      );
      lines.push(
        `    ('seed-loc-${sd.school.abbrev.toLowerCase()}-r${r + 1}-am', '${sd.schoolUuid}', '${amRoute.vehicleId}', '${amRoute.refId}', NOW(), ${amLat}, ${amLng}, 0, 0);`,
      );
      lines.push(
        `INSERT INTO location_points (id, school_id, vehicle_id, route_id, timestamp, lat, lng, speed_kph, heading_deg) VALUES`,
      );
      lines.push(
        `    ('seed-loc-${sd.school.abbrev.toLowerCase()}-r${r + 1}-pm', '${sd.schoolUuid}', '${pmRoute.vehicleId}', '${pmRoute.refId}', NOW(), ${pmLat}, ${pmLng}, 0, 0);`,
      );
    }
  }
  lines.push('');

  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}

function findOpStopId(route: RouteData, refStopId: string): string {
  const stop = route.stops.find((s) => s.refId === refStopId);
  return stop ? stop.opId : 'NULL';
}

// ============================================================================
// Cache serialization
// ============================================================================

interface CacheData {
  generatedAt: string;
  schools: SchoolData[];
}

function saveCache(data: CacheData): void {
  // Strip decoded polyline arrays from cache to keep file size manageable
  // (polylines are stored as encoded strings and can be re-decoded)
  const slimData = {
    ...data,
    schools: data.schools.map((sd) => ({
      ...sd,
      routes: sd.routes.map((r) => ({
        ...r,
        decoded: r.decoded.length > 0 ? r.decoded : [], // Keep decoded for stop reference
      })),
    })),
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(slimData, null, 2));
  console.log(`\nCache written to ${CACHE_PATH}`);
}

function loadCache(): CacheData {
  const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
  const data = JSON.parse(raw) as CacheData;

  // Migrate old single-vehicle format to new multi-vehicle format
  for (const sd of data.schools) {
    if (!sd.vehicles && (sd as any).vehicle) {
      // Old format: single vehicle shared by all routes
      // Create 5 vehicles (one per AM/PM route pair) from the route data
      const vehicleIdSet = new Set<string>();
      const vehicleMap = new Map<string, { id: string; plate: string }>();

      for (const route of sd.routes) {
        if (!vehicleIdSet.has(route.vehicleId)) {
          vehicleIdSet.add(route.vehicleId);
          // Derive plate from the route pair index
          const pairIdx = vehicleIdSet.size;
          const s = sd.school.idx;
          vehicleMap.set(route.vehicleId, {
            id: route.vehicleId,
            plate: `ON-${String(3000 + s * 100 + pairIdx).padStart(4, '0')}`,
          });
        }
      }

      // If all routes still share one vehicle, generate per-pair vehicles
      if (vehicleIdSet.size === 1) {
        const oldVehicle = (sd as any).vehicle;
        sd.vehicles = [];
        for (let r = 1; r <= ROUTES_PER_SCHOOL; r++) {
          const newVehicleId = `BUS-${sd.school.abbrev}-${String(r).padStart(2, '0')}`;
          const plate = `ON-${String(3000 + sd.school.idx * 100 + r).padStart(4, '0')}`;
          sd.vehicles.push({ id: newVehicleId, plate });

          // Update routes to use the new per-pair vehicle
          const amIdx = (r - 1) * 2;
          const pmIdx = (r - 1) * 2 + 1;
          if (sd.routes[amIdx]) sd.routes[amIdx].vehicleId = newVehicleId;
          if (sd.routes[pmIdx]) sd.routes[pmIdx].vehicleId = newVehicleId;
        }
      } else {
        sd.vehicles = [...vehicleMap.values()];
      }
      delete (sd as any).vehicle;
    }
  }

  return data;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const fromCache = process.argv.includes('--from-cache');

  let allSchools: SchoolData[];

  if (fromCache) {
    console.log('Loading from cache...');
    const cache = loadCache();
    allSchools = cache.schools;
    console.log(
      `  Loaded ${allSchools.length} schools from cache (generated ${cache.generatedAt})`,
    );
  } else {
    console.log('Generating demo routes via OSRM...');
    console.log(`  OSRM URL: ${OSRM_URL}`);
    console.log(`  Schools: ${SCHOOLS.length}`);
    console.log(`  Routes per school: ${ROUTES_PER_SCHOOL} AM + ${ROUTES_PER_SCHOOL} PM`);

    allSchools = [];
    for (const school of SCHOOLS) {
      const data = await generateSchoolData(school, true);
      allSchools.push(data);
    }

    saveCache({ generatedAt: new Date().toISOString(), schools: allSchools });
  }

  // Generate SQL
  const sql = generateSql(allSchools);
  fs.writeFileSync(SQL_PATH, sql);
  console.log(`\nSQL written to ${SQL_PATH}`);

  // Summary
  let totalRoutes = 0,
    totalStops = 0,
    totalStudents = 0,
    totalParents = 0,
    totalVehicles = 0;
  for (const sd of allSchools) {
    totalRoutes += sd.routes.length;
    totalStops += sd.routes.reduce((acc, r) => acc + r.stops.length, 0);
    totalStudents += sd.students.length;
    totalParents += sd.parents.length;
    totalVehicles += sd.vehicles.length;
  }
  console.log(`\nSummary:`);
  console.log(`  Schools:  ${allSchools.length}`);
  console.log(`  Routes:   ${totalRoutes} (${totalRoutes / 2} AM + ${totalRoutes / 2} PM)`);
  console.log(`  Stops:    ${totalStops}`);
  console.log(`  Students: ${totalStudents}`);
  console.log(`  Parents:  ${totalParents}`);
  console.log(`  Drivers:  ${allSchools.length}`);
  console.log(`  Vehicles: ${totalVehicles} (${ROUTES_PER_SCHOOL} per school)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
