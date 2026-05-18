import { Injectable } from '@nestjs/common';
import { parse as csvParse } from 'papaparse';
import { TransportDataAdapter } from '../transport-data-adapter.interface';
import { CanonicalRecord } from '../types/canonical-record';
import { SourceFiles } from '../types/source-files';
import { ValidationIssue, ValidationReport } from '../types/validation-report';

const REQUIRED_FILES = ['routes.txt', 'trips.txt', 'stops.txt', 'stop_times.txt'] as const;

const OPTIONAL_FILES = ['shapes.txt', 'agency.txt', 'calendar.txt'] as const;

type GtfsFile = (typeof REQUIRED_FILES)[number] | (typeof OPTIONAL_FILES)[number];

interface GtfsRouteRow {
  route_id: string;
  route_short_name: string;
  route_long_name?: string;
  route_type?: string;
  agency_id?: string;
}

interface GtfsTripRow {
  trip_id: string;
  route_id: string;
  service_id: string;
  direction_id?: string;
  shape_id?: string;
  trip_headsign?: string;
  block_id?: string;
}

interface GtfsStopRow {
  stop_id: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  location_type?: string;
}

interface GtfsStopTimeRow {
  trip_id: string;
  stop_id: string;
  stop_sequence: string;
  arrival_time: string;
  departure_time: string;
}

interface GtfsShapeRow {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
  shape_dist_traveled?: string;
}

