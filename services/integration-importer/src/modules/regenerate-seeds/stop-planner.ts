import type { LatLon } from '../shape-fallback/osrm-client';
import { haversineMeters, offsetMeters } from './geo';
import { MUNICIPAL_RULES } from './municipal-rules';
import type { OsrmPlanningClient } from './osrm-planning-client';
import { SeededRng } from './seeded-rng';

/**
 * Generates `count` road-snapped pickup stops within `radiusM` of `school`.
 *
 * Algorithm:
 *   1. Sample 4× as many candidates uniformly inside a square inscribed in
 *      the service radius (cheap; we don't care about square-vs-disc bias).
 *   2. Snap each candidate to the nearest road via OSRM `/nearest`.
 *   3. Walk the snapped points in order and keep the first `count` that
 *      satisfy `MIN_STOP_SPACING_M` against the already-kept set.
 *   4. If we don't have enough survivors, throw — failing loudly is better
 *      than silently shipping a sparse / overlapping stop layout.
 *
 * Snapping is what guarantees the "stops sit on the road shoulder" property
 * the user explicitly called out. The downstream OSRM `/route` will then
 * thread road-following polylines *through* these snapped points.
 */
export async function planRoadSnappedStops(args: {
  school: LatLon;
  radiusM: number;
  count: number;
  rng: SeededRng;
  osrm: Pick<OsrmPlanningClient, 'nearest'>;
  /** Override for tests; defaults to `MIN_STOP_SPACING_M`. */
  minSpacingM?: number;
}): Promise<LatLon[]> {
  const { school, radiusM, count, rng, osrm } = args;
  const minSpacingM = args.minSpacingM ?? MUNICIPAL_RULES.MIN_STOP_SPACING_M;
  const oversample = Math.max(count * 4, 16);

  // Candidate generation: pick offsets in [-radius, +radius] × [-radius, +radius].
  const candidates: LatLon[] = [];
  for (let i = 0; i < oversample; i += 1) {
    const north = rng.range(-radiusM, radiusM);
    const east = rng.range(-radiusM, radiusM);
    candidates.push(offsetMeters(school, north, east));
  }

  const snapped: LatLon[] = [];
  for (const c of candidates) {
    try {
      const s = await osrm.nearest(c);
      snapped.push(s);
    } catch {
      // /nearest can fail for points way off the road graph (in a lake, in
      // a park interior). Skip them — we oversampled for exactly this case.
    }
  }

  const kept: LatLon[] = [];
  for (const s of snapped) {
    // Reject if too close to the school (don't want a "stop" inside the
    // schoolyard) or to any already-kept stop.
    if (haversineMeters(s, school) < minSpacingM) continue;
    if (kept.some((k) => haversineMeters(k, s) < minSpacingM)) continue;
    kept.push(s);
    if (kept.length >= count) break;
  }

  if (kept.length < count) {
    throw new Error(
      `planRoadSnappedStops: only found ${kept.length}/${count} stops ≥${minSpacingM}m apart within ${radiusM}m of school`,
    );
  }
  return kept;
}

/**
 * Pick a "home" location for a student tied to `stop`: a road-snapped point
 * within `MAX_WALK_DISTANCE_M` of the stop but not on top of it. Used by
 * the regenerator to ensure every student's `home_lat/home_lon` is
 * eligibility-correct (≤1.6 km walk per Ontario MTO).
 */
export async function planStudentHomeNearStop(args: {
  stop: LatLon;
  rng: SeededRng;
  osrm: Pick<OsrmPlanningClient, 'nearest'>;
  maxWalkM?: number;
}): Promise<LatLon> {
  const { stop, rng, osrm } = args;
  const maxWalkM = args.maxWalkM ?? MUNICIPAL_RULES.MAX_WALK_DISTANCE_M;
  // Walk between 100 m and maxWalk; 100 m floor keeps the home from
  // overlapping the stop pin in the UI.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const distance = rng.range(100, maxWalkM);
    const bearing = rng.range(0, Math.PI * 2);
    const candidate = offsetMeters(
      stop,
      Math.cos(bearing) * distance,
      Math.sin(bearing) * distance,
    );
    try {
      const snapped = await osrm.nearest(candidate);
      // Verify the snapped result is still within walk budget; OSRM may
      // pull us to a road further than the offset suggests.
      if (haversineMeters(snapped, stop) <= maxWalkM) return snapped;
    } catch {
      // try again
    }
  }
  // Fallback: return the stop itself (degenerate but valid).
  return stop;
}
