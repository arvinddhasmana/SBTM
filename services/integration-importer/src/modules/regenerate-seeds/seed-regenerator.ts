import { Logger } from '@nestjs/common';
import * as path from 'path';
import type { LatLon } from '../shape-fallback/osrm-client';
import { readCsv, readJson, writeCsv, writeJson } from './csv-io';
import { cumulativeDistances } from './geo';
import { BELL_SCHEDULE, MUNICIPAL_RULES, type BoardCode } from './municipal-rules';
import type { OsrmPlanningClient } from './osrm-planning-client';
import { orderStopsForTrip, planRouteShape } from './route-planner';
import { SCHOOLS, type SchoolDef } from './schools';
import { SeededRng } from './seeded-rng';
import { planRoadSnappedStops, planStudentHomeNearStop } from './stop-planner';

/**
 * Top-level seed-regen orchestrator. Walks each STA bundle directory and
 * rewrites the *geometry- and time-bearing columns* of the CSVs:
 *
 *   - `sta-stops.csv`        latitude / longitude → OSRM road-snapped
 *   - `sta-shapes.csv`       full rewrite, one polyline per trip (AM + PM)
 *   - `sta-trips.csv`        ensure every trip has a `shape_id`
 *   - `sta-stop-times.csv`   times back/forward-scheduled from bell schedule
 *   - `students.csv`         `home_lat/home_lon` snapped near each student's
 *                            ridership stop, ≤MAX_WALK_DISTANCE_M from it
 *   - `board-school.csv`     coordinates updated to real school location
 *   - `manifest.json`        `row_count` per file refreshed (sha256 stays
 *                            `<computed-at-export>`; sta-csv.adapter.ts
 *                            already treats that as a skip token)
 *
 * Routes / trips / stops / students / guardian IDs are preserved so all
 * downstream auth seeds and tests continue to resolve.
 *
 * Direction inference:
 *   - sta-routes.csv has a `direction` column ('AM' | 'PM').
 *   - A route number always has paired AM and PM trips in sta-trips.csv
 *     when the bundle includes both; we plan a shape for *every* trip
 *     regardless so the parent / driver maps always render a polyline.
 */
export interface RegenerateOptions {
  bundleRoot: string; // e.g. docs/Design/samples/two-sta-bundle
  seed: number;
  osrm: OsrmPlanningClient;
  /** Subset of STA shortcodes; default: all. */
  staFilter?: ('OSTA' | 'RCJTC' | 'OCSB')[];
}

interface StopRow {
  sta_stop_id: string;
  name: string;
  latitude: string;
  longitude: string;
  stop_kind: string;
  hazard_zone: string;
  [k: string]: string;
}
interface RouteRow {
  sta_route_number: string;
  description: string;
  board_code: string;
  school_code: string;
  direction: string;
  operator_code: string;
  effective_from: string;
  effective_to: string;
  [k: string]: string;
}
interface TripRow {
  sta_trip_id: string;
  sta_route_number: string;
  service_id: string;
  direction_id: string;
  shape_id: string;
  headsign: string;
  block_id: string;
  [k: string]: string;
}
interface StopTimeRow {
  sta_route_number: string;
  sta_trip_id: string;
  sta_stop_id: string;
  sequence: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  dwell_seconds: string;
  [k: string]: string;
}
interface ShapeRow {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
  shape_dist_traveled: string;
  [k: string]: string;
}
interface StudentRow {
  board_student_number: string;
  oen: string;
  legal_name: string;
  preferred_name: string;
  grade: string;
  date_of_birth: string;
  school_code: string;
  home_address: string;
  home_lat: string;
  home_lon: string;
  eligibility_kind: string;
  medical_flags_json: string;
  transport_flags_json: string;
  [k: string]: string;
}
interface RidershipRow {
  board_student_number: string;
  sta_route_number: string;
  sta_stop_id: string;
  direction: string;
  effective_from: string;
  effective_to: string;
  [k: string]: string;
}
interface BoardSchoolRow {
  sta_short_code: string;
  board_code: string;
  board_name: string;
  school_code: string;
  school_name: string;
  address: string;
  latitude: string;
  longitude: string;
  bell_schedule_code: string;
  alerts_enabled: string;
  [k: string]: string;
}

const logger = new Logger('SeedRegenerator');

