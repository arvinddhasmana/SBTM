import { Queue } from 'bullmq';
import IORedis from 'ioredis';

/**
 * GPS Event Publisher
 *
 * Publishes domain events to the `gps` BullMQ queue after each location ingest.
 * Consumers (geofencing, analytics, notification processors) subscribe to this queue.
 *
 * Event payload is intentionally T3 — contains route/vehicle/position data but
 * NO student names, guardian contacts, or other T4 PII.
 */

export interface LocationUpdatedPayload {
  vehicleId: string;
  routeId: string;
  schoolId: string;
  lat: number;
  lng: number;
  speedKph?: number;
  headingDeg?: number;
  accuracyMeters?: number;
  timestamp: string; // ISO 8601
}

export interface RouteDeviationPayload {
  vehicleId: string;
  routeId: string;
  schoolId: string;
  lat: number;
  lng: number;
  deviationMeters: number;
  threshold: number;
  timestamp: string;
}

let gpsQueue: Queue | null = null;
let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);

    redisConnection = new IORedis(port, host, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisConnection.on('error', (err: Error) => {
      // Log Redis errors without exposing sensitive details
      console.error('[gps-event-publisher] Redis connection error', {
        message: err.message,
        host,
        port,
      });
    });
  }

  return redisConnection;
}

function getGpsQueue(): Queue {
  if (!gpsQueue) {
    gpsQueue = new Queue('gps', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400 }, // 24 hours
        removeOnFail: { age: 604800 }, // 7 days
      },
    });
  }

  return gpsQueue;
}

export const gpsEventPublisher = {
  async publishLocationUpdated(payload: LocationUpdatedPayload): Promise<void> {
    // 1. Publish to BullMQ for async consumers (geofencing, analytics)
    try {
      await getGpsQueue().add('location.updated', payload, {
        jobId: `loc-${payload.vehicleId}-${payload.timestamp}`,
      });
    } catch {
      // Event publication should not block ingest — log and continue
      console.error('[gps-event-publisher] Failed to publish location.updated', {
        vehicleId: payload.vehicleId,
        routeId: payload.routeId,
        schoolId: payload.schoolId,
      });
    }

    // 2. Publish to Redis Pub/Sub for real-time SSE delivery to parent clients.
    //    Payload is T3 — route/vehicle/position data only, no T4 PII.
    try {
      await getRedisConnection().publish('gps:location-updated', JSON.stringify(payload));
    } catch {
      console.error('[gps-event-publisher] Failed to publish Redis Pub/Sub', {
        vehicleId: payload.vehicleId,
        routeId: payload.routeId,
      });
    }
  },

  async publishRouteDeviation(payload: RouteDeviationPayload): Promise<void> {
    try {
      await getGpsQueue().add('route.deviation', payload, {
        jobId: `dev-${payload.vehicleId}-${payload.timestamp}`,
      });
    } catch (err) {
      console.error('[gps-event-publisher] Failed to publish route.deviation', {
        vehicleId: payload.vehicleId,
        routeId: payload.routeId,
        schoolId: payload.schoolId,
      });
    }
  },

  /**
   * Close the Redis connection and queue gracefully.
   * Call this during service shutdown.
   */
  async close(): Promise<void> {
    if (gpsQueue) {
      await gpsQueue.close();
      gpsQueue = null;
    }
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
    }
  },
};
