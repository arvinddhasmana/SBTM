import { Logger } from '@nestjs/common';
import type { LatLon } from '../shape-fallback/osrm-client';

interface NearestResponse {
  code?: string;
  message?: string;
  waypoints?: Array<{ location?: [number, number] }>;
}

interface RouteResponse {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }>;
}

/**
 * Planning-side OSRM HTTP client. Wraps the same OSRM server the importer
 * uses for shape fallback, but exposes the two extra endpoints the seed
 * regenerator needs:
 *
 *   - `nearest(point)`   curb-snaps a candidate stop location onto the
 *                        nearest road, so stops never end up in the middle
 *                        of a building or river.
 *   - `route(coords)`    returns the road-following polyline AND its total
 *                        length, used for scheduling and shape emission.
 *
 * Throws on any non-`Ok` response so the regen pipeline fails loudly rather
 * than silently shipping straight-line shapes.
 */
export class OsrmPlanningClient {
  private readonly logger = new Logger(OsrmPlanningClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly profile: string = 'driving',
    private readonly timeoutMs: number = 10_000,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async nearest(point: LatLon): Promise<LatLon> {
    const url =
      `${this.trimmedBase()}/nearest/v1/${this.profile}/` +
      `${point.lon.toFixed(6)},${point.lat.toFixed(6)}`;
    const body = (await this.fetchJson(url)) as NearestResponse;
    if (body.code && body.code !== 'Ok') {
      throw new Error(`OSRM /nearest code=${body.code} (${body.message ?? ''})`);
    }
    const loc = body.waypoints?.[0]?.location;
    if (!loc) throw new Error(`OSRM /nearest response missing waypoints[0].location`);
    // OSRM returns [lon, lat].
    return { lat: loc[1], lon: loc[0] };
  }

  async route(coords: LatLon[]): Promise<{ coordinates: LatLon[]; distanceM: number }> {
    if (coords.length < 2) return { coordinates: coords.slice(), distanceM: 0 };
    const coordPath = coords.map((c) => `${c.lon.toFixed(6)},${c.lat.toFixed(6)}`).join(';');
    const url =
      `${this.trimmedBase()}/route/v1/${this.profile}/${coordPath}` +
      `?geometries=geojson&overview=full`;
    const body = (await this.fetchJson(url)) as RouteResponse;
    if (body.code && body.code !== 'Ok') {
      throw new Error(`OSRM /route code=${body.code} (${body.message ?? ''})`);
    }
    const route = body.routes?.[0];
    const geom = route?.geometry?.coordinates;
    if (!geom || geom.length === 0) {
      throw new Error(`OSRM /route response missing geometry.coordinates`);
    }
    return {
      coordinates: geom.map(([lon, lat]) => ({ lat, lon })),
      distanceM: route?.distance ?? 0,
    };
  }

  private trimmedBase(): string {
    return this.baseUrl.replace(/\/$/, '');
  }

  private async fetchJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`OSRM ${res.status} ${res.statusText} for ${url}`);
      }
      return (await res.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }
}
