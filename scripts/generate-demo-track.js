#!/usr/bin/env node
/**
 * Generates scripts/demo-gps-track.json for the 4-route demo.
 *
 * Structure:
 *   - 2 schools × 2 routes = 4 routes
 *   - Each route: 12 stops, 22 students, 3 intermediate waypoints between stops
 *   - R01 has hasDeviationAlert, R02 has hasPanicAlert
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SCHOOL1 = { id: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', name: 'Greenfield Elementary', lat: 45.3876, lng: -75.696 };
const SCHOOL2 = { id: 'c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', name: 'Riverside Academy',     lat: 45.3960, lng: -75.730 };

const ROUTES_DEF = [
  {
    routeId:           'ROUTE-R01',
    vehicleId:         'BUS-01',
    driverEmail:       'driver1@sbtm.demo',
    driverId:          'driver-001',
    school:            SCHOOL1,
    hasDeviationAlert: true,
    hasPanicAlert:     false,
    studentOffset:     1,   // STUDENT-001 .. STUDENT-022
    stops: [
      { lat: 45.3680, lng: -75.6693, name: 'Bank & Walkley' },
      { lat: 45.3699, lng: -75.6700, name: 'Bank & Kilborn' },
      { lat: 45.3733, lng: -75.6718, name: 'Billings Bridge' },
      { lat: 45.3755, lng: -75.6749, name: 'Bank & Johnston Rd' },
      { lat: 45.3762, lng: -75.6757, name: 'Bank & Connell Ave' },
      { lat: 45.3780, lng: -75.6790, name: 'Bank & Heron Rd' },
      { lat: 45.3800, lng: -75.6808, name: 'Bank & Randall Ave' },
      { lat: 45.3815, lng: -75.6827, name: 'Bank & Seneca St' },
      { lat: 45.3830, lng: -75.6844, name: 'Bank & Belmont Ave' },
      { lat: 45.3843, lng: -75.6860, name: 'Bank & Holmwood Ave' },
      { lat: 45.3855, lng: -75.6878, name: 'Bank & Fifth Ave' },
      { lat: 45.3867, lng: -75.6902, name: 'Bank & Sunnyside Ave' },
    ],
  },
  {
    routeId:           'ROUTE-R02',
    vehicleId:         'BUS-02',
    driverEmail:       'driver2@sbtm.demo',
    driverId:          'driver-002',
    school:            SCHOOL1,
    hasDeviationAlert: false,
    hasPanicAlert:     true,
    studentOffset:     23,  // STUDENT-023 .. STUDENT-044
    stops: [
      { lat: 45.3758, lng: -75.7200, name: 'Merivale & Carling' },
      { lat: 45.3758, lng: -75.7130, name: 'Carling & Clyde Ave' },
      { lat: 45.3760, lng: -75.7002, name: 'Fisher & Carling' },
      { lat: 45.3762, lng: -75.6990, name: 'Bronson & Carling' },
      { lat: 45.3790, lng: -75.6985, name: 'Bronson & Commissioner' },
      { lat: 45.3817, lng: -75.6982, name: 'Carleton Main Gate' },
      { lat: 45.3828, lng: -75.6976, name: 'Bronson & Aylmer Ave' },
      { lat: 45.3840, lng: -75.6972, name: 'Bronson & Sunnyside Ave' },
      { lat: 45.3851, lng: -75.6968, name: 'Bronson & Holmwood Ave' },
      { lat: 45.3861, lng: -75.6964, name: 'Bronson & Third Ave' },
      { lat: 45.3868, lng: -75.6961, name: 'Bronson & Glebe Ave' },
      { lat: 45.3873, lng: -75.6958, name: 'Chamberlain & Percy' },
    ],
  },
  {
    routeId:           'ROUTE-R11',
    vehicleId:         'BUS-11',
    driverEmail:       'driver11@sbtm.demo',
    driverId:          'driver-011',
    school:            SCHOOL2,
    hasDeviationAlert: false,
    hasPanicAlert:     false,
    studentOffset:     45,  // STUDENT-045 .. STUDENT-066
    stops: [
      { lat: 45.3900, lng: -75.7600, name: 'Richmond & Woodroffe' },
      { lat: 45.3905, lng: -75.7545, name: 'Richmond & Currell Blvd' },
      { lat: 45.3910, lng: -75.7490, name: 'Richmond & Roseberry' },
      { lat: 45.3913, lng: -75.7435, name: 'Richmond & Cleary Ave' },
      { lat: 45.3916, lng: -75.7388, name: 'Richmond & Churchill' },
      { lat: 45.3920, lng: -75.7345, name: 'Richmond & Golden Ave' },
      { lat: 45.3928, lng: -75.7320, name: 'Richmond & Athlone Ave' },
      { lat: 45.3935, lng: -75.7305, name: 'Richmond & Island Park' },
      { lat: 45.3940, lng: -75.7295, name: 'Richmond & Grosvenor' },
      { lat: 45.3947, lng: -75.7298, name: 'Byron Ave & Island Park' },
      { lat: 45.3953, lng: -75.7300, name: 'Byron Ave Mid' },
      { lat: 45.3957, lng: -75.7300, name: 'Byron at School Ave' },
    ],
  },
  {
    routeId:           'ROUTE-R12',
    vehicleId:         'BUS-12',
    driverEmail:       'driver12@sbtm.demo',
    driverId:          'driver-012',
    school:            SCHOOL2,
    hasDeviationAlert: false,
    hasPanicAlert:     false,
    studentOffset:     67,  // STUDENT-067 .. STUDENT-088
    stops: [
      { lat: 45.4000, lng: -75.7050, name: 'Scott & Bayview' },
      { lat: 45.3992, lng: -75.7110, name: 'Scott & Preston' },
      { lat: 45.3988, lng: -75.7155, name: 'Scott & Booth St' },
      { lat: 45.3985, lng: -75.7200, name: 'Scott & Empress Ave' },
      { lat: 45.3983, lng: -75.7230, name: 'Scott & Breezehill' },
      { lat: 45.3980, lng: -75.7255, name: 'Scott & Holland Ave' },
      { lat: 45.3975, lng: -75.7275, name: 'Scott & Parkdale Ave' },
      { lat: 45.3970, lng: -75.7295, name: 'Scott & Winona Ave' },
      { lat: 45.3965, lng: -75.7309, name: 'Scott & Island Park' },
      { lat: 45.3960, lng: -75.7310, name: 'Island Park & Byron' },
      { lat: 45.3959, lng: -75.7306, name: 'School Approach' },
      { lat: 45.3958, lng: -75.7302, name: 'Near Riverside Academy' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function lerp(a, b, t) { return a + (b - a) * t; }
function round6(n) { return Math.round(n * 1e6) / 1e6; }

/** Build intermediate waypoints between two lat/lng points */
function intermediates(from, to, count = 3) {
  const pts = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    pts.push({ lat: round6(lerp(from.lat, to.lat, t)), lng: round6(lerp(from.lng, to.lng, t)), speedKph: 30 });
  }
  return pts;
}

