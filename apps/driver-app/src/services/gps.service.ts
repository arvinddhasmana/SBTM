import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import api from './api.service';
import { LocationPoint } from '../types';
import { OfflineQueueService } from './offline-queue.service';

const BACKGROUND_LOCATION_TASK = 'sbtm-background-gps';

let locationSubscription: Location.LocationSubscription | null = null;

// Module-level state for the background task to access route context
let _routeId = '';
let _vehicleId = '';
let _driverId = '';

async function postLocation(endpoint: string, payload: unknown): Promise<void> {
  await api.post(endpoint, payload);
}

function buildPayload(coords: Location.LocationObjectCoords, timestamp: number) {
  const point: LocationPoint = {
    lat: coords.latitude,
    lng: coords.longitude,
    timestamp: new Date(timestamp).toISOString(),
    speedKph: (coords.speed || 0) * 3.6,
    headingDeg: coords.heading || 0,
    accuracyMeters: coords.accuracy || 0,
  };
  return { vehicleId: _vehicleId, routeId: _routeId, driverId: _driverId, ...point };
}

async function sendOrBuffer(body: Record<string, unknown>): Promise<void> {
  try {
    await api.post('/routes/locations', body);
  } catch (error) {
    console.error('Failed to send GPS location, buffering for retry', error);
    await OfflineQueueService.enqueue('gps', '/routes/locations', body);
  }
}

// Register the background location task at module scope (required by expo-task-manager)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background GPS task error:', error.message);
    return;
  }
  if (!data || !_routeId) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  for (const location of locations) {
    const body = buildPayload(location.coords, location.timestamp);
    console.log('Background GPS Update:', body);
    await sendOrBuffer(body);
  }
});

export const GPSService = {
  requestPermissions: async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      throw new Error('Permission to access location was denied');
    }

    // Request background location for tracking while screen is off
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('Background location denied – GPS will pause when app is minimized');
    }
    return { foreground: fgStatus === 'granted', background: bgStatus === 'granted' };
  },

  startTracking: async (routeId: string, vehicleId: string, driverId: string) => {
    // Store context for background task
    _routeId = routeId;
    _vehicleId = vehicleId;
    _driverId = driverId;

    // Stop any existing tracking
    await GPSService.stopTracking();

    // Flush any previously buffered GPS events
    await OfflineQueueService.flush(postLocation);

    // Try to start background location (survives screen-off)
    const bgPermission = await Location.getBackgroundPermissionsAsync();
    if (bgPermission.status === 'granted') {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'SBTM Driver',
          notificationBody: `Tracking route in progress`,
          notificationColor: '#007AFF',
        },
      });
      console.log('Background GPS tracking started');
      return;
    }

    // Fallback: foreground-only tracking
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      async (location) => {
        const body = buildPayload(location.coords, location.timestamp);
        console.log('Foreground GPS Update:', body);
        await sendOrBuffer(body);
      },
    );
  },

  stopTracking: async () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    const isRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background GPS tracking stopped');
    }

    _routeId = '';
    _vehicleId = '';
    _driverId = '';
  },

  getCurrentLocation: async () => {
    return await Location.getCurrentPositionAsync({});
  },

  /** Flush buffered GPS events. Call when network connectivity is restored. */
  flushOfflineQueue: async () => {
    await OfflineQueueService.flush(postLocation);
  },
};
