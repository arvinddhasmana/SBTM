#!/usr/bin/env node
/**
 * Synthetic load generator for the 24-hour staging soak (Phase E4).
 *
 * Reads environment variables set by the staging-soak.yml workflow:
 *   STAGING_API_URL            — base URL of the staging API gateway
 *   STAGING_DRIVER_EMAIL       — driver credentials for auth
 *   STAGING_DRIVER_PASSWORD
 *   SOAK_DURATION_MINUTES      — how long to run (default 1440 = 24 h)
 *   ALERT_RATE_PER_MIN         — synthetic alert events per minute (default 1)
 *   GPS_RATE_PER_MIN           — GPS pings per minute per vehicle (default 10)
 *   TEST_VEHICLE_IDS           — comma-separated vehicle IDs
 *   TEST_ROUTE_IDS             — comma-separated route IDs (parallel order to vehicles)
 *
 * Emits structured JSON log lines: {"ts":"...","level":"info"|"error","msg":"...","..."}
 * The CI assertion step greps for level=error to enforce the error budget.
 */

'use strict';

const https = require('https');
const http = require('http');

// ─── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.STAGING_API_URL || 'http://localhost:3001';
const DRIVER_EMAIL = process.env.STAGING_DRIVER_EMAIL || 'driver.stbern@sbtm.demo';
const DRIVER_PASSWORD = process.env.STAGING_DRIVER_PASSWORD || 'Admin123!';
const DURATION_MS = (parseInt(process.env.SOAK_DURATION_MINUTES || '1440', 10)) * 60_000;
const ALERT_RATE = parseInt(process.env.ALERT_RATE_PER_MIN || '1', 10);
const GPS_RATE = parseInt(process.env.GPS_RATE_PER_MIN || '10', 10);
const VEHICLE_IDS = (process.env.TEST_VEHICLE_IDS || 'VEH-OCSB-201').split(',').map(s => s.trim());
const ROUTE_IDS = (process.env.TEST_ROUTE_IDS || 'R-OCSB-201').split(',').map(s => s.trim());

// ─── Logging ─────────────────────────────────────────────────────────────────
function log(level, msg, extra = {}) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }) + '\n');
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const lib = url.protocol === 'https:' ? https : http;
    const payload = body ? JSON.stringify(body) : undefined;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 500) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          } else {
            try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode, body: data }); }
          }
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function authenticate() {
  const res = await request('POST', '/api/v1/auth/login', {
    email: DRIVER_EMAIL,
    password: DRIVER_PASSWORD,
  });
  if (!res.body?.accessToken) throw new Error('Login failed — no accessToken in response');
  log('info', 'Authenticated', { email: DRIVER_EMAIL });
  return res.body.accessToken;
}

// ─── GPS ping ─────────────────────────────────────────────────────────────────
function jitter(base, range) { return base + (Math.random() - 0.5) * range; }

async function sendGpsPing(token, vehicleId, routeId, index) {
  try {
    await request('POST', '/api/v1/routes/locations', {
      vehicleId,
      routeId,
      lat: jitter(45.4215, 0.02),
      lng: jitter(-75.6972, 0.02),
      speedKph: jitter(40, 20),
      timestamp: new Date().toISOString(),
    }, token);
    log('info', 'GPS ping sent', { vehicleId, routeId, ping: index });
  } catch (err) {
    log('error', 'GPS ping failed', { vehicleId, routeId, err: err.message });
  }
}

// ─── Synthetic alert ─────────────────────────────────────────────────────────
const EVENT_TYPES = ['LATE_ARRIVAL', 'ROUTE_DEVIATION', 'PANIC_BUTTON'];
let alertCount = 0;

async function sendAlert(token, vehicleId, routeId) {
  const eventType = EVENT_TYPES[alertCount % EVENT_TYPES.length];
  alertCount++;
  try {
    await request('POST', '/api/v1/emergency-events', {
      vehicleId,
      routeId,
      eventType,
      lat: jitter(45.4215, 0.02),
      lng: jitter(-75.6972, 0.02),
      timestamp: new Date().toISOString(),
    }, token);
    log('info', 'Alert sent', { vehicleId, routeId, eventType, total: alertCount });
  } catch (err) {
    log('error', 'Alert failed', { vehicleId, routeId, eventType, err: err.message });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  log('info', 'Soak starting', {
    durationMs: DURATION_MS,
    alertRatePerMin: ALERT_RATE,
    gpsRatePerMin: GPS_RATE,
    vehicles: VEHICLE_IDS,
  });

  let token = await authenticate();

  const startMs = Date.now();
  const endMs = startMs + DURATION_MS;

  const GPS_INTERVAL_MS = Math.floor(60_000 / GPS_RATE);
  const ALERT_INTERVAL_MS = Math.floor(60_000 / ALERT_RATE);

  let gpsTick = 0;
  let tokenRefreshAt = startMs + 50 * 60_000; // refresh every 50 min

  // GPS pings — one interval per vehicle, staggered
  const gpsTimers = VEHICLE_IDS.map((vehicleId, i) =>
    setInterval(async () => {
      if (Date.now() >= endMs) return;
      await sendGpsPing(token, vehicleId, ROUTE_IDS[i] || ROUTE_IDS[0], ++gpsTick);
    }, GPS_INTERVAL_MS + i * 500),
  );

  // Alert events — rotate across vehicles
  let vehicleIdx = 0;
  const alertTimer = setInterval(async () => {
    if (Date.now() >= endMs) return;
    const v = vehicleIdx % VEHICLE_IDS.length;
    vehicleIdx++;
    await sendAlert(token, VEHICLE_IDS[v], ROUTE_IDS[v] || ROUTE_IDS[0]);
  }, ALERT_INTERVAL_MS);

  // Token refresh — re-authenticate before expiry
  const refreshTimer = setInterval(async () => {
    if (Date.now() >= endMs) return;
    try {
      token = await authenticate();
      tokenRefreshAt = Date.now() + 50 * 60_000;
      log('info', 'Token refreshed');
    } catch (err) {
      log('error', 'Token refresh failed', { err: err.message });
    }
  }, 50 * 60_000);

  // Progress heartbeat every 10 min
  const heartbeatTimer = setInterval(() => {
    const elapsedMin = Math.round((Date.now() - startMs) / 60_000);
    const remainMin = Math.round((endMs - Date.now()) / 60_000);
    log('info', 'Heartbeat', { elapsedMin, remainMin, alertsSent: alertCount, gpiPings: gpsTick });
  }, 10 * 60_000);

  // Terminate after duration
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(alertTimer);
      gpsTimers.forEach(clearInterval);
      clearInterval(refreshTimer);
      clearInterval(heartbeatTimer);
      resolve(undefined);
    }, DURATION_MS),
  );

  log('info', 'Soak complete', { totalAlerts: alertCount, totalGpsPings: gpsTick });
})().catch((err) => {
  log('error', 'Soak generator crashed', { err: err.message });
  process.exit(1);
});