export async function regenerateSeedBundle(opts: RegenerateOptions): Promise<void> {
  const filter = opts.staFilter ?? ['OCSB'];
  for (const sta of filter) {
    const dir = path.join(opts.bundleRoot, sta.toLowerCase());
    logger.log(`Regenerating ${sta} bundle at ${dir}`);
    await regenerateOneBundle(dir, sta, opts);
  }
}

async function regenerateOneBundle(
  dir: string,
  sta: 'OSTA' | 'RCJTC' | 'OCSB',
  opts: RegenerateOptions,
): Promise<void> {
  // ---- Load every CSV we will touch.
  const stops = await readCsv<StopRow>(path.join(dir, 'sta-stops.csv'));
  const routes = await readCsv<RouteRow>(path.join(dir, 'sta-routes.csv'));
  const trips = await readCsv<TripRow>(path.join(dir, 'sta-trips.csv'));
  const stopTimes = await readCsv<StopTimeRow>(path.join(dir, 'sta-stop-times.csv'));
  const students = await readCsv<StudentRow>(path.join(dir, 'students.csv'));
  const ridership = await readCsv<RidershipRow>(path.join(dir, 'ridership.csv'));
  const boardSchool = await readCsv<BoardSchoolRow>(path.join(dir, 'board-school.csv'));

  const stopById = new Map(stops.rows.map((s) => [s.sta_stop_id, s]));
  const tripsByRoute = groupBy(trips.rows, (t) => t.sta_route_number);
  const stopTimesByTrip = groupBy(stopTimes.rows, (st) => st.sta_trip_id);

  const newShapeRows: ShapeRow[] = [];

  // Per-route RNG keyed off opts.seed + route number so re-running a single
  // route in tests produces stable output.
  for (const route of routes.rows) {
    const school = SCHOOLS.find(
      (s) => s.staShortCode === sta && s.schoolCode === route.school_code,
    );
    if (!school) {
      throw new Error(
        `${sta}: unknown school_code ${route.school_code} (route ${route.sta_route_number})`,
      );
    }
    const routeTrips = tripsByRoute.get(route.sta_route_number) ?? [];
    if (routeTrips.length === 0) {
      logger.warn(`Route ${route.sta_route_number} has no trips; skipping`);
      continue;
    }

    // Use the AM trip's stop sequence (or fall back to first trip) as the
    // canonical stop list for this route; PM uses the same stops reversed.
    const canonicalTrip = routeTrips[0];
    const canonicalTimes = (stopTimesByTrip.get(canonicalTrip.sta_trip_id) ?? [])
      .slice()
      .sort((a, b) => Number(a.sequence) - Number(b.sequence));
    if (canonicalTimes.length < 2) {
      throw new Error(`Trip ${canonicalTrip.sta_trip_id} has <2 stop-times; cannot regen`);
    }
    // Pickup stops only — the school is usually present as the last entry;
    // drop it because we re-inject it ourselves.
    const pickupStopIds = canonicalTimes
      .map((st) => st.sta_stop_id)
      .filter((id) => !id.endsWith('-SCHOOL'));

    const rng = new SeededRng(opts.seed + hashString(route.sta_route_number));
    let plannedStops: LatLon[];
    if (sta === 'OCSB') {
      // Stop-preserving mode: hand-picked coords in sta-stops.csv are the
      // source of truth. Just curb-snap each one (small drift) so OSRM
      // /route can later thread a clean polyline through them.
      plannedStops = [];
      for (const stopId of pickupStopIds) {
        const row = stopById.get(stopId);
        if (!row) throw new Error(`Stop ${stopId} referenced by trip not in sta-stops.csv`);
        const original = { lat: Number(row.latitude), lon: Number(row.longitude) };
        try {
          plannedStops.push(await opts.osrm.nearest(original));
        } catch {
          plannedStops.push(original);
        }
      }
    } else {
      plannedStops = await planRoadSnappedStops({
        school: { lat: school.lat, lon: school.lon },
        radiusM: school.serviceRadiusM,
        count: pickupStopIds.length,
        rng,
        osrm: opts.osrm,
      });
    }

    // Rewrite lat/lon on the existing stop rows so IDs are preserved.
    pickupStopIds.forEach((stopId, idx) => {
      const row = stopById.get(stopId);
      if (!row) throw new Error(`Stop ${stopId} referenced by trip not in sta-stops.csv`);
      row.latitude = plannedStops[idx].lat.toFixed(6);
      row.longitude = plannedStops[idx].lon.toFixed(6);
    });

    // For each trip, plan a shape and rewrite stop-times.
    for (const trip of routeTrips) {
      const direction = inferDirection(route, trip);
      // OCSB is stop-preserving: the CSV stop-time order already encodes the
      // exact bus visit sequence (AM: pickups → school, PM: school → dropoffs).
      // Skip the nearest-neighbour reorder + PM reverse that other STAs use.
      const orderedStops =
        sta === 'OCSB'
          ? plannedStops.slice()
          : orderStopsForTrip(plannedStops, { lat: school.lat, lon: school.lon }, direction);
      const { polyline, stopDistancesM } = await planRouteShape(orderedStops, opts.osrm);

      // Assign / preserve shape_id.
      const shapeId = trip.shape_id?.trim()
        ? trip.shape_id
        : `SHP-${route.sta_route_number.replace(/^R-/, '')}-${direction}`;
      trip.shape_id = shapeId;

      // Emit shape rows.
      const polyDistances = cumulativeDistances(polyline);
      polyline.forEach((p, i) => {
        newShapeRows.push({
          shape_id: shapeId,
          shape_pt_lat: p.lat.toFixed(6),
          shape_pt_lon: p.lon.toFixed(6),
          shape_pt_sequence: String(i + 1),
          shape_dist_traveled: String(Math.round(polyDistances[i])),
        });
      });

      // Rewrite stop-times for this trip using the ordered sequence.
      const tripTimes = (stopTimesByTrip.get(trip.sta_trip_id) ?? []).slice();
      // Build the canonical ordered stop_id list, then re-bind times to it.
      const orderedStopIds =
        sta === 'OCSB'
          ? pickupStopIds.slice()
          : buildOrderedStopIdsForTrip(pickupStopIds, direction, school.schoolCode);
      if (orderedStopIds.length !== tripTimes.length) {
        // Bundle had a school-sentinel stop; align by replacing.
        const filtered = tripTimes.filter((t) => !t.sta_stop_id.endsWith('-SCHOOL'));
        if (filtered.length === pickupStopIds.length) {
          // No school sentinel; keep what we have.
          tripTimes.length = 0;
          tripTimes.push(...filtered);
        }
      }
      const times = scheduleTrip({
        boardCode: school.boardCode,
        direction,
        stopCount: orderedStopIds.length,
      });
      orderedStopIds.forEach((stopId, idx) => {
        const existing = tripTimes[idx];
        if (!existing) return;
        existing.sta_stop_id = stopId.endsWith('-SCHOOL')
          ? existing.sta_stop_id // preserve any school-id convention
          : stopId;
        existing.sequence = String(idx + 1);
        existing.scheduled_arrival = times[idx].arrival;
        existing.scheduled_departure = times[idx].departure;
        existing.dwell_seconds = String(MUNICIPAL_RULES.DWELL_SECONDS);
      });
    }
  }

  // ---- Update board-school.csv with real school coords.
  for (const row of boardSchool.rows) {
    const s = SCHOOLS.find((x) => x.staShortCode === sta && x.schoolCode === row.school_code);
    if (!s) continue;
    row.latitude = s.lat.toFixed(6);
    row.longitude = s.lon.toFixed(6);
  }

  // ---- Update student home_lat/home_lon near their boarding stop.
  const ridershipByStudent = groupBy(ridership.rows, (r) => r.board_student_number);
  for (const student of students.rows) {
    const rides = ridershipByStudent.get(student.board_student_number) ?? [];
    if (rides.length === 0) continue;
    const stopRow = stopById.get(rides[0].sta_stop_id);
    if (!stopRow) continue;
    const rng = new SeededRng(opts.seed + hashString(student.board_student_number));
    const home = await planStudentHomeNearStop({
      stop: { lat: Number(stopRow.latitude), lon: Number(stopRow.longitude) },
      rng,
      osrm: opts.osrm,
    });
    student.home_lat = home.lat.toFixed(6);
    student.home_lon = home.lon.toFixed(6);
  }

  // ---- Write everything back.
  await writeCsv(path.join(dir, 'sta-stops.csv'), stops.headers, stops.rows);
  await writeCsv(path.join(dir, 'sta-trips.csv'), trips.headers, trips.rows);
  await writeCsv(path.join(dir, 'sta-stop-times.csv'), stopTimes.headers, stopTimes.rows);
  await writeCsv(
    path.join(dir, 'sta-shapes.csv'),
    ['shape_id', 'shape_pt_lat', 'shape_pt_lon', 'shape_pt_sequence', 'shape_dist_traveled'],
    newShapeRows,
  );
  await writeCsv(path.join(dir, 'students.csv'), students.headers, students.rows);
  await writeCsv(path.join(dir, 'board-school.csv'), boardSchool.headers, boardSchool.rows);

  // ---- Refresh manifest row_count.
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = await readJson<{
    files: Record<string, { sha256: string; row_count: number }>;
  }>(manifestPath);
  const counts: Record<string, number> = {
    'sta-stops.csv': stops.rows.length,
    'sta-routes.csv': routes.rows.length,
    'sta-trips.csv': trips.rows.length,
    'sta-stop-times.csv': stopTimes.rows.length,
    'sta-shapes.csv': newShapeRows.length,
    'students.csv': students.rows.length,
    'ridership.csv': ridership.rows.length,
    'board-school.csv': boardSchool.rows.length,
  };
  for (const [file, count] of Object.entries(counts)) {
    if (manifest.files[file]) manifest.files[file].row_count = count;
  }
  await writeJson(manifestPath, manifest);
}

