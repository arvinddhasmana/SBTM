import prisma from '../prisma';
import { CreateLocationDto } from '../types';

export class LocationService {
    async ingestLocation(data: CreateLocationDto) {
        return await prisma.locationPoint.create({
            data: {
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
    }

    async getLatestLocation(routeId: string) {
        const location = await prisma.locationPoint.findFirst({
            where: { routeId },
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

    async getRouteHistory(routeId: string) {
        return await prisma.locationPoint.findMany({
            where: { routeId },
            orderBy: { timestamp: 'asc' },
        });
    }
}
