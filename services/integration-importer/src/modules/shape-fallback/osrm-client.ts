export interface LatLon {
  lat: number;
  lon: number;
}

export interface OsrmShapePoint {
  shapePtLat: number;
  shapePtLon: number;
  shapePtSequence: number;
  shapeDistTraveled: number | null;
}

/**
 * Minimal OSRM-route abstraction. The real implementation hits an
 * `/route/v1/driving/{coords}?geometries=geojson&overview=full` endpoint and
 * returns the geometry coordinates. Tests substitute `StubOsrmClient` so we
 * don't depend on a live OSRM in unit tests.
 */
export interface OsrmClient {
  routeSnappedPath(coords: LatLon[]): Promise<OsrmShapePoint[]>;
  /** Snap a single point to the nearest drivable curb. Returns null on error. */
  nearest?(coord: LatLon): Promise<LatLon | null>;
}

export class StubOsrmClient implements OsrmClient {
  // eslint-disable-next-line @typescript-eslint/require-await
  async routeSnappedPath(coords: LatLon[]): Promise<OsrmShapePoint[]> {
    return coords.map((c, i) => ({
      shapePtLat: c.lat,
      shapePtLon: c.lon,
      shapePtSequence: i + 1,
      shapeDistTraveled: i === 0 ? 0 : null,
    }));
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async nearest(coord: LatLon): Promise<LatLon | null> {
    return coord;
  }
}
