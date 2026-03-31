const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/demo-gps-track.json', 'utf8'));

let sql = '';
const routes = data.tracks['ottawa-full'].routes;

for (const route of routes) {
   if (!route.polyline) continue;
   
   sql += `INSERT INTO routes_reference (id, name, "vehicleId", "driverId", schedule, polyline) VALUES ('${route.routeId}', '${route.routeId}', '${route.vehicleId}', '${route.driverId}', '{}', '${route.polyline}') ON CONFLICT (id) DO UPDATE SET polyline = EXCLUDED.polyline;\n`;
   
   let sequence = 0;
   // Clear existing stops for this route before reinserting
   sql += `DELETE FROM route_stops_reference WHERE "routeId" = '${route.routeId}';\n`;
   
   for (const wp of route.waypoints) {
      if (wp.label && wp.label.includes('Stop')) {
         sequence++;
         const stopId = `${route.routeId}-S${sequence}`;
         sql += `INSERT INTO route_stops_reference (id, "routeId", "sequenceOrder", "stopName", lat, lng, "arrivalTime") VALUES ('${stopId}', '${route.routeId}', ${sequence}, '${wp.label}', ${wp.lat}, ${wp.lng}, '08:00');\n`;
      }
   }
}

fs.writeFileSync('sync-temp.sql', sql);
console.log('Generated sync-temp.sql');