function inferDirection(route: RouteRow, trip: TripRow): 'AM' | 'PM' {
  if (route.direction === 'AM' || route.direction === 'PM') return route.direction;
  // Fallback to trip-id heuristic ("-AM" / "-PM" suffix).
  if (trip.sta_trip_id.endsWith('-PM')) return 'PM';
  return 'AM';
}

function buildOrderedStopIdsForTrip(
  pickupStopIds: string[],
  direction: 'AM' | 'PM',
  _schoolCode: string,
): string[] {
  // We don't synthesize a school stop_id because none exists in the bundle;
  // the stop list is just the pickup stops in the appropriate order.
  return direction === 'AM' ? pickupStopIds : pickupStopIds.slice().reverse();
}

interface ScheduledTime {
  arrival: string;
  departure: string;
}
function scheduleTrip(args: {
  boardCode: BoardCode;
  direction: 'AM' | 'PM';
  stopCount: number;
}): ScheduledTime[] {
  const bell = BELL_SCHEDULE[args.boardCode];
  const interval = MUNICIPAL_RULES.STOP_TRAVEL_SECONDS;
  const dwell = MUNICIPAL_RULES.DWELL_SECONDS;
  const out: ScheduledTime[] = [];
  if (args.direction === 'AM') {
    // Last pickup ≈ bell - 5 min so the bus arrives at school by the bell.
    const lastPickupArr = subtractSeconds(bell.amArrive, 5 * 60);
    for (let i = args.stopCount - 1; i >= 0; i -= 1) {
      const offsetSec = (args.stopCount - 1 - i) * interval;
      const arrival = subtractSeconds(lastPickupArr, offsetSec);
      const departure = addSeconds(arrival, dwell);
      out[i] = { arrival, departure };
    }
  } else {
    // PM: first stop ≈ bell + 5 min (board the bus, then depart).
    const firstArr = addSeconds(bell.pmDepart, 5 * 60);
    for (let i = 0; i < args.stopCount; i += 1) {
      const arrival = addSeconds(firstArr, i * interval);
      const departure = addSeconds(arrival, dwell);
      out[i] = { arrival, departure };
    }
  }
  return out;
}

function addSeconds(hms: string, seconds: number): string {
  const [h, m, s] = hms.split(':').map(Number);
  let total = h * 3600 + m * 60 + s + seconds;
  if (total < 0) total = 0;
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
function subtractSeconds(hms: string, seconds: number): string {
  return addSeconds(hms, -seconds);
}
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const arr = out.get(k);
    if (arr) arr.push(r);
    else out.set(k, [r]);
  }
  return out;
}

/** Tiny FNV-1a so per-route / per-student RNG seeds don't collide. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Re-export for convenience in tests.
export type { LatLon, SchoolDef };
