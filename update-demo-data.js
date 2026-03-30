const fs = require('fs');
const file = 'scripts/demo-gps-track.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// We only need to populate ROUTE-R01 according to plan.
// Or we can do R01 to R03. Let's just do R01.
const route = data.tracks['ottawa-full'].routes.find(r => r.routeId === 'ROUTE-R01');

// Distribute the 10 students across the stops.
const stops = route.waypoints.filter(w => w.label && w.label.includes('Stop'));
const students = route.students || [];

// Reset any existing assignments
route.waypoints.forEach(w => {
    delete w.student;
    delete w.students;
});

// Assign each student to a stop
for (let i = 0; i < students.length; i++) {
    const student = students[i];
    // Modulo number of stops in case there are more students than stops
    const stopMatch = stops[i % stops.length];
    
    // We'll update the actual waypoint in the route's waypoints array
    const actualWp = route.waypoints.find(w => w === stopMatch);
    if (actualWp) {
        if (!actualWp.students) actualWp.students = [];
        actualWp.students.push(student);
    }
}

// Add 'School' waypoint label if missing
const lastWp = route.waypoints[route.waypoints.length - 1];
if (!lastWp.label || !lastWp.label.includes('School')) {
    lastWp.label = "End - School";
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Updated demo data successfully!');
