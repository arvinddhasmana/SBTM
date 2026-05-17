import prisma from '../prisma';

/**
 * Shape point as returned to callers — GTFS shapes table row projected
 * into a simple lat/lng/sequence tuple.
 */
export interface ShapePoint {
  lat: number;
  lng: number;
  sequence: number;
}

/**
 * shapesReader
 *
 * Reads route path geometry from the GTFS `shapes` table for the SBTM v2
 * data model. In v2 the legacy `routes.polyline` column is gone: each route
 * has one or more `trips`, each trip references a `shape_id`, and the
 * `shapes` table holds the ordered (lat, lng, sequence) points.
 *
 * Design choice: we intentionally use `prisma.$queryRaw` against the GTFS
 * tables instead of extending the gps-tracking Prisma schema with read-only
 * models for `routes` / `trips` / `shapes`. Those tables are owned by the
 * api-gateway service; mirroring them here would create ownership ambiguity
 * and a second source of truth that could drift out of sync at every GTFS
 * import. Raw SQL keeps the boundary explicit: this service treats the
 * GTFS tables as an external read-only contract.
 *
 * Canonical-trip selection rule:
 *   When a route has multiple trips with different shapes we pick the trip
 *   with the lowest `direction_id` (0 = outbound / AM morning trip per the
 *   GTFS convention adopted in DataModel-v2). If multiple candidate shapes
 *   tie on direction we break the tie by point-count (longest shape wins),
 *   on the assumption that the longest geometry is the most complete
 *   representation of the corridor.
 */

interface RawShapeRow {
  lat: number;
  lng: number;
  sequence: number;
}

export async function getPolylineForRoute(routeId: string): Promise<ShapePoint[]> {
  // Single round-trip: pick the canonical shape_id for this route, then
  // stream its points in sequence order. The CTE orders candidate trips by
  // direction_id ASC, then by point count DESC as a tie-breaker.
  const rows = await prisma.$queryRaw<RawShapeRow[]>`
        WITH candidate_shapes AS (
            SELECT t.shape_id,
                   MIN(t.direction_id) AS direction_id,
                   COUNT(s.shape_pt_sequence) AS pt_count
            FROM trips t
            JOIN shapes s ON s.shape_id = t.shape_id
            WHERE t.route_id = ${routeId}
              AND t.shape_id IS NOT NULL
            GROUP BY t.shape_id
        ),
        chosen AS (
            SELECT shape_id
            FROM candidate_shapes
            ORDER BY direction_id ASC, pt_count DESC
            LIMIT 1
        )
        SELECT shape_pt_lat       AS lat,
               shape_pt_lon       AS lng,
               shape_pt_sequence  AS sequence
        FROM shapes
        WHERE shape_id = (SELECT shape_id FROM chosen)
        ORDER BY shape_pt_sequence ASC
    `;

  return rows.map((r) => ({
    lat: Number(r.lat),
    lng: Number(r.lng),
    sequence: Number(r.sequence),
  }));
}

export const shapesReader = { getPolylineForRoute };
