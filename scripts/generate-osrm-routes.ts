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

        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}

const configPath = path.join(process.cwd(), 'scripts/demo-gps-track.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const OSRM_URL = 'http://localhost:5000/route/v1/driving';

// Function to fetch route from OSRM
async function getOsrmRoute(start: [number, number], end: [number, number]) {
    const url = `${OSRM_URL}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=polyline`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json() as any;
        if (data.code !== 'Ok') throw new Error(`OSRM Error: ${data.code}`);
        const polyline = data.routes[0].geometry;
        const decoded = decodePolyline(polyline); 
        return { polyline, decoded };
    } catch (e) {
        console.error('Failed to fetch from OSRM:', e);
        return null;
    }
}

// 2 schools
// School 1: Riverside Academy -> c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c (Lat: 45.396, Lng: -75.73)
// School 2: Eastern Secondary -> s0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5a (Lat: 45.421, Lng: -75.60)

const schools = [
    { id: 'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', name: 'Riverside Academy', pos: [45.396, -75.73] as [number, number], routePrefix: 'ROUTE-R', 
      starts: [[45.367, -75.669], [45.350, -75.760]] },
    { id: 's0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5a', name: 'Eastern Secondary', pos: [45.421, -75.60] as [number, number], routePrefix: 'ROUTE-E',
      starts: [[45.450, -75.520], [45.480, -75.580]] }
];

async function main() {
    let studentIdCounter = 300;
    const newRoutes = [];

    // Make sure config has both schools
    config.schools = config.schools || {};
    config.schools['school1'] = { name: 'Riverside Academy', lat: 45.396, lng: -75.73, radiusKm: 5 };
    config.schools['school2'] = { name: 'Eastern Secondary', lat: 45.421, lng: -75.60, radiusKm: 5 };

    let globalRouteIndex = 81; // To avoid colliding with R01..R20 etc.

    for (let sIdx = 0; sIdx < schools.length; sIdx++) {
        const school = schools[sIdx];
        for (let rIdx = 0; rIdx < 2; rIdx++) {
            const startLoc = school.starts[rIdx];
            const endLoc = school.pos;
            
            console.log(`Generating route from ${startLoc} to ${endLoc}`);
            const osrmData = await getOsrmRoute(startLoc, endLoc);
            if (!osrmData) {
                console.error("Failed to generate route! Skipping.");
                continue;
            }

            const { polyline, decoded } = osrmData;
            const stopsCount = 12; // 10-12
            const totalStudents = 20 + Math.floor(Math.random() * 6); // 20-25
            
            // Distribute students among the 12 stops
            const studentsPerStop = new Array(stopsCount).fill(1);
            let remaining = totalStudents - stopsCount;
            while(remaining > 0) {
                studentsPerStop[Math.floor(Math.random() * stopsCount)]++;
                remaining--;
            }

            // Pick 12 evenly distributed points along the path for the stops
            const waypoints = [];
            const step = Math.floor(decoded.length / (stopsCount + 1));
            
            // Generate list of all students for this route
            const routeStudentIds = [];
            for (let i = 0; i < totalStudents; i++) {
                routeStudentIds.push(`STUDENT-${studentIdCounter++}`);
            }
            
            let studentPtr = 0;

            for (let i = 0; i < stopsCount; i++) {
                const pt = decoded[step * (i + 1)];
                const studentsAtThisStop = routeStudentIds.slice(studentPtr, studentPtr + studentsPerStop[i]);
                studentPtr += studentsPerStop[i];

                waypoints.push({
                    lat: pt[0],
                    lng: pt[1],
                    label: `Stop ${i+1} on Map`,
                    speedKph: 20, // Approach speed
                    pauseSeconds: 5,
                    students: studentsAtThisStop
                });
                
                // Add a driving pad point to keep it smooth
                const drivePt = decoded[Math.floor(step * (i + 1.5))];
                if (drivePt) {
                   waypoints.push({ lat: drivePt[0], lng: drivePt[1], speedKph: 45 });
                }
            }

            // The ending destination point
            waypoints.push({
                lat: endLoc[0],
                lng: endLoc[1],
                label: `End - School: ${school.name}`,
                speedKph: 5,
                pauseSeconds: 15
            });

            const routeId = `${school.routePrefix}${globalRouteIndex++}`;
            const driverEmail = `driver${globalRouteIndex}@sbtm.demo`;

            // Mark for UI "Live Data"
            if (!config.liveDriverRoutes.includes(routeId)) config.liveDriverRoutes.push(routeId);
            if (!config.liveDriverEmails.includes(driverEmail)) config.liveDriverEmails.push(driverEmail);

            newRoutes.push({
                routeId,
                vehicleId: `BUS-NEW-${globalRouteIndex}`,
                driverEmail,
                driverId: `driver-new-${globalRouteIndex}`,
                schoolId: school.id,
                isLiveDriver: true,
                students: routeStudentIds,
                polyline,
                waypoints
            });
        }
    }

    // Assign alerts to 2 randomly selected routes out of the 4
    const shuffledRoutes = [...newRoutes].sort(() => 0.5 - Math.random());
    shuffledRoutes[0].hasDeviationAlert = true;
    shuffledRoutes[1].hasPanicAlert = true;

    // Finally inject them to ottawa-full
    const tk = config.tracks['ottawa-full'];
    for(const route of newRoutes) {
       tk.routes.push(route);
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Successfully appended ${newRoutes.length} realistic road-mapped routes to demo config!`);
}

main().catch(console.error);
