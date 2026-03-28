const fs = require('fs');
const path = require('path');

function interpolate(start, end, factor) {
    return start + (end - start) * factor;
}

function densifyRoute(route, factor = 5) {
    const densifiedWaypoints = [];

    for (let i = 0; i < route.waypoints.length - 1; i++) {
        const start = route.waypoints[i];
        const end = route.waypoints[i + 1];

        densifiedWaypoints.push(start);

        for (let j = 1; j < factor; j++) {
            const f = j / factor;
            densifiedWaypoints.push({
                lat: interpolate(start.lat, end.lat, f),
                lng: interpolate(start.lng, end.lng, f),
                speedKph: start.speedKph || 30,
            });
        }
    }

    densifiedWaypoints.push(route.waypoints[route.waypoints.length - 1]);

    return {
        ...route,
        waypoints: densifiedWaypoints,
    };
}

const configPath = path.join(process.cwd(), 'scripts/demo-gps-track.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.tracks) {
    for (const trackName in config.tracks) {
        config.tracks[trackName].routes = config.tracks[trackName].routes.map(r => densifyRoute(r, 5));
    }
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Successfully densified demo tracks 5x.');