function parseCsv<T>(buf: Buffer, file: string, errors: ValidationIssue[]): T[] {
  const result = csvParse<T>(buf.toString('utf8'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    for (const e of result.errors.slice(0, 5)) {
      errors.push({ file, row: e.row, message: e.message });
    }
  }
  return result.data;
}

function requiredField(
  row: Record<string, unknown>,
  field: string,
  file: string,
  rowNum: number,
  errors: ValidationIssue[],
): string | null {
  const v = row[field];
  if (v == null || v === '') {
    errors.push({ file, row: rowNum, column: field, message: `required field is empty` });
    return null;
  }
  return String(v);
}

function parseFloat2(
  s: string | undefined,
  file: string,
  rowNum: number,
  col: string,
  errors: ValidationIssue[],
): number | null {
  if (s == null || s === '') {
    errors.push({ file, row: rowNum, column: col, message: 'required numeric field is empty' });
    return null;
  }
  const n = parseFloat(s);
  if (isNaN(n)) {
    errors.push({ file, row: rowNum, column: col, message: `not a number: ${s}` });
    return null;
  }
  return n;
}

/**
 * Adapter for GTFS-Schedule bundles.
 *
 * Accepts the standard GTFS text files as the `SourceFiles.files` map.
 * Emits CanonicalRecord in dependency order: stops → shapes → routes →
 * trips → stop_times. Board/school/operator/vehicle records are NOT emitted
 * (those come from the STA CSV or admin UI); use this adapter when you have
 * a GTFS feed to update navigation geometry and timetable data only.
 *
 * Route → board mapping is inferred from agency_id when present; falls back
 * to the manifest's `sta_short_code`. School mapping must be resolved post-
 * import (operator configures via Admin UI or supplements with board-school.csv).
 */
@Injectable()
export class GtfsScheduleAdapter implements TransportDataAdapter {
  readonly source = 'gtfs-schedule';

  async validate(input: SourceFiles): Promise<ValidationReport> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const f of REQUIRED_FILES) {
      if (!input.files.has(f)) {
        errors.push({ file: f, message: `required GTFS file is missing from bundle` });
      }
    }
    for (const f of OPTIONAL_FILES) {
      if (!input.files.has(f)) {
        warnings.push({ file: f, message: `optional GTFS file absent — skipping` });
      }
    }
    if (errors.length > 0) return { ok: false, errors, warnings };

    const parseErrors: ValidationIssue[] = [];

    const routes = parseCsv<GtfsRouteRow>(
      input.files.get('routes.txt')!,
      'routes.txt',
      parseErrors,
    );
    if (routes.length === 0) parseErrors.push({ file: 'routes.txt', message: 'no routes found' });

    const trips = parseCsv<GtfsTripRow>(input.files.get('trips.txt')!, 'trips.txt', parseErrors);
    if (trips.length === 0) parseErrors.push({ file: 'trips.txt', message: 'no trips found' });

    const stops = parseCsv<GtfsStopRow>(input.files.get('stops.txt')!, 'stops.txt', parseErrors);
    if (stops.length === 0) parseErrors.push({ file: 'stops.txt', message: 'no stops found' });

    const stopTimes = parseCsv<GtfsStopTimeRow>(
      input.files.get('stop_times.txt')!,
      'stop_times.txt',
      parseErrors,
    );
    if (stopTimes.length === 0)
      parseErrors.push({ file: 'stop_times.txt', message: 'no stop_times found' });

    // Cross-reference: every trip must reference a known route_id.
    const routeIds = new Set(routes.map((r) => r.route_id));
    for (let i = 0; i < Math.min(trips.length, 500); i++) {
      if (!routeIds.has(trips[i].route_id)) {
        parseErrors.push({
          file: 'trips.txt',
          row: i + 2,
          column: 'route_id',
          message: `unknown route_id: ${trips[i].route_id}`,
        });
      }
    }

    errors.push(...parseErrors);
    return { ok: errors.length === 0, errors, warnings };
  }

  async *toCanonical(input: SourceFiles): AsyncIterable<CanonicalRecord> {
    const manifest = input.manifest;
    const staShortCode = manifest.sta_short_code;
    const stopErrors: ValidationIssue[] = [];
    const shapeErrors: ValidationIssue[] = [];
    const routeErrors: ValidationIssue[] = [];
    const tripErrors: ValidationIssue[] = [];
    const stErrors: ValidationIssue[] = [];

    // --- Stops ---
    const stops = parseCsv<GtfsStopRow>(input.files.get('stops.txt')!, 'stops.txt', stopErrors);
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const lat = parseFloat2(s.stop_lat, 'stops.txt', i + 2, 'stop_lat', stopErrors);
      const lon = parseFloat2(s.stop_lon, 'stops.txt', i + 2, 'stop_lon', stopErrors);
      if (!s.stop_id || lat === null || lon === null) continue;
      const isStation = s.location_type === '1';
      yield {
        kind: 'stop',
        staStopId: s.stop_id,
        name: s.stop_name ?? s.stop_id,
        latitude: lat,
        longitude: lon,
        stopKind: isStation ? 'depot' : 'pickup',
        hazardZone: false,
      };
    }

    // --- Shapes (optional) ---
    const shapeBuf = input.files.get('shapes.txt');
    if (shapeBuf) {
      const shapes = parseCsv<GtfsShapeRow>(shapeBuf, 'shapes.txt', shapeErrors);
      for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        const lat = parseFloat2(s.shape_pt_lat, 'shapes.txt', i + 2, 'shape_pt_lat', shapeErrors);
        const lon = parseFloat2(s.shape_pt_lon, 'shapes.txt', i + 2, 'shape_pt_lon', shapeErrors);
        const seq = parseInt(s.shape_pt_sequence, 10);
        if (!s.shape_id || lat === null || lon === null || isNaN(seq)) continue;
        yield {
          kind: 'shape',
          shapeId: s.shape_id,
          sequence: seq,
          latitude: lat,
          longitude: lon,
          distTraveled: s.shape_dist_traveled ? parseFloat(s.shape_dist_traveled) || null : null,
        };
      }
    }

    // --- Routes ---
    const routes = parseCsv<GtfsRouteRow>(
      input.files.get('routes.txt')!,
      'routes.txt',
      routeErrors,
    );
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      const routeId = requiredField(
        r as unknown as Record<string, unknown>,
        'route_id',
        'routes.txt',
        i + 2,
        routeErrors,
      );
      if (!routeId) continue;
      const routeName = r.route_short_name || r.route_long_name || routeId;
      const agencyOrSta = r.agency_id || staShortCode;
      yield {
        kind: 'route',
        staRouteNumber: routeId,
        description: routeName,
        boardCode: agencyOrSta,
        schoolCode: '',
        direction: 'AM',
        operatorCode: agencyOrSta,
        effectiveFrom: manifest.export_at.slice(0, 10),
        effectiveTo: '2099-12-31',
      };
    }

    // --- Trips ---
    const trips = parseCsv<GtfsTripRow>(input.files.get('trips.txt')!, 'trips.txt', tripErrors);
    for (let i = 0; i < trips.length; i++) {
      const t = trips[i];
      if (!t.trip_id || !t.route_id) continue;
      const dirId = t.direction_id === '1' ? 1 : 0;
      yield {
        kind: 'trip',
        staTripId: t.trip_id,
        staRouteNumber: t.route_id,
        serviceId: t.service_id ?? 'DEFAULT',
        directionId: dirId as 0 | 1,
        shapeId: t.shape_id || null,
        headsign: t.trip_headsign || null,
        blockId: t.block_id || null,
      };
    }

    // --- Stop times ---
    const stopTimes = parseCsv<GtfsStopTimeRow>(
      input.files.get('stop_times.txt')!,
      'stop_times.txt',
      stErrors,
    );
    for (let i = 0; i < stopTimes.length; i++) {
      const st = stopTimes[i];
      if (!st.trip_id || !st.stop_id) continue;
      const seq = parseInt(st.stop_sequence, 10);
      if (isNaN(seq)) continue;
      yield {
        kind: 'stopTime',
        staRouteNumber: '',
        staTripId: st.trip_id,
        staStopId: st.stop_id,
        sequence: seq,
        scheduledArrival: st.arrival_time ?? st.departure_time ?? '00:00:00',
        scheduledDeparture: st.departure_time ?? st.arrival_time ?? '00:00:00',
        dwellSeconds: 0,
      };
    }
  }
}
