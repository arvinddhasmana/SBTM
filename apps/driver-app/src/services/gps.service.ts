import * as Location from 'expo-location';
import api from './api.service';
import { LocationPoint } from '../types';

let locationSubscription: Location.LocationSubscription | null = null;

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

                try {
                    await api.post('/locations', {
                        vehicleId,
                        routeId,
                        driverId,
                        ...point
                    });
                } catch (error) {
                    console.error('Failed to send GPS location', error);
                    // TODO: Implement offline buffering here
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
    }
};
