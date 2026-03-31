#!/usr/bin/env node
/**
 * sync-routes.js
 *
 * For each route in scripts/demo-gps-track.json:
 *   1. Builds a coordinate string from all waypoints
 *   2. Calls OSRM (localhost:5000) to get a road-following polyline
 *   3. Falls back to encoding the waypoints directly if OSRM is unavailable
 *   4. Writes the polyline into routes_reference via docker exec psql
 *
 * Usage:  node ./sync-routes.js [--container <name>] [--osrm <url>]
 */

'use strict';

const http  = require('http');
const { execSync } = require('child_process');
const fs    = require('fs');
const path  = require('path');

// ---------------------------------------------------------------------------
// Config (overridable via env / args)
// ---------------------------------------------------------------------------
let OSRM_BASE  = process.env.OSRM_URL  || 'http://localhost:5000';
let CONTAINER  = process.env.PG_CONTAINER || 'sbtm_antigravity-postgres-1';
let TRACK_FILE = path.join(__dirname, 'scripts', 'demo-gps-track.json');

for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--container' && process.argv[i + 1]) CONTAINER  = process.argv[++i];
  if (process.argv[i] === '--osrm'      && process.argv[i + 1]) OSRM_BASE  = process.argv[++i];
  if (process.argv[i] === '--track'     && process.argv[i + 1]) TRACK_FILE = process.argv[++i];
}

// ---------------------------------------------------------------------------
// Google Polyline encoder (no external deps)
// ---------------------------------------------------------------------------
function encodeNumber(n) {
  let val = Math.round(n * 1e5);
  val = val < 0 ? ~(val << 1) : (val << 1);
  let result = '';
  while (val >= 0x20) {
    result += String.fromCharCode(((0x20 | (val & 0x1f)) + 63));
    val >>= 5;
  }
  result += String.fromCharCode((val + 63));
  return result;
}

function encodePolyline(points) {
  let out = '';
  let prevLat = 0, prevLng = 0;
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += encodeNumber((lat - prevLat) / 1e5);
    out += encodeNumber((lng - prevLng) / 1e5);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

// ---------------------------------------------------------------------------
// HTTP helper (Node built-in, no external deps)
// ---------------------------------------------------------------------------
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end',  ()    => resolve(data));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}

// ---------------------------------------------------------------------------
// OSRM polyline fetch
// ---------------------------------------------------------------------------
async function fetchOsrmPolyline(waypoints) {
  // OSRM coordinate format: lng,lat;lng,lat;...
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=polyline`;
  const body = JSON.parse(await httpGet(url));
  if (body.code !== 'Ok' || !body.routes || !body.routes[0]) throw new Error('OSRM returned no route');
  return body.routes[0].geometry; // Google-encoded polyline string
}

// ---------------------------------------------------------------------------
// Run SQL via docker exec
// ---------------------------------------------------------------------------
function runSql(sql) {
  const escaped = sql.replace(/'/g, `'\\''`);
  execSync(`docker exec "${CONTAINER}" psql -U postgres -d sbms -c '${escaped}'`, { stdio: 'pipe' });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(TRACK_FILE)) {
    console.error(`Track file not found: ${TRACK_FILE}`);
    process.exit(1);
  }
  const data   = JSON.parse(fs.readFileSync(TRACK_FILE, 'utf8'));
  const track  = data.defaultTrack || Object.keys(data.tracks)[0];
  const routes = data.tracks[track].routes;

  let osrmAvailable = false;
  try {
    await httpGet(`${OSRM_BASE}/health`);
    osrmAvailable = true;
  } catch (_) {
    // try routing endpoint directly
    try {
      const test = routes[0];
      const coords = test.waypoints.slice(0, 2).map(p => `${p.lng},${p.lat}`).join(';');
      await httpGet(`${OSRM_BASE}/route/v1/driving/${coords}?overview=false`);
      osrmAvailable = true;
    } catch (_2) {
      console.warn('⚠️  OSRM not reachable — using fallback polyline encoder');
    }
  }

  let successCount = 0;
  for (const route of routes) {
    let polyline;
    if (osrmAvailable) {
      try {
        polyline = await fetchOsrmPolyline(route.waypoints);
        console.log(`  [OSRM] ${route.routeId}: polyline fetched (${polyline.length} chars)`);
      } catch (e) {
        console.warn(`  [OSRM] ${route.routeId}: OSRM error (${e.message}) — using fallback`);
        polyline = encodePolyline(route.waypoints);
      }
    } else {
      polyline = encodePolyline(route.waypoints);
      console.log(`  [FALLBACK] ${route.routeId}: encoded ${route.waypoints.length} waypoints`);
    }

    // Escape single quotes in polyline for SQL (unlikely but defensive)
    const safePoly = polyline.replace(/'/g, "''");
    try {
      runSql(`UPDATE routes_reference SET polyline = '${safePoly}' WHERE id = '${route.routeId}';`);
      successCount++;
    } catch (e) {
      console.error(`  ❌ Failed to update ${route.routeId}: ${e.message}`);
    }
  }
  console.log(`✅ sync-routes: ${successCount}/${routes.length} routes updated`);
}

main().catch(err => {
  console.error('sync-routes error:', err.message);
  process.exit(1);
});
