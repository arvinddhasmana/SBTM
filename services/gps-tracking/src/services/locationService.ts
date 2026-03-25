import prisma from '../prisma';
import { CreateLocationDto } from '../types';
import { gpsEventPublisher } from './gpsEventPublisher';
import { GeofenceService } from './geofenceService';

const geofenceService = new GeofenceService();

export class LocationService {
    async ingestLocation(data: CreateLocationDto) {
        const point = await prisma.locationPoint.create({
            data: {
                schoolId: data.schoolId,
                vehicleId: data.vehicleId,
                routeId: data.routeId,
                timestamp: new Date(data.timestamp),
                lat: data.lat,
                lng: data.lng,
                speedKph: data.speedKph,
                headingDeg: data.headingDeg,
                accuracyMeters: data.accuracyMeters,
            },
        });

        // Publish domain event — fire-and-forget; failures are logged inside publisher
        void gpsEventPublisher.publishLocationUpdated({
            vehicleId: data.vehicleId,
            routeId: data.routeId,
            schoolId: data.schoolId,
            lat: data.lat,
            lng: data.lng,
            speedKph: data.speedKph,
            headingDeg: data.headingDeg,
            accuracyMeters: data.accuracyMeters,
            timestamp: data.timestamp,
        });

        // Run geofence deviation check — fire-and-forget; failures are logged inside service
        void geofenceService.checkDeviation({
            vehicleId: data.vehicleId,
            routeId: data.routeId,
            schoolId: data.schoolId,
            lat: data.lat,
            lng: data.lng,
            timestamp: data.timestamp,
        });

        return point;
    }

    async getLatestLocation(routeId: string, schoolId?: string) {
        const location = await prisma.locationPoint.findFirst({
            where: schoolId ? { routeId, schoolId } : { routeId },
            orderBy: { timestamp: 'desc' },
        });

        if (!location) return null;

        return {
            vehicleId: location.vehicleId,
            routeId: location.routeId,
            lastUpdate: location.timestamp,
            position: {
                lat: location.lat,
                lng: location.lng
            }
        };
    }

    async getRouteHistory(routeId: string, schoolId?: string) {
        return await prisma.locationPoint.findMany({
            where: schoolId ? { routeId, schoolId } : { routeId },
            orderBy: { timestamp: 'asc' },
        });
    }
}
