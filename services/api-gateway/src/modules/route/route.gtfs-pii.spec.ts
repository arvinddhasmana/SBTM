/**
 * Phase E3 — GTFS Export PII-exclusion tests.
 *
 * Per RoutePlanner.md §9: export ZIPs must never contain student, guardian,
 * or ridership PII. These tests run a column-name scanner over any GTFS text
 * content and assert that the banned token prefixes are absent.
 *
 * The scanner tests are self-contained and run without a running server.
 * The endpoint-level test is marked `pending` until the GTFS export endpoint
 * lands (tracked in Phase D/E implementation work).
 */

// ---------------------------------------------------------------------------
// PII column-name scanner (pure function, no imports needed)
// ---------------------------------------------------------------------------

const PII_BANNED_PREFIXES = [
  'stx_student',
  'stx_guardian',
  'stx_ridership',
  'student_name',
  'guardian_name',
  'first_name',
  'last_name',
  'email',
  'phone',
  'address',
];

/**
 * Returns every banned token found in the given GTFS text content.
 * Treats each line as a comma-separated header row for the first line of
 * each .txt file and checks the full content for accidental PII tokens.
 */
function scanGtfsForPii(content: string): string[] {
  const lower = content.toLowerCase();
  return PII_BANNED_PREFIXES.filter((prefix) => lower.includes(prefix));
}

// ---------------------------------------------------------------------------
// Scanner unit tests
// ---------------------------------------------------------------------------

describe('GTFS PII scanner (unit)', () => {
  it('returns empty array for a clean GTFS stops.txt', () => {
    const stopsContent =
      'stop_id,stop_name,stop_lat,stop_lon\n' +
      'STOP-001,Main St & Oak Ave,45.4215,-75.6972\n' +
      'STOP-002,School Entrance,45.4220,-75.6980\n';
    expect(scanGtfsForPii(stopsContent)).toHaveLength(0);
  });

  it('returns empty array for a clean GTFS routes.txt', () => {
    const routesContent =
      'route_id,agency_id,route_short_name,route_long_name,route_type\n' +
      'R-OCDSB-101,OSTA,101,Maplewood AM,3\n';
    expect(scanGtfsForPii(routesContent)).toHaveLength(0);
  });

  it('returns empty array for a clean GTFS shapes.txt', () => {
    const shapesContent =
      'shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n' +
      'SH-001,45.4215,-75.6972,1\n' +
      'SH-001,45.4218,-75.6975,2\n';
    expect(scanGtfsForPii(shapesContent)).toHaveLength(0);
  });

  it('flags stx_student* token', () => {
    const leakyContent =
      'stop_id,student_name,stop_lat,stop_lon\nSTOP-001,Alice Smith,45.42,-75.69\n';
    const hits = scanGtfsForPii(leakyContent);
    expect(hits).toContain('student_name');
  });

  it('flags stx_guardian* token', () => {
    const leakyContent =
      'route_id,stx_guardian_email\nR-001,parent@example.com\n';
    const hits = scanGtfsForPii(leakyContent);
    expect(hits).toContain('stx_guardian');
  });

  it('flags stx_ridership* token', () => {
    const leakyContent = 'trip_id,stx_ridership_count\nT-001,12\n';
    const hits = scanGtfsForPii(leakyContent);
    expect(hits).toContain('stx_ridership');
  });

  it('flags multiple banned tokens at once', () => {
    const leakyContent =
      'stop_id,first_name,last_name,email,stop_lat\nS1,Alice,Smith,a@b.com,45\n';
    const hits = scanGtfsForPii(leakyContent);
    expect(hits).toContain('first_name');
    expect(hits).toContain('last_name');
    expect(hits).toContain('email');
  });

  it('is case-insensitive', () => {
    const leakyContent = 'route_id,STX_STUDENT_ID\nR-001,STU-001\n';
    const hits = scanGtfsForPii(leakyContent);
    expect(hits).toContain('stx_student');
  });
});

// ---------------------------------------------------------------------------
// Contract assertions for the GTFS export endpoint
// (pending until POST /routes/:id/gtfs-export is implemented)
// ---------------------------------------------------------------------------

describe('GTFS export endpoint PII exclusion (integration — pending)', () => {
  it.todo(
    'POST /routes/:id/gtfs-export returns a ZIP where no .txt file contains banned PII tokens',
  );

  it.todo(
    'ZIP contains agency.txt, routes.txt, trips.txt, stops.txt, stop_times.txt, shapes.txt',
  );

  it.todo(
    'ZIP does not contain stx_students, stx_guardians, or stx_ridership rows in any form',
  );

  it.todo(
    'Export respects RBAC: SCHOOL_ADMIN cannot export a route belonging to another school',
  );
});
