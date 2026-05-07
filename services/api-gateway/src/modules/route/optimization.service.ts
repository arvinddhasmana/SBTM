import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateRouteStopDto } from './dto/route.dto';

export interface OptimizationResult {
  optimizedStops: CreateRouteStopDto[];
  polyline: string; // Encoded polyline string (Google format)
  polylineGeoJson: GeoJsonLineString | null; // Decoded GeoJSON for map rendering
  totalDistance: number; // km
  totalDuration: number; // minutes
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][]; // [lng, lat]
}

interface OsrmRouteResponse {
  code: string;
  routes: OsrmRoute[];
  waypoints: OsrmWaypoint[];
}

interface OsrmRoute {
  distance: number; // metres
  duration: number; // seconds
  geometry: string; // encoded polyline (overview=full)
  legs: OsrmLeg[];
}

interface OsrmWaypoint {
  name: string;
  location: [number, number]; // [lng, lat]
  waypoint_index: number;
  trips_index?: number;
}

interface OsrmLeg {
  distance: number;
  duration: number;
}

/**
 * Parses a WKT POINT string to [lng, lat].
 * Expected format: "POINT(lng lat)" or "POINT (lng lat)"
 */
function parseWktPoint(wkt: string): [number, number] | null {
  const match = wkt.match(
    /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i,
  );
  if (!match) return null;
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);

  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return [lng, lat];
}

/**
 * Decodes a Google encoded polyline string into GeoJSON LineString coordinates.
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]);
  }

  return points;
}

export interface SnapToRoadResult {
  polyline: string;
  polylineGeoJson: GeoJsonLineString | null;
  totalDistance: number; // km
  totalDuration: number; // minutes
}

@Injectable()
export class OptimizationService {
  private readonly logger = new Logger(OptimizationService.name);
  private readonly osrmBaseUrl: string;
  private static readonly OSRM_REQUEST_TIMEOUT_MS = 8_000;

  constructor(private readonly configService: ConfigService) {
    this.osrmBaseUrl = this.configService.get<string>(
      'OSRM_BASE_URL',
      'http://osrm:5000',
    );
  }

  /**
   * Snap a sequence of waypoints to the road network without reordering.
   * Uses OSRM /route (not /trip) to preserve the given order.
   */
  async snapToRoad(
    waypoints: { lat: number; lng: number }[],
  ): Promise<SnapToRoadResult> {
    if (waypoints.length < 2) {
      return {
        polyline: '',
        polylineGeoJson: null,
        totalDistance: 0,
        totalDuration: 0,
      };
    }

    try {
      const coordStr = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
      const url = `${this.osrmBaseUrl}/route/v1/driving/${coordStr}`;
      this.logger.log(`Calling OSRM: ${url}`);

      const response = await axios.get<OsrmRouteResponse>(url, {
        params: {
          overview: 'full',
          geometries: 'polyline',
        },
        timeout: OptimizationService.OSRM_REQUEST_TIMEOUT_MS,
      });

      if (response.data.code !== 'Ok' || !response.data.routes?.length) {
        this.logger.warn(
          `OSRM snap-to-road returned code=${response.data.code}`,
        );
        return {
          polyline: '',
          polylineGeoJson: null,
          totalDistance: 0,
          totalDuration: 0,
        };
      }

      const route = response.data.routes[0];
      const decodedCoords = decodePolyline(route.geometry);

      return {
        polyline: route.geometry,
        polylineGeoJson: {
          type: 'LineString',
          coordinates: decodedCoords,
        },
        totalDistance: Math.round((route.distance / 1000) * 10) / 10,
        totalDuration: Math.round(route.duration / 60),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`OSRM snap-to-road failed (${message})`);
      return {
        polyline: '',
        polylineGeoJson: null,
        totalDistance: 0,
        totalDuration: 0,
      };
    }
  }

  async optimizeStops(
    stops: CreateRouteStopDto[],
  ): Promise<OptimizationResult> {
    if (stops.length < 2) {
      return this.buildFallbackResult(
        stops,
        'Fewer than 2 stops — skipping provider call',
      );
    }

    // Extract coordinates from WKT location fields
    const coords: [number, number][] = [];
    for (const stop of stops) {
      const parsed = parseWktPoint(stop.location);
      if (!parsed) {
        this.logger.warn(
          `Stop at sequence ${stop.sequence} has invalid or missing WKT location — falling back`,
        );
        return this.buildFallbackResult(
          stops,
          'One or more stops have invalid location WKT',
        );
      }
      coords.push(parsed);
    }

    try {
      return await this.callOsrmTrip(stops, coords);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `OSRM call failed (${message}) — returning fallback result`,
      );
      return this.buildFallbackResult(stops, message);
    }
  }

  /**
   * Calls the OSRM /trip API which solves the Travelling Salesman Problem
   * for the given waypoints, returning an optimized ordering with real
   * route geometry, distance, and duration.
   */
  private async callOsrmTrip(
    stops: CreateRouteStopDto[],
    coords: [number, number][],
  ): Promise<OptimizationResult> {
    // OSRM trip endpoint: /trip/v1/driving/{lng,lat};{lng,lat};...
    // source=first keeps the first stop as the starting point
    const coordStr = coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const url = `${this.osrmBaseUrl}/trip/v1/driving/${coordStr}`;

    const response = await axios.get<OsrmRouteResponse>(url, {
      params: {
        overview: 'full',
        geometries: 'polyline',
        source: 'first',
        destination: 'last',
        roundtrip: false,
      },
      timeout: OptimizationService.OSRM_REQUEST_TIMEOUT_MS,
    });

    if (response.data.code !== 'Ok' || !response.data.routes.length) {
      throw new Error(`OSRM returned code=${response.data.code}`);
    }

    const route = response.data.routes[0];
    const waypoints = response.data.waypoints ?? [];

    // Re-order stops to match the OSRM waypoint ordering
    const optimizedStops = waypoints
      .sort((a, b) => a.waypoint_index - b.waypoint_index)
      .map((wp, idx) => {
        const originalStop = stops[wp.waypoint_index] ?? stops[idx];
        return { ...originalStop, sequence: idx };
      });

    const decodedCoords = decodePolyline(route.geometry);

    return {
      optimizedStops,
      polyline: route.geometry,
      polylineGeoJson: {
        type: 'LineString',
        coordinates: decodedCoords,
      },
      totalDistance: Math.round((route.distance / 1000) * 10) / 10, // metres → km, 1 dp
      totalDuration: Math.round(route.duration / 60), // seconds → minutes
    };
  }

  /**
   * Fallback result when OSRM is unavailable or coordinates are missing.
   * Returns stops in alphabetical order with null geometry.
   * Callers can detect the fallback by checking polylineGeoJson === null.
   */
  private buildFallbackResult(
    stops: CreateRouteStopDto[],
    reason: string,
  ): OptimizationResult {
    this.logger.warn(`Using fallback optimization: ${reason}`);

    const optimized = [...stops].sort((a, b) =>
      a.address.localeCompare(b.address),
    );
    optimized.forEach((stop, index) => {
      stop.sequence = index;
    });

    return {
      optimizedStops: optimized,
      polyline: '',
      polylineGeoJson: null,
      totalDistance: 0,
      totalDuration: 0,
    };
  }
}
