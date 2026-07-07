import type { LatLon } from '../shape-fallback/osrm-client';
import { haversineMeters } from './geo';
import { MUNICIPAL_RULES } from './municipal-rules';
import { SeededRng } from './seeded-rng';
import { planRoadSnappedStops, planStudentHomeNearStop } from './stop-planner';

/**
 * Deterministic fake OSRM `/nearest` that returns the candidate unchanged.
 * We're testing the planner's spacing / dedupe logic, not OSRM itself —
 * real OSRM is exercised end-to-end by the import-sample pipeline.
 */
const identityOsrm = {
  async nearest(p: LatLon): Promise<LatLon> {
    return p;
  },
};

const SCHOOL: LatLon = { lat: 45.42, lon: -75.69 };

describe('planRoadSnappedStops', () => {
  it('returns the requested number of stops, all ≥ MIN_STOP_SPACING_M apart', async () => {
    const stops = await planRoadSnappedStops({
      school: SCHOOL,
      radiusM: 3000,
      count: 5,
      rng: new SeededRng(1),
      osrm: identityOsrm,
    });
    expect(stops).toHaveLength(5);
    for (let i = 0; i < stops.length; i += 1) {
      for (let j = i + 1; j < stops.length; j += 1) {
        expect(haversineMeters(stops[i], stops[j])).toBeGreaterThanOrEqual(
          MUNICIPAL_RULES.MIN_STOP_SPACING_M,
        );
      }
    }
  });

  it('keeps every stop at least MIN_STOP_SPACING_M from the school', async () => {
    const stops = await planRoadSnappedStops({
      school: SCHOOL,
      radiusM: 3000,
      count: 5,
      rng: new SeededRng(99),
      osrm: identityOsrm,
    });
    for (const s of stops) {
      expect(haversineMeters(s, SCHOOL)).toBeGreaterThanOrEqual(MUNICIPAL_RULES.MIN_STOP_SPACING_M);
    }
  });

  it('is deterministic for the same seed', async () => {
    const a = await planRoadSnappedStops({
      school: SCHOOL,
      radiusM: 3000,
      count: 5,
      rng: new SeededRng(42),
      osrm: identityOsrm,
    });
    const b = await planRoadSnappedStops({
      school: SCHOOL,
      radiusM: 3000,
      count: 5,
      rng: new SeededRng(42),
      osrm: identityOsrm,
    });
    expect(a).toEqual(b);
  });

  it('throws if it cannot find enough stops with the requested spacing', async () => {
    // 50 m radius < 250 m spacing -> impossible.
    await expect(
      planRoadSnappedStops({
        school: SCHOOL,
        radiusM: 50,
        count: 5,
        rng: new SeededRng(1),
        osrm: identityOsrm,
        minSpacingM: 250,
      }),
    ).rejects.toThrow(/only found/);
  });
});

describe('planStudentHomeNearStop', () => {
  const STOP: LatLon = { lat: 45.395, lon: -75.751 };

  it('returns a point within MAX_WALK_DISTANCE_M of the stop', async () => {
    const home = await planStudentHomeNearStop({
      stop: STOP,
      rng: new SeededRng(5),
      osrm: identityOsrm,
    });
    expect(haversineMeters(home, STOP)).toBeLessThanOrEqual(MUNICIPAL_RULES.MAX_WALK_DISTANCE_M);
  });

  it('returns a point at least 100m away (not on top of the pin)', async () => {
    const home = await planStudentHomeNearStop({
      stop: STOP,
      rng: new SeededRng(5),
      osrm: identityOsrm,
    });
    expect(haversineMeters(home, STOP)).toBeGreaterThan(90); // tolerance for snap
  });
});
