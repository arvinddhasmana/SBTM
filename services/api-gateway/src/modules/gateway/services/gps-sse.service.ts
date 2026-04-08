import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import IORedis from 'ioredis';

/** Shape of the raw payload published to the Redis channel by gps-tracking. */
export interface GpsLocationPayload {
  vehicleId: string;
  routeId: string;
  lat: number;
  lng: number;
  speedKph?: number;
  headingDeg?: number;
  timestamp: string;
}

/** Shape emitted on the SSE stream — mirrors LiveLocationResponse in the parent app. */
export interface GpsLocationEvent {
  routeId: string;
  vehicleId: string;
  lastUpdate: string;
  position: { lat: number; lng: number };
  speedKph?: number;
  headingDeg?: number;
}

/**
 * GpsSseService
 *
 * Subscribes to the Redis Pub/Sub channel `gps:location-updated` (published by
 * gps-tracking after every location ingest) and fans out typed SSE events to
 * per-route subscriber sets.
 *
 * Tenant isolation: the SSE endpoint in GpsController calls
 * GpsGatewayService.checkRouteAccess() before creating a subscription, so only
 * routes the authenticated user can access are connected.
 */
@Injectable()
export class GpsSseService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(GpsSseService.name);
  private subscriber: IORedis | null = null;

  /** routeId → set of active SSE subjects for that route */
  private readonly routeSubjects = new Map<
    string,
    Set<Subject<MessageEvent>>
  >();

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap(): void {
    const host = this.configService.get<string>('redisHost', 'localhost');
    const port = this.configService.get<number>('redisPort', 6379);

    this.subscriber = new IORedis(port, host, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    this.subscriber.on('error', (err: Error) => {
      this.logger.warn(`GPS SSE Redis subscriber error: ${err.message}`);
    });

    this.subscriber.subscribe('gps:location-updated').catch((err: Error) => {
      this.logger.warn(
        `Failed to subscribe to gps:location-updated: ${err.message}`,
      );
    });

    this.subscriber.on('message', (_channel: string, message: string) => {
      this.handleLocationMessage(message);
    });

    this.logger.log('GPS SSE subscriber initialised');
  }

  onApplicationShutdown(): void {
    this.subscriber?.disconnect();
    this.logger.log('GPS SSE subscriber disconnected');
  }

  /**
   * Returns an Observable that emits GPS location events for the given route.
   * The Observable completes automatically when the client disconnects (NestJS
   * unsubscribes the underlying subscription via RxJS teardown).
   */
  getStream(routeId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const subject = new Subject<MessageEvent>();

      if (!this.routeSubjects.has(routeId)) {
        this.routeSubjects.set(routeId, new Set());
      }
      this.routeSubjects.get(routeId)!.add(subject);

      const subscription = subject.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        this.removeSubject(routeId, subject);
        subject.complete();
        this.logger.debug(`GPS SSE client disconnected for route ${routeId}`);
      };
    });
  }

  /** Exposed for testing — simulates a Redis Pub/Sub message arriving. */
  handleLocationMessage(raw: string): void {
    let payload: GpsLocationPayload;
    try {
      payload = JSON.parse(raw) as GpsLocationPayload;
    } catch {
      return; // silently drop unparseable messages
    }

    const subjects = this.routeSubjects.get(payload.routeId);
    if (!subjects || subjects.size === 0) return;

    const event: GpsLocationEvent = {
      routeId: payload.routeId,
      vehicleId: payload.vehicleId,
      lastUpdate: payload.timestamp,
      position: { lat: payload.lat, lng: payload.lng },
      ...(payload.speedKph !== undefined && { speedKph: payload.speedKph }),
      ...(payload.headingDeg !== undefined && {
        headingDeg: payload.headingDeg,
      }),
    };

    const sseMessage: MessageEvent = { data: event };

    subjects.forEach((subject) => {
      if (!subject.closed) subject.next(sseMessage);
    });
  }

  private removeSubject(routeId: string, subject: Subject<MessageEvent>): void {
    const subjects = this.routeSubjects.get(routeId);
    if (!subjects) return;
    subjects.delete(subject);
    if (subjects.size === 0) this.routeSubjects.delete(routeId);
  }
}
