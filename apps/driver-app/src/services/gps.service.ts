import * as Location from 'expo-location';
import api from './api.service';
import { LocationPoint } from '../types';
import { OfflineQueueService } from './offline-queue.service';

let locationSubscription: Location.LocationSubscription | null = null;

async function postLocation(endpoint: string, payload: unknown): Promise<void> {
    await api.post(endpoint, payload);
}

export const GPSService = {
    requestPermissions: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permission to access location was denied');
        }
        // For background:
        // const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    },

    startTracking: async (routeId: string, vehicleId: string, driverId: string) => {
        // Stop any existing tracking
        if (locationSubscription) {
            locationSubscription.remove();
        }

        // Flush any previously buffered GPS events now that we're online
        await OfflineQueueService.flush(postLocation);

        locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000, // 5 seconds
                distanceInterval: 10, // 10 meters
            },
            async (location) => {
                const point: LocationPoint = {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                    timestamp: new Date(location.timestamp).toISOString(),
                    speedKph: (location.coords.speed || 0) * 3.6, // m/s to kph
                    headingDeg: location.coords.heading || 0,
                    accuracyMeters: location.coords.accuracy || 0,
                };

                console.log('GPS Update:', point);

                const body = { vehicleId, routeId, driverId, ...point };

                try {
                    await api.post('/routes/locations', body);
                } catch (error) {
                    console.error('Failed to send GPS location, buffering for retry', error);
                    await OfflineQueueService.enqueue('gps', '/routes/locations', body);
                }
            }
        );
    },

    stopTracking: () => {
        if (locationSubscription) {
            locationSubscription.remove();
            locationSubscription = null;
        }
    },

    getCurrentLocation: async () => {
        return await Location.getCurrentPositionAsync({});
    },

    /** Flush buffered GPS events. Call when network connectivity is restored. */
    flushOfflineQueue: async () => {
        await OfflineQueueService.flush(postLocation);
    },
};
