import * as fs from 'fs';
import * as path from 'path';

interface Waypoint {
    lat: number;
    lng: number;
    speedKph?: number;
    label?: string;
    student?: string;
    pauseSeconds?: number;
}

interface Route {
    routeId: string;
    waypoints: Waypoint[];
}

interface TrackConfig {
    tracks: {
        [key: string]: {
            routes: Route[];
        };
    };
}

function interpolate(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
}

function densifyRoute(route: Route, factor: number = 5): Route {
    const densifiedWaypoints: Waypoint[] = [];

    for (let i = 0; i < route.waypoints.length - 1; i++) {
        const start = route.waypoints[i];
        const end = route.waypoints[i + 1];

        densifiedWaypoints.push(start);

        // Interpolate factor - 1 points between start and end
        for (let j = 1; j < factor; j++) {
            const f = j / factor;
            densifiedWaypoints.push({
                lat: interpolate(start.lat, end.lat, f),
                lng: interpolate(start.lng, end.lng, f),
                speedKph: start.speedKph, // Maintain starting speed for the segment
            });
        }
    }

    // Add final waypoint
    densifiedWaypoints.push(route.waypoints[route.waypoints.length - 1]);

    return {
        ...route,
        waypoints: densifiedWaypoints,
    };
}

const configPath = path.join(process.cwd(), 'scripts/demo-gps-track.json');
const config: TrackConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

for (const trackName in config.tracks) {
    config.tracks[trackName].routes = config.tracks[trackName].routes.map(r => densifyRoute(r, 5));
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Successfully densified demo tracks 5x.');
