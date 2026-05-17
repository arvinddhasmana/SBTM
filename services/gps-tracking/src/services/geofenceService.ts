import prisma from '../prisma';
import { gpsEventPublisher } from './gpsEventPublisher';
import { shapesReader } from './shapesReader';

export interface GeofenceConfig {
  id: string;
  schoolId: string;
  routeId: string;
  corridorRadiusMeters: number;
  stopProximityMeters: number;
  deviationThresholdMeters: number;
}

export interface UpsertGeofenceDto {
  schoolId: string;
  routeId: string;
  corridorRadiusMeters?: number;
  stopProximityMeters?: number;
  deviationThresholdMeters?: number;
}

/**
 * GeofenceService
 *
 * Manages per-route geofence configuration and performs PostGIS-based spatial
 * checks to detect route deviations.
 *
 * Coordinate classification:
 *  - T2: route geometry and stop positions (route operational data)
 *  - T3: deviation events (linked to vehicle/route, not to a student)
 *
 * T4 PII is never handled here — do not add student or guardian context.
 */
export class GeofenceService {
  /**
   * Create or replace the geofence configuration for a route.
   * Tenant isolation: always scoped by schoolId derived from auth context.
   */
  async upsert(dto: UpsertGeofenceDto): Promise<GeofenceConfig> {
    const existing = await prisma.routeGeofence.findUnique({
      where: { routeId: dto.routeId },
    });

    if (existing && existing.schoolId !== dto.schoolId) {
      throw new Error('Geofence schoolId mismatch — tenant isolation violation');
    }

    const record = await prisma.routeGeofence.upsert({
      where: { routeId: dto.routeId },
      update: {
        corridorRadiusMeters: dto.corridorRadiusMeters,
        stopProximityMeters: dto.stopProximityMeters,
        deviationThresholdMeters: dto.deviationThresholdMeters,
      },
      create: {
        schoolId: dto.schoolId,
        routeId: dto.routeId,
        corridorRadiusMeters: dto.corridorRadiusMeters ?? 200,
        stopProximityMeters: dto.stopProximityMeters ?? 50,
        deviationThresholdMeters: dto.deviationThresholdMeters ?? 300,
      },
    });

    return record;
  }

  async findByRoute(routeId: string, schoolId: string): Promise<GeofenceConfig | null> {
    return prisma.routeGeofence.findFirst({
      where: { routeId, schoolId },
    });
  }

  /**
   * Check whether a vehicle position deviates from its route.
   *
   * Strategy:
   *  1. Load the geofence thresholds for the route.
   *  2. Load the planned route polyline from the GTFS `shapes` table via
   *     `shapesReader.getPolylineForRoute` (v2 data model — replaces the
   *     legacy `routes.polyline` column).
   *  3. Using PostGIS, compute the minimum metre distance between the
   *     vehicle position and the planned shape line (ST_Distance against
   *     a LineString constructed from the shape points).
   *  4. If the distance exceeds deviationThresholdMeters, persist a deviation
   *     event record and publish a `route.deviation` BullMQ event.
   *
   * Returns the deviation distance in metres, or null if no geofence is configured
   * or the route has no shape geometry available yet.
   */
  async checkDeviation(params: {
    vehicleId: string;
    routeId: string;
    schoolId: string;
    lat: number;
    lng: number;
    timestamp: string;
  }): Promise<{ deviated: boolean; deviationMeters: number | null }> {
    const geofence = await this.findByRoute(params.routeId, params.schoolId);
    if (!geofence) {
      return { deviated: false, deviationMeters: null };
    }

    const polyline = await shapesReader.getPolylineForRoute(params.routeId);
    if (polyline.length < 2) {
      // A LineString needs at least two points. Without geometry we cannot
      // compute a deviation — fail open rather than firing false positives.
      return { deviated: false, deviationMeters: null };
    }

    // Build a WKT LINESTRING from the shape points (lon lat ordering per
    // OGC spec) and let PostGIS compute the great-circle distance from the
    // incoming point to the planned corridor in metres.
    const wkt = `LINESTRING(${polyline.map((p) => `${p.lng} ${p.lat}`).join(', ')})`;

    const result = await prisma.$queryRaw<{ min_dist: number }[]>`
            SELECT ST_Distance(
                ST_SetSRID(ST_GeomFromText(${wkt}), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
            ) AS min_dist
        `;

    if (!result.length || result[0]?.min_dist == null) {
      return { deviated: false, deviationMeters: null };
    }

    const minDist = Number(result[0].min_dist);
    const deviated = minDist > geofence.deviationThresholdMeters;

    if (deviated) {
      // Persist immutable deviation audit record
      await prisma.routeDeviationEvent.create({
        data: {
          schoolId: params.schoolId,
          routeId: params.routeId,
          vehicleId: params.vehicleId,
          lat: params.lat,
          lng: params.lng,
          deviationMeters: minDist,
          threshold: geofence.deviationThresholdMeters,
        },
      });

      // Publish downstream event — log IDs only, no T4 data
      void gpsEventPublisher.publishRouteDeviation({
        vehicleId: params.vehicleId,
        routeId: params.routeId,
        schoolId: params.schoolId,
        lat: params.lat,
        lng: params.lng,
        deviationMeters: minDist,
        threshold: geofence.deviationThresholdMeters,
        timestamp: params.timestamp,
      });

      console.info('[geofence] Route deviation detected', {
        routeId: params.routeId,
        vehicleId: params.vehicleId,
        schoolId: params.schoolId,
        deviationMeters: Math.round(minDist),
        threshold: geofence.deviationThresholdMeters,
      });
    }

    return { deviated, deviationMeters: minDist };
  }

  /**
   * List recent deviation events for a route (most recent first).
   * Tenant-scoped by schoolId.
   */
  async getDeviationHistory(routeId: string, schoolId: string, limit = 50) {
    return prisma.routeDeviationEvent.findMany({
      where: { routeId, schoolId },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });
  }
}
