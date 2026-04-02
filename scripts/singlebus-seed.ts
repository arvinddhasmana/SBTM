import * as fs from 'fs';
import * as path from 'path';

function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let byte;
    let shift = 0;
    let result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

const OSRM_URL = 'http://localhost:5000/route/v1/driving';

async function getOsrmRoute(coords: [number, number][]) {
  const coordStr = coords.map((c) => `${c[1]},${c[0]}`).join(';');
  const url = `${OSRM_URL}/${coordStr}?overview=full&geometries=polyline`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = (await response.json()) as any;
    if (data.code !== 'Ok') throw new Error(`OSRM Error: ${data.code}`);
    const polyline = data.routes[0].geometry;
    const decoded = decodePolyline(polyline);
    return { polyline, decoded };
  } catch (e) {
    console.error('Failed to fetch from OSRM:', e);
    return null;
  }
}

async function main() {
  const schoolPos: [number, number] = [45.3876, -75.696];
  const depotPos: [number, number] = [45.367, -75.669];
  const NUM_STOPS = 5;
  const NUM_STUDENTS = 7;
  const studentData = [
    { id: '10000000-0000-0000-0000-000000000001', firstName: 'Alice', lastName: 'Smith' },
    { id: '10000000-0000-0000-0000-000000000002', firstName: 'Bob', lastName: 'Johnson' },
    { id: '10000000-0000-0000-0000-000000000003', firstName: 'Charlie', lastName: 'Brown' },
    { id: '10000000-0000-0000-0000-000000000004', firstName: 'Diana', lastName: 'Garcia' },
    { id: '10000000-0000-0000-0000-000000000005', firstName: 'Ethan', lastName: 'Wilson' },
    { id: '10000000-0000-0000-0000-000000000006', firstName: 'Fiona', lastName: 'Miller' },
    { id: '10000000-0000-0000-0000-000000000007', firstName: 'George', lastName: 'Davis' },
  ];
  const studentIds = studentData.map((s) => s.id);

  console.log('Generating AM Route...');
  const amBase = await getOsrmRoute([depotPos, schoolPos]);
  if (!amBase) return;

  const amDecoded = amBase.decoded;
  const amStops: any[] = [];
  const stopInterval = Math.floor(amDecoded.length / (NUM_STOPS + 2));

  for (let i = 0; i < NUM_STOPS; i++) {
    const idx = stopInterval * (i + 1);
    const pt = amDecoded[idx];
    const students = [studentIds[i]].filter(Boolean);
    amStops.push({
      lat: pt[0],
      lng: pt[1],
      label: `AM Stop ${i + 1}`,
      students,
      pauseSeconds: 5,
      speedKph: 0,
    });
  }

  // Distribute remaining students across stops
  for (let i = NUM_STOPS; i < NUM_STUDENTS; i++) {
    amStops[i % NUM_STOPS].students.push(studentIds[i]);
  }

  console.log('Generating PM Route (Literal Reversal)...');
  // PM path is a literal reverse of the AM path to ensure "exactly same" alignment
  const pmDecoded = amDecoded.slice().reverse();

  const config = {
    school: {
      id: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
      name: 'Greenfield Elementary',
      lat: schoolPos[0],
      lng: schoolPos[1],
    },
    bus: {
      vehicleId: 'BUS-01',
      driverId: 'driver-001',
      driverEmail: 'driver1@sbtm.demo',
    },
    students: studentData,
    am: {
      routeId: 'ROUTE-CUSTOM-AM',
      polyline: amBase.polyline,
      decoded: amDecoded,
      stops: amStops,
      start: depotPos,
      end: schoolPos,
    },
    pm: {
      routeId: 'ROUTE-CUSTOM-PM',
      // We use the same polyline as AM because it represents the same road segments
      polyline: amBase.polyline,
      decoded: pmDecoded,
      stops: amStops
        .slice()
        .reverse()
        .map((s, i) => ({
          lat: s.lat,
          lng: s.lng,
          label: `PM Stop ${i + 1}`,
          students: s.students,
          pauseSeconds: 5,
          speedKph: 0,
        })),
      start: schoolPos,
      end: depotPos,
    },
  };

  const outPath = path.join(process.cwd(), 'scripts/singlebus-config.json');
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log(`Successfully generated ${outPath}`);
}

main().catch(console.error);