/**
 * Student list per-stop for 22 students/route.
 * idx 1  → 1 student (stop 1)
 * idx 2  → 1 student (stop 2)
 * idx 3-4 → stop 3  ← 2 students
 * idx 5-6 → stop 4
 * ...
 * idx 21-22 → stop 12
 */
function studentsForStop(stopNum, offset) {
  if (stopNum === 1) {
    const n = offset;
    return [`STUDENT-${String(n).padStart(3, '0')}`];
  }
  if (stopNum === 2) {
    const n = offset + 1;
    return [`STUDENT-${String(n).padStart(3, '0')}`];
  }
  // stop 3+ → 2 students
  // idx = (stopNum-3)*2 + 3  and idx+1
  const idx = (stopNum - 3) * 2 + 3;  // 0-based offset within route block
  const a = offset + idx;
  const b = offset + idx + 1;
  return [
    `STUDENT-${String(a).padStart(3, '0')}`,
    `STUDENT-${String(b).padStart(3, '0')}`,
  ];
}

// ---------------------------------------------------------------------------
// Build route objects
// ---------------------------------------------------------------------------
function buildRoute(def) {
  const { routeId, vehicleId, driverEmail, driverId, school, hasDeviationAlert, hasPanicAlert, studentOffset, stops } = def;

  // All 22 students for this route
  const allStudents = [];
  for (let i = 0; i < 22; i++) {
    allStudents.push(`STUDENT-${String(studentOffset + i).padStart(3, '0')}`);
  }

  // Build waypoints
  const waypoints = [];

  // First stop
  const firstStop = stops[0];
  waypoints.push({
    lat:          firstStop.lat,
    lng:          firstStop.lng,
    label:        `Stop 1 - ${firstStop.name}`,
    speedKph:     0,
    pauseSeconds: 3,
    students:     studentsForStop(1, studentOffset),
  });

  // Stops 2-12 with intermediates before each
  for (let si = 1; si < stops.length; si++) {
    const from = stops[si - 1];
    const to   = stops[si];

    // 3 intermediate waypoints
    intermediates(from, to, 3).forEach(p => waypoints.push(p));

    // Stop waypoint
    const stopNum = si + 1;
    waypoints.push({
      lat:          to.lat,
      lng:          to.lng,
      label:        `Stop ${stopNum} - ${to.name}`,
      speedKph:     0,
      pauseSeconds: 3,
      students:     studentsForStop(stopNum, studentOffset),
    });
  }

  // Intermediates from last stop to school + school arrival
  intermediates(stops[stops.length - 1], school, 4).forEach(p => waypoints.push(p));
  waypoints.push({
    lat:          school.lat,
    lng:          school.lng,
    label:        `School - ${school.name}`,
    speedKph:     0,
    pauseSeconds: 5,
    students:     allStudents,
  });

  return {
    routeId,
    vehicleId,
    driverEmail,
    driverId,
    schoolId:          school.id,
    isLiveDriver:      true,
    hasDeviationAlert: hasDeviationAlert,
    hasPanicAlert:     hasPanicAlert,
    students:          allStudents,
    waypoints,
  };
}

