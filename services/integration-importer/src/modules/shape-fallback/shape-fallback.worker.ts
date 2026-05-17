import { Logger } from '@nestjs/common';
import { LatLon, OsrmClient, OsrmShapePoint } from './osrm-client';

export interface RouteForShape {
  staRouteNumber: string;
  /** Stops in service order — the OSRM call snaps these to roads. */
  stops: LatLon[];
}

export interface GeneratedShape {
  staRouteNumber: string;
  shapeId: string;
  shapeSource: 'sbtm_generated';
  points: OsrmShapePoint[];
}

/**
 * Slice 3: post-import worker. Routes that arrive without a shape (or whose
 * shape_id is absent from sta-shapes.csv) get a road-snapped polyline derived
 * from the stop sequence via OSRM. Output rows carry shape_source =
 * 'sbtm_generated' so STA Admin can later refine via the Route Planner without
 * losing provenance. Real-Postgres write-back is part of slice 2b/3-commit.
 */
export class ShapeFallbackWorker {
  private readonly logger = new Logger(ShapeFallbackWorker.name);

  constructor(private readonly osrm: OsrmClient) {}

  async runOnce(routes: RouteForShape[]): Promise<GeneratedShape[]> {
    const out: GeneratedShape[] = [];
    for (const r of routes) {
      if (r.stops.length < 2) {
        this.logger.warn(
          `route ${r.staRouteNumber}: skipping fallback (need >=2 stops, got ${r.stops.length})`,
        );
        continue;
      }
      const points = await this.osrm.routeSnappedPath(r.stops);
      out.push({
        staRouteNumber: r.staRouteNumber,
        shapeId: `gen-${r.staRouteNumber}`,
        shapeSource: 'sbtm_generated',
        points,
      });
    }
    return out;
  }
}
