import { Logger } from '@nestjs/common';
import type { LatLon, OsrmClient, OsrmShapePoint } from './osrm-client';

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  message?: string;
}

/**
 * HTTP-backed OSRM client. Calls `/route/v1/{profile}/{coords}` with
 * `geometries=geojson&overview=full` and maps the returned polyline into GTFS
 * shape rows. Failures (non-2xx, OSRM `code != 'Ok'`, missing geometry) throw
 * so an importer run does not silently produce zero shapes.
 *
 * `shape_dist_traveled` is left null for interior points — OSRM does not
 * expose per-shape-point cumulative distance and the importer does not yet
 * consume it.
 */
export class HttpOsrmClient implements OsrmClient {
  private readonly logger = new Logger(HttpOsrmClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly profile: string = 'driving',
    private readonly timeoutMs: number = 10_000,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async routeSnappedPath(coords: LatLon[]): Promise<OsrmShapePoint[]> {
    if (coords.length < 2) return [];

    const coordPath = coords.map((c) => `${c.lon.toFixed(6)},${c.lat.toFixed(6)}`).join(';');
    const url = `${this.baseUrl.replace(/\/$/, '')}/route/v1/${this.profile}/${coordPath}?geometries=geojson&overview=full`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`OSRM ${res.status} ${res.statusText} for ${url}`);
    }
    const body = (await res.json()) as OsrmRouteResponse;
    if (body.code && body.code !== 'Ok') {
      throw new Error(`OSRM returned code=${body.code} (${body.message ?? ''})`);
    }
    const geom = body.routes?.[0]?.geometry?.coordinates;
    if (!geom || geom.length === 0) {
      throw new Error(`OSRM response missing geometry.coordinates`);
    }

    // GeoJSON coords are [lon, lat].
    return geom.map(([lon, lat], i) => ({
      shapePtLat: lat,
      shapePtLon: lon,
      shapePtSequence: i + 1,
      shapeDistTraveled: i === 0 ? 0 : null,
    }));
  }

  async nearest(coord: LatLon): Promise<LatLon | null> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/nearest/v1/${this.profile}/${coord.lon.toFixed(6)},${coord.lat.toFixed(6)}?number=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      this.logger.warn(`OSRM nearest ${res.status} for ${url}`);
      return null;
    }
    const body = (await res.json()) as {
      code?: string;
      waypoints?: Array<{ location?: [number, number] }>;
    };
    if (body.code !== 'Ok') return null;
    const loc = body.waypoints?.[0]?.location;
    if (!loc) return null;
    return { lon: loc[0], lat: loc[1] };
  }
}