// ---------------------------------------------------------------------------
// Assemble full JSON
// ---------------------------------------------------------------------------
const routes = ROUTES_DEF.map(buildRoute);

const output = {
  demoConfig: {
    description: '2 schools × 2 routes × 12 stops × 22 students. R01 triggers ROUTE_DEVIATION, R02 triggers PANIC_BUTTON.',
    schools: {
      school1: { name: SCHOOL1.name, lat: SCHOOL1.lat, lng: SCHOOL1.lng, id: SCHOOL1.id },
      school2: { name: SCHOOL2.name, lat: SCHOOL2.lat, lng: SCHOOL2.lng, id: SCHOOL2.id },
    },
    liveDriverRoutes:  routes.map(r => r.routeId),
    liveDriverEmails:  routes.map(r => r.driverEmail),
  },
  defaultTrack: 'ottawa-full',
  tracks: {
    'ottawa-full': { routes },
  },
};

const outPath = path.join(__dirname, 'demo-gps-track.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✅  Wrote ${outPath}`);
console.log(`   Routes: ${routes.map(r => r.routeId).join(', ')}`);
routes.forEach(r => {
  const stopCount = r.waypoints.filter(w => w.label && w.label.includes('Stop')).length;
  console.log(`   ${r.routeId}: ${r.waypoints.length} waypoints, ${stopCount} stops, ${r.students.length} students`);
});
