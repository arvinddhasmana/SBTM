/**
 * Calculate the Haversine distance between two lat/lng points in meters.
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format distance for display: meters if <1000, km otherwise.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Very basic distance from a point to a line segment in meters,
 * using flat approximation which is ok for small distances.
 */
export function distanceToSegment(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const x = lng;
  const y = lat;
  const x1 = lng1;
  const y1 = lat1;
  const x2 = lng2;
  const y2 = lat2;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq != 0)
    //in case of 0 length line
    param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  // Convert distance from flat degree differences back to meters approx
  return haversineMeters(lat, lng, yy, xx);
}

/**
 * Minimum distance from a point to a polyline.
 */
export function distanceToPolyline(
  lat: number,
  lng: number,
  polylineCoords: { latitude: number; longitude: number }[],
): number {
  if (polylineCoords.length === 0) return Infinity;
  if (polylineCoords.length === 1) {
    return haversineMeters(lat, lng, polylineCoords[0].latitude, polylineCoords[0].longitude);
  }

  let minDist = Infinity;
  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const p1 = polylineCoords[i];
    const p2 = polylineCoords[i + 1];
    const dist = distanceToSegment(lat, lng, p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/**
 * Returns the index of the closest segment in a polyline.
 */
export function closestIndexToPolyline(
  lat: number,
  lng: number,
  polylineCoords: { latitude: number; longitude: number }[],
): number {
  if (polylineCoords.length === 0) return -1;
  if (polylineCoords.length === 1) return 0;

  let minDist = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const p1 = polylineCoords[i];
    const p2 = polylineCoords[i + 1];
    const dist = distanceToSegment(lat, lng, p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    if (dist < minDist) {
      minDist = dist;
      bestIndex = i; // using the start of the closest segment
    }
  }
  return bestIndex;
}
