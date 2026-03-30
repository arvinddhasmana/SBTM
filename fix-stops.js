const fs = require('fs');
const file = 'scripts/demo-gps-track.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

Object.values(data.tracks).forEach(track => {
  track.routes.forEach(route => {
    let stopCount = 1;
    route.waypoints.forEach(wp => {
      if (wp.label && wp.label.includes('Stop')) {
        // preserve the remaining text if any, or just label it Stop X
        wp.label = `Stop ${stopCount}`;
        stopCount++;
      }
    });
  });
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Fixed stop numbers!');
