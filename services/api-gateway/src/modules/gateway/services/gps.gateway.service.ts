import { Injectable, ForbiddenException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '@sbtm/common';
import { DataSource } from 'typeorm';

export interface LiveLocationDto {
  /** false when the GPS service has no active location for this route yet (bus not started). */
  active?: boolean;
  routeId: string;
  vehicleId: string;
  lastUpdate: string;
  position: { lat: number; lng: number };
  etaToNextStopMinutes: number;
  deviationFlag?: boolean;
  status?: 'normal' | 'delay' | 'emergency';
}

export interface CreateLocationDto {
  vehicleId: string;
  routeId: string;
  timestamp: string;
  lat: number;
  lng: number;
  speedKph?: number;
  headingDeg?: number;
  accuracyMeters?: number;
  schoolId?: string;
}

export interface LocationHistoryQueryDto {
  from?: string;
  to?: string;
  granularity?: 'raw' | '1min' | '5min';
}

export interface RouteLifecycleEventDto {
  routeId: string;
  vehicleId: string;
  eventType: 'ROUTE_STARTED' | 'STOP_REACHED' | 'ROUTE_COMPLETED';
  timestamp: string;
  stopId?: string;
}

interface RequestUser {
  id: string;
  role: Role;
  childRouteIds?: string[];
  assignedRouteIds?: string[];
  schoolId?: string;
}

interface ReferenceRouteRow {
  id: string;
  name: string;
  vehicleId: string | null;
  driverId: string | null;
  schedule: any;
  polyline: string | null;
  schoolId: string | null;
  schoolName: string | null;
  schoolLat: number | null;
  schoolLng: number | null;
  direction: string | null;
}

interface ReferenceRouteStopRow {
  id: string;
  routeId: string;
  sequenceOrder: number;
  stopName: string;
  lat: number;
  lng: number;
  arrivalTime: string;
}

@Injectable()
export class GpsGatewayService {
  private readonly gpsServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.gpsServiceUrl = this.configService.get<string>(
      'GPS_SERVICE_URL',
      'http://localhost:3002',
    );
    this.presenceServiceUrl = this.configService.get<string>(
      'PRESENCE_SERVICE_URL',
      'http://localhost:3004',
    );
  }

  private readonly presenceServiceUrl: string;

  async getLiveLocation(
    routeId: string,
    user: RequestUser,
  ): Promise<LiveLocationDto> {
    this.checkRouteAccess(routeId, user);

    const url = `${this.gpsServiceUrl}/api/v1/routes/${routeId}/live-location`;

    let result: LiveLocationDto;
    try {
      result = await this.httpClient.get<LiveLocationDto>(url);
    } catch (e: unknown) {
      // GPS service returns 404 when the route has no active location data yet
      // (bus hasn't started its run). Convert to HTTP 200 { active: false } so the
      // parent app receives a clean response — 4xx responses always appear in the
      // browser console in red even when caught by JavaScript.
      if (e instanceof HttpException && e.getStatus() === 404) {
        return { active: false, routeId } as LiveLocationDto;
      }
      throw e;
    }

    // Enrich with alert-based status — include all operationally active statuses,
    // not just 'ACTIVE'. TIER_1 events (PANIC_BUTTON, INCIDENT) start as
    // PENDING_CONFIRMATION and must still change bus color for parents.
    try {
      const alertRows = (await this.dataSource.query(
        `SELECT "eventType" FROM emergency_alert WHERE "routeId" = $1 AND status IN ('ACTIVE', 'PENDING_CONFIRMATION', 'CONFIRMED', 'AUTO_ESCALATED')`,
        [routeId],
      )) as Array<{ eventType: string }>;
      const EMERGENCY_TYPES = new Set([
        'PANIC_BUTTON',
        'PANIC_ALERT',
        'INCIDENT',
      ]);
      if (alertRows.length === 0) {
        result.status = 'normal';
      } else if (alertRows.some((r) => EMERGENCY_TYPES.has(r.eventType))) {
        result.status = 'emergency';
      } else {
        result.status = 'delay';
      }
    } catch {
      result.status = 'normal';
    }

    return result;
  }

  async getLocationHistory(
    routeId: string,
    query: LocationHistoryQueryDto,
    user: RequestUser,
  ): Promise<unknown> {
    this.checkRouteAccess(routeId, user);

    const params = new URLSearchParams();
    if (query.from) params.append('from', query.from);
    if (query.to) params.append('to', query.to);
    if (query.granularity) params.append('granularity', query.granularity);

    const url = `${this.gpsServiceUrl}/api/v1/routes/${routeId}/history?${params.toString()}`;
    return this.httpClient.get(url);
  }

  async ingestLocation(
    dto: CreateLocationDto,
    user: RequestUser,
  ): Promise<{ status: string }> {
    if (
      !user.schoolId &&
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.ADMIN &&
      user.role !== Role.OSTA_ADMIN
    ) {
      throw new ForbiddenException('School ID is required to ingest locations');
    }

    const url = `${this.gpsServiceUrl}/api/v1/locations`;
    return this.httpClient.post<{ status: string }>(url, {
      ...dto,
      schoolId: user.schoolId,
    });
  }

  async recordRouteLifecycleEvent(
    dto: RouteLifecycleEventDto,
    user: RequestUser,
  ): Promise<{ status: string }> {
    if (
      user.role !== Role.DRIVER &&
      user.role !== Role.ADMIN &&
      user.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only drivers can record route lifecycle events',
      );
    }

    if (
      user.role === Role.DRIVER &&
      !user.assignedRouteIds?.includes(dto.routeId)
    ) {
      throw new ForbiddenException(
        'You can only record lifecycle events for your assigned routes',
      );
    }

    if (!user.schoolId) {
      throw new ForbiddenException('School context required');
    }

    const url = `${this.gpsServiceUrl}/api/v1/routes/lifecycle`;
    // schoolId always from authenticated user – never from client body
    return this.httpClient.post<{ status: string }>(url, {
      schoolId: user.schoolId,
      routeId: dto.routeId,
      vehicleId: dto.vehicleId,
      driverId: user.id,
      eventType: dto.eventType,
      timestamp: dto.timestamp,
      stopId: dto.stopId,
    });
  }

  checkRouteAccess(routeId: string, user: RequestUser): void {
    // System admins can access all routes
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.ADMIN ||
      user.role === Role.OSTA_ADMIN ||
      user.role === Role.BOARD_ADMIN ||
      user.role === Role.SCHOOL_ADMIN
    ) {
      return;
    }

    // Parents can only access their children's routes
    if (user.role === Role.PARENT) {
      if (!user.childRouteIds?.includes(routeId)) {
        throw new ForbiddenException('You do not have access to this route');
      }
      return;
    }

    // Drivers can only access their assigned routes
    if (user.role === Role.DRIVER) {
      if (!user.assignedRouteIds?.includes(routeId)) {
        throw new ForbiddenException('You do not have access to this route');
      }
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  async getActiveRoutes(user: RequestUser): Promise<any[]> {
    const routeIds = this.getAccessibleRouteIds(user);

    const whereClause =
      routeIds && routeIds.length ? 'WHERE r.id = ANY($1)' : '';
    const params: any[] = routeIds && routeIds.length ? [routeIds] : [];

    const routes = (await this.dataSource.query(
      `SELECT r.id, r.name, r."vehicleId" as "vehicleId", r.schedule, r.polyline,
              r."schoolId" as "schoolId", r.direction, s.name as "schoolName",
              s.lat as "schoolLat", s.lng as "schoolLng"
             FROM routes_reference r
             LEFT JOIN schools s ON r."schoolId" = s.id
             ${whereClause}
             ORDER BY r.id ASC`,
      params,
    )) as ReferenceRouteRow[];

    // Filter to only routes that are currently in-progress (not completed)
    const allRouteIds = routes.map((r) => r.id);
    let activeRouteIds: Set<string>;
    if (allRouteIds.length > 0) {
      const lifecycleRows = (await this.dataSource.query(
        `SELECT DISTINCT ON (route_id) route_id as "routeId", event_type as "eventType"
               FROM route_lifecycle_events
               WHERE route_id = ANY($1)
               ORDER BY route_id, timestamp DESC`,
        [allRouteIds],
      )) as Array<{ routeId: string; eventType: string }>;
      activeRouteIds = new Set(
        lifecycleRows
          .filter((e) => e.eventType !== 'ROUTE_COMPLETED')
          .map((e) => e.routeId),
      );
    } else {
      activeRouteIds = new Set();
    }

    const activeRoutes = routes.filter((r) => activeRouteIds.has(r.id));

    const stops = (await this.dataSource.query(
      `SELECT s.id, s."routeId" as "routeId", s."sequenceOrder" as "sequenceOrder", s."stopName" as "stopName", s.lat, s.lng, s."arrivalTime" as "arrivalTime"
             FROM route_stops_reference s`,
    )) as ReferenceRouteStopRow[];

    const stopsByRoute = new Map<string, ReferenceRouteStopRow[]>();
    for (const stop of stops) {
      const list = stopsByRoute.get(stop.routeId) ?? [];
      list.push(stop);
      stopsByRoute.set(stop.routeId, list);
    }

    return activeRoutes.map((r) => {
      const schedule =
        typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule;
      const startTime = schedule?.startTime || '07:30';
      const routeStops = (stopsByRoute.get(r.id) ?? [])
        .slice()
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
        .map((s) => ({
          id: s.id,
          routeId: r.id,
          sequence: s.sequenceOrder,
          address: s.stopName,
          location: `POINT(${s.lng} ${s.lat})`,
        }));

      const direction =
        r.direction || (r.id.toUpperCase().includes('PM') ? 'PM' : 'AM');

      return {
        id: r.id,
        name: r.name,
        schoolId: r.schoolId || user.schoolId,
        schoolName: r.schoolName || 'Unknown School',
        schoolLat: r.schoolLat || undefined,
        schoolLng: r.schoolLng || undefined,
        direction,
        vehicleId: r.vehicleId || undefined,
        startTime,
        estimatedDuration: 60,
        stops: routeStops,
        status: 'active',
        polyline: r.polyline || undefined,
      };
    });
  }

  async getReferenceRouteById(
    routeId: string,
    user: RequestUser,
  ): Promise<any> {
    this.checkRouteAccess(routeId, user);

    const routes = (await this.dataSource.query(
      `SELECT r.id, r.name, r."vehicleId" as "vehicleId", r.schedule, r.polyline,
              r."schoolId" as "schoolId", r.direction, s.name as "schoolName",
              s.lat as "schoolLat", s.lng as "schoolLng"
             FROM routes_reference r
             LEFT JOIN schools s ON r."schoolId" = s.id
             WHERE r.id = $1`,
      [routeId],
    )) as ReferenceRouteRow[];

    if (routes.length === 0) {
      const { NotFoundException } = require('@nestjs/common');
      throw new NotFoundException('Reference route not found');
    }

    const r = routes[0];

    const stops = (await this.dataSource.query(
      `SELECT s.id, s."routeId" as "routeId", s."sequenceOrder" as "sequenceOrder", s."stopName" as "stopName", s.lat, s.lng, s."arrivalTime" as "arrivalTime"
             FROM route_stops_reference s
             WHERE s."routeId" = $1`,
      [routeId],
    )) as ReferenceRouteStopRow[];

    const schedule =
      typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule;
    const startTime = schedule?.startTime || '07:30';
    const routeStops = stops
      .slice()
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map((s) => ({
        id: s.id,
        routeId: r.id,
        sequence: s.sequenceOrder,
        address: s.stopName,
        location: `POINT(${s.lng} ${s.lat})`,
      }));

    const direction =
      r.direction || (r.id.toUpperCase().includes('PM') ? 'PM' : 'AM');

    return {
      id: r.id,
      name: r.name,
      schoolId: r.schoolId || user.schoolId,
      schoolName: r.schoolName || 'Unknown School',
      schoolLat: r.schoolLat || undefined,
      schoolLng: r.schoolLng || undefined,
      direction,
      vehicleId: r.vehicleId || undefined,
      startTime,
      estimatedDuration: 60,
      stops: routeStops,
      status: 'active',
      polyline: r.polyline || undefined,
    };
  }

  async getAllLiveLocations(user: RequestUser): Promise<LiveLocationDto[]> {
    const routeIds = this.getAccessibleRouteIds(user);

    const whereClause =
      routeIds && routeIds.length ? 'WHERE r.id = ANY($1)' : '';
    const params: any[] = routeIds && routeIds.length ? [routeIds] : [];

    const routes = (await this.dataSource.query(
      `SELECT r.id FROM routes_reference r ${whereClause} ORDER BY r.id ASC`,
      params,
    )) as Array<{ id: string }>;

    const results: LiveLocationDto[] = [];
    for (const r of routes) {
      try {
        const live = await this.getLiveLocation(r.id, user);
        results.push(live);
      } catch {
        // Ignore per-route failures; demo UI will just omit that marker
      }
    }

    // Enrich with alert-based status: check active alerts per route
    if (results.length > 0) {
      try {
        const activeRouteIds = results.map((r) => r.routeId);
        const alertRows = (await this.dataSource.query(
          `SELECT "routeId", "eventType" FROM emergency_alert WHERE "routeId" = ANY($1) AND status IN ('ACTIVE', 'PENDING_CONFIRMATION', 'CONFIRMED', 'AUTO_ESCALATED')`,
          [activeRouteIds],
        )) as Array<{ routeId: string; eventType: string }>;

        const routeAlertMap = new Map<string, string[]>();
        for (const row of alertRows) {
          const existing = routeAlertMap.get(row.routeId) || [];
          existing.push(row.eventType);
          routeAlertMap.set(row.routeId, existing);
        }

        const EMERGENCY_TYPES = new Set([
          'PANIC_BUTTON',
          'PANIC_ALERT',
          'INCIDENT',
        ]);
        for (const loc of results) {
          const alertTypes = routeAlertMap.get(loc.routeId);
          if (!alertTypes || alertTypes.length === 0) {
            loc.status = 'normal';
          } else if (alertTypes.some((t) => EMERGENCY_TYPES.has(t))) {
            loc.status = 'emergency';
          } else {
            loc.status = 'delay';
          }
        }
      } catch {
        // If alert enrichment fails, default to normal
        for (const loc of results) {
          loc.status = loc.status || 'normal';
        }
      }
    }

    return results;
  }

  async getRouteStudents(routeId: string, user: RequestUser): Promise<unknown> {
    this.checkRouteAccess(routeId, user);
    const url = `${this.presenceServiceUrl}/api/v1/routes/${routeId}/students${user.schoolId ? `?schoolId=${user.schoolId}` : ''}`;
    return this.httpClient.get(url);
  }

  private getAccessibleRouteIds(user: RequestUser): string[] | undefined {
    if (user.role === Role.PARENT) return user.childRouteIds || [];
    if (user.role === Role.DRIVER) return user.assignedRouteIds || [];

    // Admin roles: see all seeded reference routes
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.ADMIN ||
      user.role === Role.OSTA_ADMIN ||
      user.role === Role.BOARD_ADMIN ||
      user.role === Role.SCHOOL_ADMIN
    ) {
      return undefined;
    }

    return undefined;
  }
}
