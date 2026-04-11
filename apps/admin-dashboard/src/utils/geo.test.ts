import { describe, it, expect } from 'vitest';
import {
  parseWktPoint,
  toWktPoint,
  haversineDistance,
  isWithinRadius,
  destinationPoint,
  distributeStopsOnRadius,
} from './geo';

describe('parseWktPoint', () => {
  it('parses POINT(lng lat) into [lat, lng]', () => {
    expect(parseWktPoint('POINT(-75.696 45.3876)')).toEqual([45.3876, -75.696]);
  });

  it('handles POINT with space before parenthesis', () => {
    expect(parseWktPoint('POINT (-75.696 45.3876)')).toEqual([45.3876, -75.696]);
  });

  it('returns [0, 0] for invalid input', () => {
    expect(parseWktPoint('')).toEqual([0, 0]);
    expect(parseWktPoint('INVALID')).toEqual([0, 0]);
  });

  it('parses GeoJSON Point object', () => {
    expect(parseWktPoint({ type: 'Point', coordinates: [-75.696, 45.3876] })).toEqual([
      45.3876, -75.696,
    ]);
  });

  it('returns [0, 0] for non-Point GeoJSON', () => {
    expect(parseWktPoint({ type: 'LineString', coordinates: [] } as any)).toEqual([0, 0]);
  });

  it('handles negative coordinates', () => {
    const [lat, lng] = parseWktPoint('POINT(-75.68318 45.3730)');
    expect(lat).toBeCloseTo(45.373, 3);
    expect(lng).toBeCloseTo(-75.68318, 4);
  });
});

describe('toWktPoint', () => {
  it('converts lat/lng to WKT POINT(lng lat)', () => {
    expect(toWktPoint(45.3876, -75.696)).toBe('POINT(-75.696 45.3876)');
  });

  it('is inverse of parseWktPoint', () => {
    const wkt = toWktPoint(45.3876, -75.696);
    expect(parseWktPoint(wkt)).toEqual([45.3876, -75.696]);
  });
});

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(45.0, -75.0, 45.0, -75.0)).toBe(0);
  });

  it('computes known distance between Ottawa and Toronto (~350 km)', () => {
    const dist = haversineDistance(45.4215, -75.6972, 43.6532, -79.3832);
    // Roughly 350-360 km
    expect(dist).toBeGreaterThan(340);
    expect(dist).toBeLessThan(370);
  });

  it('computes short distance accurately (~1 km)', () => {
    // Two points roughly 1km apart in Ottawa
    const dist = haversineDistance(45.3876, -75.696, 45.3966, -75.696);
    expect(dist).toBeCloseTo(1.0, 0);
  });

  it('is symmetric', () => {
    const d1 = haversineDistance(45.0, -75.0, 46.0, -76.0);
    const d2 = haversineDistance(46.0, -76.0, 45.0, -75.0);
    expect(d1).toBeCloseTo(d2, 10);
  });
});

describe('isWithinRadius', () => {
  const center = { lat: 45.3876, lng: -75.696 };

  it('returns true for point within radius', () => {
    // Point ~1km away, 5km radius
    expect(isWithinRadius(45.3966, -75.696, center.lat, center.lng, 5)).toBe(true);
  });

  it('returns true for point exactly at center', () => {
    expect(isWithinRadius(center.lat, center.lng, center.lat, center.lng, 5)).toBe(true);
  });

  it('returns false for point outside radius', () => {
    // Ottawa to Toronto is ~350km, well beyond 5km
    expect(isWithinRadius(43.6532, -79.3832, center.lat, center.lng, 5)).toBe(false);
  });
});

describe('destinationPoint', () => {
  it('projects a point north (bearing 0)', () => {
    const result = destinationPoint(45.0, -75.0, 0, 10);
    expect(result.lat).toBeGreaterThan(45.0);
    expect(result.lng).toBeCloseTo(-75.0, 1);
  });

  it('projects a point east (bearing 90)', () => {
    const result = destinationPoint(45.0, -75.0, 90, 10);
    expect(result.lat).toBeCloseTo(45.0, 1);
    expect(result.lng).toBeGreaterThan(-75.0);
  });

  it('projects a point south (bearing 180)', () => {
    const result = destinationPoint(45.0, -75.0, 180, 10);
    expect(result.lat).toBeLessThan(45.0);
    expect(result.lng).toBeCloseTo(-75.0, 1);
  });

  it('projected distance matches the input distance', () => {
    const start = { lat: 45.3876, lng: -75.696 };
    const dist = 4.5;
    const result = destinationPoint(start.lat, start.lng, 45, dist);
    const actualDist = haversineDistance(start.lat, start.lng, result.lat, result.lng);
    expect(actualDist).toBeCloseTo(dist, 1);
  });
});

describe('distributeStopsOnRadius', () => {
  const center = { lat: 45.3876, lng: -75.696 };
  const radius = 4.5;

  it('returns correct number of stops', () => {
    expect(distributeStopsOnRadius(center.lat, center.lng, radius, 5)).toHaveLength(5);
    expect(distributeStopsOnRadius(center.lat, center.lng, radius, 10)).toHaveLength(10);
    expect(distributeStopsOnRadius(center.lat, center.lng, radius, 1)).toHaveLength(1);
  });

  it('returns empty array for count <= 0', () => {
    expect(distributeStopsOnRadius(center.lat, center.lng, radius, 0)).toEqual([]);
    expect(distributeStopsOnRadius(center.lat, center.lng, radius, -1)).toEqual([]);
  });

  it('all stops within max radius of school', () => {
    const stops = distributeStopsOnRadius(center.lat, center.lng, radius, 8);
    stops.forEach((stop) => {
      const dist = haversineDistance(center.lat, center.lng, stop.lat, stop.lng);
      expect(dist).toBeLessThanOrEqual(radius + 0.01); // small tolerance
    });
  });

  it('all stops at least MIN_DISTANCE_KM from school', () => {
    const minDist = Math.max(1, radius * 0.3); // matches implementation
    const stops = distributeStopsOnRadius(center.lat, center.lng, radius, 8);
    stops.forEach((stop) => {
      const dist = haversineDistance(center.lat, center.lng, stop.lat, stop.lng);
      expect(dist).toBeGreaterThanOrEqual(minDist - 0.01);
    });
  });

  it('each stop has valid lat/lng', () => {
    const stops = distributeStopsOnRadius(center.lat, center.lng, radius, 5);
    stops.forEach((stop) => {
      expect(stop.lat).toBeGreaterThan(-90);
      expect(stop.lat).toBeLessThan(90);
      expect(stop.lng).toBeGreaterThan(-180);
      expect(stop.lng).toBeLessThan(180);
    });
  });
});
