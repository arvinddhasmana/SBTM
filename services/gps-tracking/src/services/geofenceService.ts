import prisma from '../prisma';
import { gpsEventPublisher } from './gpsEventPublisher';

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
     *  2. Using PostGIS, find the minimum distance between the vehicle position
     *     and any location_point recorded on this route (acts as a route corridor
     *     approximation from historical breadcrumbs).
     *  3. If the distance exceeds deviationThresholdMeters, persist a deviation
     *     event record and publish a `route.deviation` BullMQ event.
     *
     * Returns the deviation distance in metres, or null if no geofence is configured
     * or insufficient history exists.
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

        // Use PostGIS ST_Distance (geography) for accurate metre-based distance.
        // We compare the incoming point against the route corridor represented by
        // the aggregate of all previously ingested location points for this route.
        // The result is the minimum distance to ANY prior breadcrumb on this route.
        const result = await prisma.$queryRaw<{ min_dist: number }[]>`
            SELECT MIN(
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
                )
            ) AS min_dist
            FROM location_points
            WHERE school_id = ${params.schoolId}
              AND route_id  = ${params.routeId}
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
    async getDeviationHistory(
        routeId: string,
        schoolId: string,
        limit = 50,
    ) {
        return prisma.routeDeviationEvent.findMany({
            where: { routeId, schoolId },
            orderBy: { detectedAt: 'desc' },
            take: limit,
        });
    }
}
