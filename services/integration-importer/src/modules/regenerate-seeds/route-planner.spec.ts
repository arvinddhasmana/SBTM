import type { LatLon } from '../shape-fallback/osrm-client';
import { haversineMeters } from './geo';
import { orderStopsForTrip, planRouteShape } from './route-planner';

const SCHOOL: LatLon = { lat: 45.42, lon: -75.69 };

describe('orderStopsForTrip', () => {
  const STOPS: LatLon[] = [
    { lat: 45.41, lon: -75.7 }, // near
    { lat: 45.35, lon: -75.75 }, // far
    { lat: 45.4, lon: -75.71 },
  ];

  it('AM trips end at the school', () => {
    const ordered = orderStopsForTrip(STOPS, SCHOOL, 'AM');
    expect(ordered[ordered.length - 1]).toEqual(SCHOOL);
  });

  it('PM trips start at the school', () => {
    const ordered = orderStopsForTrip(STOPS, SCHOOL, 'PM');
    expect(ordered[0]).toEqual(SCHOOL);
  });

  it('AM trips begin at the furthest pickup', () => {
    const ordered = orderStopsForTrip(STOPS, SCHOOL, 'AM');
    const first = ordered[0];
    // The farthest stop from school is (45.35, -75.75).
    expect(haversineMeters(first, SCHOOL)).toBeGreaterThan(5000);
  });

  it('handles empty stop list gracefully', () => {
    expect(orderStopsForTrip([], SCHOOL, 'AM')).toEqual([SCHOOL]);
    expect(orderStopsForTrip([], SCHOOL, 'PM')).toEqual([SCHOOL]);
  });
});

describe('planRouteShape (with stub OSRM)', () => {
  // Stub returns a straight line between the two points so we can assert
  // distance bookkeeping in isolation.
  const straightLineOsrm = {
    async route(coords: LatLon[]) {
      return {
        coordinates: coords.slice(),
        distanceM: haversineMeters(coords[0], coords[coords.length - 1]),
      };
    },
  };

  it('returns one stopDistance per ordered stop, starting at 0', async () => {
    const stops: LatLon[] = [
      { lat: 45.4, lon: -75.7 },
      { lat: 45.41, lon: -75.7 },
      { lat: 45.42, lon: -75.69 },
    ];
    const r = await planRouteShape(stops, straightLineOsrm);
    expect(r.stopDistancesM).toHaveLength(stops.length);
    expect(r.stopDistancesM[0]).toBe(0);
    expect(r.totalDistanceM).toBeGreaterThan(0);
    expect(r.stopDistancesM[r.stopDistancesM.length - 1]).toBeCloseTo(r.totalDistanceM, 3);
  });

  it('handles a single point without OSRM calls', async () => {
    const r = await planRouteShape([{ lat: 45.4, lon: -75.7 }], straightLineOsrm);
    expect(r.polyline).toHaveLength(1);
    expect(r.totalDistanceM).toBe(0);
  });
});
