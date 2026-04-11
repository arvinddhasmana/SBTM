/**
 * Shared geometry utilities for map & route planner features.
 */

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Parse a WKT POINT string or GeoJSON Point into [lat, lng].
 * Accepts `POINT(lng lat)`, `POINT (lng lat)`, and `{ type: 'Point', coordinates: [lng, lat] }`.
 */
export function parseWktPoint(
  wkt: string | { type: string; coordinates: number[] },
): [number, number] {
  if (typeof wkt === 'object' && wkt && wkt.type === 'Point' && Array.isArray(wkt.coordinates)) {
    return [wkt.coordinates[1], wkt.coordinates[0]]; // [lat, lng]
  }
  if (typeof wkt === 'string') {
    const coords = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (coords) {
      return [parseFloat(coords[2]), parseFloat(coords[1])]; // [lat, lng]
    }
  }
  return [0, 0];
}

/** Build a WKT POINT string from lat/lng. */
export function toWktPoint(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`;
}

/**
 * Haversine distance between two coordinates in kilometres.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Check whether a point is within `radiusKm` of a centre. */
export function isWithinRadius(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): boolean {
  return haversineDistance(lat, lng, centerLat, centerLng) <= radiusKm;
}

/**
 * Project a destination point given start coords, bearing (degrees) and distance (km).
 */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceKm: number,
): { lat: number; lng: number } {
  const d = distanceKm / EARTH_RADIUS_KM;
  const brng = bearingDeg * DEG_TO_RAD;
  const lat1 = lat * DEG_TO_RAD;
  const lng1 = lng * DEG_TO_RAD;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { lat: lat2 * RAD_TO_DEG, lng: lng2 * RAD_TO_DEG };
}

/**
 * Distribute `count` stops around a centre at approximately `radiusKm`.
 * Applies ±20 % jitter to the distance so stops aren't on a perfect circle.
 * Returns stops ordered by bearing (0–360°).
 */
export function distributeStopsOnRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  count: number,
): { lat: number; lng: number }[] {
  if (count <= 0) return [];

  const MIN_DISTANCE_KM = Math.max(1, radiusKm * 0.3);
  const MAX_DISTANCE_KM = radiusKm;
  const bearingStep = 360 / count;
  // Random starting bearing so routes don't all line up
  const startBearing = Math.random() * 360;

  const stops: { lat: number; lng: number }[] = [];
  for (let i = 0; i < count; i++) {
    const bearing = (startBearing + i * bearingStep) % 360;
    // Jitter distance ±20 %
    const jitter = 0.8 + Math.random() * 0.4;
    const dist = Math.min(MAX_DISTANCE_KM, Math.max(MIN_DISTANCE_KM, radiusKm * jitter));
    stops.push(destinationPoint(centerLat, centerLng, bearing, dist));
  }
  return stops;
}
