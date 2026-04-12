/**
 * Generates demo-sim-config.json by querying seeded data from the database.
 *
 * Usage: npx tsx scripts/demo-gen-config.ts <selectedSchools> <routesPerSchool> <gpsDelay>
 *   e.g. npx tsx scripts/demo-gen-config.ts "stbern allsnt" 2 3
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CONTAINER_NAME = 'sbtm-postgres-1';

function pgQuery(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"');
  const cmd = `docker exec ${CONTAINER_NAME} psql -U postgres -d sbms -t -A -c "${escaped}"`;
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

const ABBREVS: Record<string, string> = {
  stbern: 'STBERN',
  allsnt: 'ALLSNT',
  sacrhrt: 'SACRHRT',
  jyoung: 'JYOUNG',
  mplwd: 'MPLWD',
  ayjack: 'AYJACK',
};

const SCHOOL_IDS: Record<string, string> = {
  stbern: '30000000-0000-0000-0001-000000000001',
  allsnt: '30000000-0000-0000-0002-000000000001',
  sacrhrt: '30000000-0000-0000-0003-000000000001',
  jyoung: '30000000-0000-0000-0004-000000000001',
  mplwd: '30000000-0000-0000-0005-000000000001',
  ayjack: '30000000-0000-0000-0006-000000000001',
};

const SCHOOL_ADMIN_IDS: Record<string, string> = {
  stbern: '30000000-0000-0000-0001-00000000000a',
  allsnt: '30000000-0000-0000-0002-00000000000a',
  sacrhrt: '30000000-0000-0000-0003-00000000000a',
  jyoung: '30000000-0000-0000-0004-00000000000a',
  mplwd: '30000000-0000-0000-0005-00000000000a',
  ayjack: '30000000-0000-0000-0006-00000000000a',
};

const SCHOOL_ADMIN_EMAILS: Record<string, string> = {
  stbern: 'admin.stbern@sbtm.demo',
  allsnt: 'admin.allsnt@sbtm.demo',
  sacrhrt: 'admin.sacrhrt@sbtm.demo',
  jyoung: 'admin.jyoung@sbtm.demo',
  mplwd: 'admin.mplwd@sbtm.demo',
  ayjack: 'admin.ayjack@sbtm.demo',
};

const DRIVER_EMAILS: Record<string, string> = {
  stbern: 'driver.stbern@sbtm.demo',
  allsnt: 'driver.allsnt@sbtm.demo',
  sacrhrt: 'driver.sacrhrt@sbtm.demo',
  jyoung: 'driver.jyoung@sbtm.demo',
  mplwd: 'driver.mplwd@sbtm.demo',
  ayjack: 'driver.ayjack@sbtm.demo',
};

const DRIVER_IDS: Record<string, string> = {
  stbern: 'driver-stbern-01',
  allsnt: 'driver-allsnt-01',
  sacrhrt: 'driver-sacrhrt-01',
  jyoung: 'driver-jyoung-01',
  mplwd: 'driver-mplwd-01',
  ayjack: 'driver-ayjack-01',
};

function main() {
  const selectedSchools = (process.argv[2] || 'stbern').split(' ');
  const routesPerSchool = parseInt(process.argv[3] || '1', 10);
  const gpsDelay = parseInt(process.argv[4] || '3', 10);

  const config: any = { gpsDelay, schools: [] };

  for (const code of selectedSchools) {
    const abbr = ABBREVS[code];
    const schoolId = SCHOOL_IDS[code];
    if (!abbr || !schoolId) {
      console.error(`Unknown school code: ${code}`);
      continue;
    }

    // Get school info
    const schoolRow = pgQuery(`SELECT name, lat, lng FROM schools WHERE id = '${schoolId}'`);
    const [schoolName, schoolLat, schoolLng] = schoolRow.split('|');

    // Get parents for this school
    const parentRows = pgQuery(
      `SELECT id, email, "firstName", "lastName" FROM users WHERE role = 'PARENT' AND "schoolId" = '${schoolId}' ORDER BY email LIMIT 10`,
    );
    const parents = parentRows
      .split('\n')
      .filter(Boolean)
      .map((r) => {
        const [id, email, firstName, lastName] = r.split('|');
        return { id, email, firstName, lastName };
      });

    const routes: any[] = [];
    for (let r = 1; r <= routesPerSchool; r++) {
      const rPad = String(r).padStart(2, '0');
      const amRefId = `ROUTE-${abbr}-R${rPad}-AM`;
      const pmRefId = `ROUTE-${abbr}-R${rPad}-PM`;
      const busId = `BUS-${abbr}-${rPad}`;

      // Get polylines
      const amPoly = pgQuery(`SELECT polyline FROM routes_reference WHERE id = '${amRefId}'`);
      const pmPoly = pgQuery(`SELECT polyline FROM routes_reference WHERE id = '${pmRefId}'`);

      // Get AM stops
      const amStopsRaw = pgQuery(
        `SELECT id, "sequenceOrder", "stopName", lat, lng FROM route_stops_reference WHERE "routeId" = '${amRefId}' ORDER BY "sequenceOrder"`,
      );
      const amStops = amStopsRaw
        .split('\n')
        .filter(Boolean)
        .map((row) => {
          const [id, seq, name, lat, lng] = row.split('|');
          return { id, sequence: parseInt(seq), name, lat: parseFloat(lat), lng: parseFloat(lng) };
        });

      // Get PM stops
      const pmStopsRaw = pgQuery(
        `SELECT id, "sequenceOrder", "stopName", lat, lng FROM route_stops_reference WHERE "routeId" = '${pmRefId}' ORDER BY "sequenceOrder"`,
      );
      const pmStops = pmStopsRaw
        .split('\n')
        .filter(Boolean)
        .map((row) => {
          const [id, seq, name, lat, lng] = row.split('|');
          return { id, sequence: parseInt(seq), name, lat: parseFloat(lat), lng: parseFloat(lng) };
        });

      // Get students assigned to these routes
      const studentsRaw = pgQuery(
        `SELECT id, "firstName", "lastName", "amStopId", "pmStopId" FROM students_reference WHERE "amRouteId" = '${amRefId}' ORDER BY id`,
      );
      const students = studentsRaw
        .split('\n')
        .filter(Boolean)
        .map((row) => {
          const [id, firstName, lastName, amStopId, pmStopId] = row.split('|');
          return { id, firstName, lastName, amStopId, pmStopId };
        });

      routes.push({
        routeNumber: r,
        busId,
        am: { routeRefId: amRefId, polyline: amPoly, stops: amStops },
        pm: { routeRefId: pmRefId, polyline: pmPoly, stops: pmStops },
        students,
      });
    }

    config.schools.push({
      code,
      schoolId,
      schoolName,
      schoolLat: parseFloat(schoolLat),
      schoolLng: parseFloat(schoolLng),
      schoolAdminEmail: SCHOOL_ADMIN_EMAILS[code],
      schoolAdminId: SCHOOL_ADMIN_IDS[code],
      driverEmail: DRIVER_EMAILS[code],
      driverId: DRIVER_IDS[code],
      parents,
      routes,
    });
  }

  const outPath = path.join(__dirname, 'demo-sim-config.json');
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log(`Config written to ${outPath}`);
  console.log(`  Schools: ${config.schools.length}`);
  for (const s of config.schools) {
    console.log(`  ${s.schoolName}: ${s.routes.length} route(s), ${s.parents.length} parent(s)`);
  }
}

main();
