import { GtfsScheduleAdapter } from './gtfs-schedule.adapter';
import { CanonicalRecord } from '../types/canonical-record';
import { SourceFiles } from '../types/source-files';

const MANIFEST = {
  sta_short_code: 'OSTA',
  export_id: 'test-gtfs-001',
  export_at: '2026-05-18T00:00:00Z',
  files: {},
};

function makeBundle(files: Record<string, string>): SourceFiles {
  const map = new Map<string, Buffer>();
  for (const [name, content] of Object.entries(files)) {
    map.set(name, Buffer.from(content, 'utf8'));
  }
  return { manifest: MANIFEST, files: map };
}

const AGENCY_TXT = `agency_id,agency_name,agency_url,agency_timezone\nOSTA,Ottawa Student Transportation Authority,https://osta.ca,America/Toronto\n`;
const ROUTES_TXT = `route_id,agency_id,route_short_name,route_long_name,route_type\nR-OCDSB-101,OSTA,101,Maplewood AM,3\nR-OCSB-201,OSTA,201,St. Bernadette AM,3\n`;
const TRIPS_TXT = `trip_id,route_id,service_id,direction_id,shape_id\nT-OCDSB-101-AM,R-OCDSB-101,WEEKDAY,0,SH-101\nT-OCSB-201-AM,R-OCSB-201,WEEKDAY,0,\n`;
const STOPS_TXT = `stop_id,stop_name,stop_lat,stop_lon\nSTOP-001,Main St & Oak Ave,45.4215,-75.6972\nSTOP-002,Maplewood Secondary,45.4250,-75.7010\n`;
const STOP_TIMES_TXT = `trip_id,stop_id,stop_sequence,arrival_time,departure_time\nT-OCDSB-101-AM,STOP-001,1,07:45:00,07:45:00\nT-OCDSB-101-AM,STOP-002,2,08:05:00,08:05:00\n`;
const SHAPES_TXT = `shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nSH-101,45.4215,-75.6972,1\nSH-101,45.4220,-75.6980,2\n`;

const FULL_BUNDLE = {
  'agency.txt': AGENCY_TXT,
  'routes.txt': ROUTES_TXT,
  'trips.txt': TRIPS_TXT,
  'stops.txt': STOPS_TXT,
  'stop_times.txt': STOP_TIMES_TXT,
  'shapes.txt': SHAPES_TXT,
};

async function collectRecords(
  adapter: GtfsScheduleAdapter,
  input: SourceFiles,
): Promise<CanonicalRecord[]> {
  const records: CanonicalRecord[] = [];
  for await (const r of adapter.toCanonical(input)) {
    records.push(r);
  }
  return records;
}

describe('GtfsScheduleAdapter.validate()', () => {
  const adapter = new GtfsScheduleAdapter();

  it('returns ok=true for a well-formed GTFS bundle', async () => {
    const report = await adapter.validate(makeBundle(FULL_BUNDLE));
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('returns ok=false when a required file is missing', async () => {
    const { 'stop_times.txt': _, ...rest } = FULL_BUNDLE;
    const report = await adapter.validate(makeBundle(rest));
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.file === 'stop_times.txt')).toBe(true);
  });

  it('warns on optional files that are absent', async () => {
    const { 'shapes.txt': _, 'agency.txt': __, ...rest } = FULL_BUNDLE;
    const report = await adapter.validate(makeBundle(rest));
    expect(report.warnings.some((w) => w.file === 'shapes.txt')).toBe(true);
    expect(report.warnings.some((w) => w.file === 'agency.txt')).toBe(true);
  });

  it('returns error when trips reference unknown route_id', async () => {
    const badTrips = TRIPS_TXT.replace('R-OCDSB-101', 'UNKNOWN-ROUTE');
    const report = await adapter.validate(makeBundle({ ...FULL_BUNDLE, 'trips.txt': badTrips }));
    expect(report.ok).toBe(false);
    expect(report.errors.some((e) => e.column === 'route_id')).toBe(true);
  });
});

describe('GtfsScheduleAdapter.toCanonical()', () => {
  const adapter = new GtfsScheduleAdapter();

  it('emits stops before routes and trips', async () => {
    const records = await collectRecords(adapter, makeBundle(FULL_BUNDLE));
    const firstStop = records.findIndex((r) => r.kind === 'stop');
    const firstRoute = records.findIndex((r) => r.kind === 'route');
    expect(firstStop).toBeLessThan(firstRoute);
  });

  it('emits all stops from stops.txt', async () => {
    const records = await collectRecords(adapter, makeBundle(FULL_BUNDLE));
    const stops = records.filter((r) => r.kind === 'stop');
    expect(stops).toHaveLength(2);
    const stopIds = stops.map((s) => (s as { staStopId: string }).staStopId);
    expect(stopIds).toContain('STOP-001');
    expect(stopIds).toContain('STOP-002');
  });

  it('emits shape points from shapes.txt', async () => {
    const records = await collectRecords(adapter, makeBundle(FULL_BUNDLE));
    const shapes = records.filter((r) => r.kind === 'shape');
    expect(shapes).toHaveLength(2);
    expect(shapes[0]).toMatchObject({ shapeId: 'SH-101', sequence: 1 });
  });

  it('emits routes mapped to sta_short_code when agency_id absent', async () => {
    const { 'agency.txt': _, ...rest } = FULL_BUNDLE;
    const noAgencyRoutes = ROUTES_TXT.replace(/,OSTA,/g, ',,');
    const records = await collectRecords(
      adapter,
      makeBundle({ ...rest, 'routes.txt': noAgencyRoutes }),
    );
    const routes = records.filter((r) => r.kind === 'route');
    expect(routes).toHaveLength(2);
    expect((routes[0] as { boardCode: string }).boardCode).toBe('OSTA');
  });

  it('emits trips with correct direction_id', async () => {
    const records = await collectRecords(adapter, makeBundle(FULL_BUNDLE));
    const trips = records.filter((r) => r.kind === 'trip');
    expect(trips).toHaveLength(2);
    const amTrip = trips.find((t) => (t as { staTripId: string }).staTripId === 'T-OCDSB-101-AM');
    expect((amTrip as { directionId: number }).directionId).toBe(0);
  });

  it('emits stop_times with correct sequence', async () => {
    const records = await collectRecords(adapter, makeBundle(FULL_BUNDLE));
    const stopTimes = records.filter((r) => r.kind === 'stopTime');
    expect(stopTimes).toHaveLength(2);
    const st1 = stopTimes.find((s) => (s as { sequence: number }).sequence === 1);
    expect(st1).toBeDefined();
    expect((st1 as { staStopId: string }).staStopId).toBe('STOP-001');
  });

  it('emits no shapes when shapes.txt is absent', async () => {
    const { 'shapes.txt': _, ...rest } = FULL_BUNDLE;
    const records = await collectRecords(adapter, makeBundle(rest));
    expect(records.filter((r) => r.kind === 'shape')).toHaveLength(0);
  });
});
