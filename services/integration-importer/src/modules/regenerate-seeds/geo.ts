import type { LatLon } from '../shape-fallback/osrm-client';

const EARTH_RADIUS_M = 6_371_000;

/**
 * Great-circle distance in metres between two WGS84 points.
 * Spherical-earth haversine is plenty accurate for stop-spacing checks
 * (sub-1 % error over the distances we care about).
 */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Offset a point by (north m, east m) using a local flat-earth approximation.
 * Good enough for sampling stop candidates within a few-km radius — we
 * always re-snap to the road network with OSRM before persisting.
 */
export function offsetMeters(p: LatLon, northM: number, eastM: number): LatLon {
  const dLat = northM / 111_320;
  const dLon = eastM / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lon: p.lon + dLon };
}

/**
 * Cumulative distance per point in a polyline, in metres.
 * `result[0] === 0`, `result[i] === Σ haversine(pts[k-1], pts[k]) for k≤i`.
 */
export function cumulativeDistances(points: LatLon[]): number[] {
  const out: number[] = new Array(points.length);
  out[0] = 0;
  for (let i = 1; i < points.length; i += 1) {
    out[i] = out[i - 1] + haversineMeters(points[i - 1], points[i]);
  }
  return out;
}
