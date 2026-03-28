import prisma from '../prisma';
import { CreateLocationDto } from '../types';
import { gpsEventPublisher } from './gpsEventPublisher';
import { GeofenceService } from './geofenceService';
import { OsrmService } from './osrmService';

const geofenceService = new GeofenceService();
const osrmService = new OsrmService();

export class LocationService {
    async ingestLocation(data: CreateLocationDto) {
        // Snap to road
        const snapped = await osrmService.snapToRoad(data.lat, data.lng);

        const point = await prisma.locationPoint.create({
            data: {
                schoolId: data.schoolId,
                vehicleId: data.vehicleId,
                routeId: data.routeId,
                timestamp: new Date(data.timestamp),
                lat: data.lat,
                lng: data.lng,
                snappedLat: snapped?.lat,
                snappedLng: snapped?.lng,
                speedKph: data.speedKph,
                headingDeg: data.headingDeg,
                accuracyMeters: data.accuracyMeters,
            },
        });

        // Publish domain event using snapped coordinates if available
        void gpsEventPublisher.publishLocationUpdated({
            vehicleId: data.vehicleId,
            routeId: data.routeId,
            schoolId: data.schoolId,
            lat: snapped?.lat ?? data.lat,
            lng: snapped?.lng ?? data.lng,
            speedKph: data.speedKph,
            headingDeg: data.headingDeg,
            accuracyMeters: data.accuracyMeters,
            timestamp: data.timestamp,
        });

        // Run geofence deviation check using snapped coordinates if available
        void geofenceService.checkDeviation({
            vehicleId: data.vehicleId,
            routeId: data.routeId,
            schoolId: data.schoolId,
            lat: snapped?.lat ?? data.lat,
            lng: snapped?.lng ?? data.lng,
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
                lat: location.snappedLat ?? location.lat,
                lng: location.snappedLng ?? location.lng
            }
        };
    }

    async getRouteHistory(routeId: string, schoolId?: string) {
        const history = await prisma.locationPoint.findMany({
            where: schoolId ? { routeId, schoolId } : { routeId },
            orderBy: { timestamp: 'asc' },
        });

        return history.map(point => ({
            ...point,
            lat: point.snappedLat ?? point.lat,
            lng: point.snappedLng ?? point.lng,
            rawLat: point.lat,
            rawLng: point.lng
        }));
    }
}
