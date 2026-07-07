import type { LatLon } from '../shape-fallback/osrm-client';
import { haversineMeters } from './geo';
import type { OsrmPlanningClient } from './osrm-planning-client';

/**
 * Order an unordered set of pickup stops into the visit sequence a real bus
 * would drive: nearest-neighbour starting from the stop furthest from school,
 * ending at the school itself. This is the same heuristic Stock
 * Transportation dispatchers describe ("start from the outer end, work
 * inward") — good enough for synthetic data and stable across runs.
 *
 * Direction:
 *   - 'AM': pickups → school (school is last)
 *   - 'PM': school → dropoffs (school is first, stops reversed)
 */
export function orderStopsForTrip(
  stops: LatLon[],
  school: LatLon,
  direction: 'AM' | 'PM',
): LatLon[] {
  if (stops.length === 0) return direction === 'AM' ? [school] : [school];

  // Pick the start: the stop furthest from school becomes the first pickup.
  const remaining = stops.slice();
  let startIdx = 0;
  let startDist = -Infinity;
  for (let i = 0; i < remaining.length; i += 1) {
    const d = haversineMeters(remaining[i], school);
    if (d > startDist) {
      startDist = d;
      startIdx = i;
    }
  }
  const ordered: LatLon[] = [remaining.splice(startIdx, 1)[0]];

  // Greedy nearest-neighbour through the rest, ending at school.
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const d = haversineMeters(last, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  ordered.push(school);
  return direction === 'AM' ? ordered : ordered.slice().reverse();
}

/**
 * Resolve the road-following polyline through the ordered stop sequence.
 * Returns the polyline as `LatLon[]` plus the per-stop cumulative distance
 * along the polyline (so the regenerator can populate GTFS
 * `shape_dist_traveled` and back-schedule arrival times against a constant
 * cruising speed).
 *
 * Concretely:
 *   `stopDistancesM[i]` = OSRM road-distance from `orderedStops[0]` to
 *   `orderedStops[i]` along the returned polyline.
 */
export async function planRouteShape(
  orderedStops: LatLon[],
  osrm: Pick<OsrmPlanningClient, 'route'>,
): Promise<{ polyline: LatLon[]; stopDistancesM: number[]; totalDistanceM: number }> {
  if (orderedStops.length < 2) {
    return {
      polyline: orderedStops.slice(),
      stopDistancesM: orderedStops.map(() => 0),
      totalDistanceM: 0,
    };
  }
  // One OSRM /route call per *leg* gives us exact per-stop distances; one
  // big multi-point call would only return the total. Legs are cheap.
  const polyline: LatLon[] = [];
  const stopDistancesM: number[] = [0];
  let cumulative = 0;
  for (let i = 0; i < orderedStops.length - 1; i += 1) {
    const leg = await osrm.route([orderedStops[i], orderedStops[i + 1]]);
    if (i === 0) {
      polyline.push(...leg.coordinates);
    } else {
      // Skip duplicate joining point.
      polyline.push(...leg.coordinates.slice(1));
    }
    cumulative += leg.distanceM;
    stopDistancesM.push(cumulative);
  }
  return { polyline, stopDistancesM, totalDistanceM: cumulative };
}
