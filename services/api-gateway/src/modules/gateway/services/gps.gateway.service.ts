import {
  Injectable,
  ForbiddenException,
  HttpException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@sbtm/common';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { RlsContextService } from '../../../common/services/rls-context.service';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { schoolIdFromAnchor } from '../../auth/utils/anchor-scope';

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

interface ActiveRouteRow {
  route_id: string;
  route_name: string;
  vehicle_id: string | null;
  start_time: string | null;
  school_id: string | null;
  school_name: string | null;
  school_lat: number | null;
  school_lng: number | null;
  direction: string;
}

interface RouteStopRow {
  route_id: string;
  stop_id: string;
  stop_sequence: number;
  stop_name: string;
  stop_lat: number | null;
  stop_lon: number | null;
  arrival_time: string;
  stop_kind: string | null;
}

/**
 * v2 GPS gateway. Forwards live-location / lifecycle calls to the
 * `gps-tracking` service (which still owns the live-position store and the
 * lifecycle event log), and resolves accessible-route lists server-side from
 * the v2 anchor model — parents via `stx_student_guardians` → `stx_ridership`
 * → `trips`, drivers via `stx_runs` for today. The v1 JWT fields
 * `childRouteIds` / `assignedRouteIds` / `schoolId` are gone in v2; the JWT
 * carries only `anchorKind` + `anchorId`.
 *
 * Active-route filter: `stx_runs` rows where `service_date = today` and
 * `status NOT IN ('completed','cancelled')`. Lifecycle events flow through
 * `gps-tracking` and the gateway forwards verbatim — this gateway does not
 * write `stx_runs.status` directly.
 *
 * Alert status enrichment: queries `stx_alerts` for `scope_kind='route'`
 * matching the route id; `category='safety'` → `emergency`, any other active
 * route-scoped alert → `delay`, otherwise `normal`. v1 `emergency_alert` table
 * is gone.
 */
@Injectable()
export class GpsGatewayService {
  private readonly logger = new Logger(GpsGatewayService.name);
  private readonly gpsServiceUrl: string;
  private readonly presenceServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly rlsContext: RlsContextService,
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

  async getLiveLocation(
    routeId: string,
    user: AuthenticatedUser,
  ): Promise<LiveLocationDto> {
    await this.checkRouteAccess(routeId, user);

    const url = `${this.gpsServiceUrl}/api/v1/routes/${routeId}/live-location`;

    let result: LiveLocationDto;
    try {
      result = await this.httpClient.get<LiveLocationDto>(url);
    } catch (e: unknown) {
      // GPS service returns 404 when the route has no active location data yet
      // (bus hasn't started its run). Convert to HTTP 200 { active: false } so
      // the parent app receives a clean response — 4xx responses always appear
      // in the browser console in red even when caught.
      if (e instanceof HttpException && e.getStatus() === 404) {
        return { active: false, routeId } as LiveLocationDto;
      }
      throw e;
    }

    result.status = await this.deriveAlertStatus(routeId);
    return result;
  }

  async getLocationHistory(
    routeId: string,
    query: LocationHistoryQueryDto,
    user: AuthenticatedUser,
  ): Promise<unknown> {
    await this.checkRouteAccess(routeId, user);

    const params = new URLSearchParams();
    if (query.from) params.append('from', query.from);
    if (query.to) params.append('to', query.to);
    if (query.granularity) params.append('granularity', query.granularity);

    const url = `${this.gpsServiceUrl}/api/v1/routes/${routeId}/history?${params.toString()}`;
    return this.httpClient.get(url);
  }

  async ingestLocation(
    dto: CreateLocationDto,
    user: AuthenticatedUser,
  ): Promise<{ status: string }> {
    // SUPER/STA ingest cross-school; DRIVER ingests for their own route
    // (DRIVER anchors at 'driver' kind, not 'school'); SCHOOL_ADMIN ingests
    // scoped to their school. Any other anchor (board / parent / operator)
    // is rejected.
    let schoolId = schoolIdFromAnchor(user);
    const allowed =
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.STA_ADMIN ||
      user.role === Role.DRIVER ||
      schoolId !== null;
    if (!allowed) {
      throw new ForbiddenException('Caller cannot ingest GPS locations');
    }

    // DRIVER/SUPER/STA users do not anchor at a school — resolve schoolId from
    // the route so the GPS service can scope the location point correctly.
    if (!schoolId && dto.routeId) {
      schoolId = await this.getSchoolIdForRoute(dto.routeId);
    }

    const url = `${this.gpsServiceUrl}/api/v1/locations`;
    return this.httpClient.post<{ status: string }>(url, {
      ...dto,
      ...(schoolId ? { schoolId } : {}),
    });
  }

  /**
   * Forwards a dedicated GPS hardware device location payload to the GPS service.
   * The deviceBearerToken is extracted from the client's Authorization header
   * and forwarded verbatim — the GPS service performs all device token
   * validation, GPS source enforcement, and route resolution.
   */
  async ingestDeviceLocation(
    payload: {
      timestamp: string;
      lat: number;
      lng: number;
      speedKph?: number;
      headingDeg?: number;
      accuracyMeters?: number;
    },
    deviceBearerToken: string,
  ): Promise<{ status: string }> {
    const url = `${this.gpsServiceUrl}/api/v1/device-locations`;
    return this.httpClient.post<{ status: string }>(url, payload, {
      headers: { Authorization: `Bearer ${deviceBearerToken}` },
    });
  }

  async recordRouteLifecycleEvent(
    dto: RouteLifecycleEventDto,
    user: AuthenticatedUser,
  ): Promise<{ status: string }> {
    if (
      user.role !== Role.DRIVER &&
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.STA_ADMIN
    ) {
      throw new ForbiddenException(
        'Only drivers can record route lifecycle events',
      );
    }

    if (user.role === Role.DRIVER) {
      // Throws ForbiddenException if the route is not on a run assigned to this
      // driver for today.
      await this.checkRouteAccess(dto.routeId, user);
    }

    const schoolId = await this.getSchoolIdForRoute(dto.routeId);

    const url = `${this.gpsServiceUrl}/api/v1/routes/lifecycle`;
    return this.httpClient.post<{ status: string }>(url, {
      routeId: dto.routeId,
      vehicleId: dto.vehicleId,
      driverId: user.id,
      schoolId: schoolId ?? '',
      eventType: dto.eventType,
      timestamp: dto.timestamp,
      stopId: dto.stopId,
    });
  }

  private async getSchoolIdForRoute(routeId: string): Promise<string | null> {
    try {
      const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
        tx.query(
          `SELECT s.id::text AS school_id
           FROM routes r
           LEFT JOIN stx_schools s ON s.id = r.stx_school_id
           WHERE r.route_id = $1
             AND r.deleted_at IS NULL
           LIMIT 1`,
          [routeId],
        ),
      )) as Array<{ school_id: string | null }>;
      return rows[0]?.school_id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Throws ForbiddenException when the caller cannot access the given route.
   *
   * Admin roles (SUPER/STA/BOARD/SCHOOL) are short-circuited. Parents are
   * authorised iff at least one of their guarded students has active
   * ridership on this route today. Drivers are authorised iff one of their
   * runs for today references a trip on this route.
   *
   * Async because v2 has no per-user cached route list — the v1 fields
   * `childRouteIds` / `assignedRouteIds` were dropped with the JWT shape change.
   */
  async checkRouteAccess(
    routeId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.STA_ADMIN ||
      user.role === Role.BOARD_ADMIN ||
      user.role === Role.SCHOOL_ADMIN
    ) {
      return;
    }

    if (user.role === Role.PARENT) {
      if (user.anchorKind !== 'parent' || !user.anchorId) {
        throw new ForbiddenException('Parent is not anchored to a guardian');
      }
      const today = new Date().toISOString().slice(0, 10);
      const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
        tx.query(
          `SELECT 1
           FROM stx_student_guardians sg
           JOIN stx_ridership rd ON rd.student_id = sg.student_id
           JOIN trips t ON t.trip_id = rd.trip_id
           WHERE sg.guardian_id = $1
             AND t.route_id = $2
             AND rd.status = 'active'
             AND rd.effective_from <= $3::date
             AND (rd.effective_to IS NULL OR rd.effective_to >= $3::date)
           LIMIT 1`,
          [user.anchorId, routeId, today],
        ),
      )) as unknown[];
      if (rows.length === 0) {
        throw new ForbiddenException('You do not have access to this route');
      }
      return;
    }

    if (user.role === Role.DRIVER) {
      if (user.anchorKind !== 'driver' || !user.anchorId) {
        throw new ForbiddenException('Driver is not anchored');
      }
      const today = new Date().toISOString().slice(0, 10);
      const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
        tx.query(
          `SELECT 1
           FROM stx_runs run
           JOIN trips t ON t.trip_id = ANY(run.trip_ids)
           WHERE run.driver_id = $1
             AND run.service_date = $2::date
             AND run.deleted_at IS NULL
             AND t.route_id = $3
           LIMIT 1`,
          [user.anchorId, today, routeId],
        ),
      )) as unknown[];
      if (rows.length === 0) {
        throw new ForbiddenException('You do not have access to this route');
      }
      return;
    }

    throw new ForbiddenException('Access denied');
  }

  async getActiveRoutes(user: AuthenticatedUser): Promise<unknown[]> {
    const routeIds = await this.getAccessibleRouteIds(user);
    // routeIds === undefined  → no app-layer filter (admin: all)
    // routeIds === []         → empty result set (parent/driver with nothing today)
    if (routeIds !== undefined && routeIds.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);
    const filterByRouteIds = routeIds !== undefined && routeIds.length > 0;
    const params: unknown[] = filterByRouteIds ? [today, routeIds] : [today];
    const whereClause = filterByRouteIds ? 'AND r.route_id = ANY($2)' : '';

    return this.rlsContext.runAsCurrent(async (tx) => {
      const rows = (await tx.query(
        `
        SELECT
          r.route_id,
          COALESCE(r.route_long_name, r.route_short_name, r.route_id) AS route_name,
          run.vehicle_id::text       AS vehicle_id,
          MIN(st.arrival_time)::text AS start_time,
          s.id::text                 AS school_id,
          s.name                     AS school_name,
          ST_Y(s.location::geometry) AS school_lat,
          ST_X(s.location::geometry) AS school_lng,
          COALESCE(r.stx_direction_kind::text, '') AS direction
        FROM stx_runs run
        JOIN trips t        ON t.trip_id = ANY(run.trip_ids)
        JOIN routes r       ON r.route_id = t.route_id
        LEFT JOIN stop_times st ON st.trip_id = t.trip_id
        LEFT JOIN stx_schools s ON s.id = r.stx_school_id
        WHERE run.service_date = $1::date
          AND run.deleted_at   IS NULL
          AND run.status       = 'in_progress'
          AND r.deleted_at     IS NULL
          ${whereClause}
        GROUP BY r.route_id, r.route_long_name, r.route_short_name,
                 r.stx_direction_kind, run.vehicle_id, s.id, s.name, s.location
        ORDER BY r.route_id ASC
        `,
        params,
      )) as ActiveRouteRow[];

      if (rows.length === 0) return [];

      const stopRows = (await tx.query(
        `
        SELECT DISTINCT ON (t.route_id, st.stop_id)
          t.route_id          AS route_id,
          st.stop_id          AS stop_id,
          st.stop_sequence    AS stop_sequence,
          s.stop_name         AS stop_name,
          s.stop_lat          AS stop_lat,
          s.stop_lon          AS stop_lon,
          st.arrival_time     AS arrival_time,
          s.stx_stop_kind::text AS stop_kind
        FROM stop_times st
        JOIN trips t ON t.trip_id = st.trip_id
        JOIN stops s ON s.stop_id = st.stop_id
        WHERE t.route_id = ANY($1)
        ORDER BY t.route_id, st.stop_id, st.stop_sequence
        `,
        [rows.map((r) => r.route_id)],
      )) as RouteStopRow[];

      const stopsByRoute = new Map<string, RouteStopRow[]>();
      for (const s of stopRows) {
        const list = stopsByRoute.get(s.route_id) ?? [];
        list.push(s);
        stopsByRoute.set(s.route_id, list);
      }

      return rows.map((r) =>
        this.buildRouteSummary(r, stopsByRoute.get(r.route_id) ?? []),
      );
    });
  }

  async getReferenceRouteById(
    routeId: string,
    user: AuthenticatedUser,
  ): Promise<unknown> {
    await this.checkRouteAccess(routeId, user);

    return this.rlsContext.runAsCurrent(async (tx) => {
      const rows = (await tx.query(
        `
        SELECT
          r.route_id,
          COALESCE(r.route_long_name, r.route_short_name, r.route_id) AS route_name,
          s.id::text                 AS school_id,
          s.name                     AS school_name,
          ST_Y(s.location::geometry) AS school_lat,
          ST_X(s.location::geometry) AS school_lng,
          COALESCE(r.stx_direction_kind::text, '') AS direction
        FROM routes r
        LEFT JOIN stx_schools s ON s.id = r.stx_school_id
        WHERE r.route_id = $1
          AND r.deleted_at IS NULL
        `,
        [routeId],
      )) as Array<Omit<ActiveRouteRow, 'vehicle_id' | 'start_time'>>;

      if (rows.length === 0) {
        throw new NotFoundException('Reference route not found');
      }

      const r = rows[0];

      const stopRows = (await tx.query(
        `
        SELECT DISTINCT ON (st.stop_id)
          $1::text            AS route_id,
          st.stop_id          AS stop_id,
          st.stop_sequence    AS stop_sequence,
          s.stop_name         AS stop_name,
          s.stop_lat          AS stop_lat,
          s.stop_lon          AS stop_lon,
          st.arrival_time     AS arrival_time,
          s.stx_stop_kind::text AS stop_kind
        FROM stop_times st
        JOIN trips t ON t.trip_id = st.trip_id
        JOIN stops s ON s.stop_id = st.stop_id
        WHERE t.route_id = $1
        ORDER BY st.stop_id, st.stop_sequence
        `,
        [routeId],
      )) as RouteStopRow[];

      const shapeRows = (await tx.query(
        `
        SELECT sh.shape_pt_lat AS lat, sh.shape_pt_lon AS lon, sh.shape_pt_sequence AS seq
        FROM shapes sh
        JOIN trips t ON t.shape_id = sh.shape_id
        WHERE t.route_id = $1
        ORDER BY sh.shape_pt_sequence
        `,
        [routeId],
      )) as Array<{ lat: number; lon: number; seq: number }>;
      const path: [number, number][] = shapeRows.map((s) => [s.lat, s.lon]);

      const vehicleRows = (await tx.query(
        `SELECT run.vehicle_id::text AS vehicle_id
           FROM stx_runs run
           JOIN trips t ON t.trip_id = ANY(run.trip_ids)
          WHERE t.route_id = $1 AND run.deleted_at IS NULL
          ORDER BY run.service_date DESC, run.created_at DESC
          LIMIT 1`,
        [routeId],
      )) as Array<{ vehicle_id: string | null }>;
      const vehicleId = vehicleRows[0]?.vehicle_id ?? null;

      return this.buildRouteSummary(
        {
          route_id: r.route_id,
          route_name: r.route_name,
          vehicle_id: vehicleId,
          start_time: null,
          school_id: r.school_id,
          school_name: r.school_name,
          school_lat: r.school_lat,
          school_lng: r.school_lng,
          direction: r.direction,
        },
        stopRows,
        path,
      );
    });
  }

  async getAllLiveLocations(
    user: AuthenticatedUser,
  ): Promise<LiveLocationDto[]> {
    const routeIds = await this.getAccessibleRouteIds(user);
    if (routeIds !== undefined && routeIds.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);
    const filterByRouteIds = routeIds !== undefined && routeIds.length > 0;
    const params: unknown[] = filterByRouteIds ? [today, routeIds] : [today];
    const whereClause = filterByRouteIds ? 'AND t.route_id = ANY($2)' : '';

    const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
      tx.query(
        `
        SELECT DISTINCT t.route_id
        FROM stx_runs run
        JOIN trips t ON t.trip_id = ANY(run.trip_ids)
        WHERE run.service_date = $1::date
          AND run.deleted_at IS NULL
          AND run.status NOT IN ('completed', 'cancelled')
          ${whereClause}
        ORDER BY t.route_id ASC
        `,
        params,
      ),
    )) as Array<{ route_id: string }>;

    const results: LiveLocationDto[] = [];
    for (const row of rows) {
      try {
        results.push(await this.getLiveLocation(row.route_id, user));
      } catch (e) {
        // Per-route failures are non-fatal: the live-map UI just omits that
        // marker. Logged at debug because operational alert-enrichment 500s
        // here would otherwise flood the request log on every refresh.
        this.logger.debug(
          `getAllLiveLocations: dropping route ${row.route_id}: ${(e as Error).message}`,
        );
      }
    }
    return results;
  }

  async getRouteStudents(
    routeId: string,
    user: AuthenticatedUser,
  ): Promise<unknown> {
    await this.checkRouteAccess(routeId, user);
    const schoolId = schoolIdFromAnchor(user);
    const url = `${this.presenceServiceUrl}/api/v1/routes/${routeId}/students${
      schoolId ? `?schoolId=${schoolId}` : ''
    }`;
    return this.httpClient.get(url);
  }

  /**
   * undefined → "no app-layer filter; admin sees all routes today".
   * []        → "caller has zero accessible routes; query short-circuits".
   * [...]     → "filter the route query to these ids".
   */
  private async getAccessibleRouteIds(
    user: AuthenticatedUser,
  ): Promise<string[] | undefined> {
    if (user.role === Role.PARENT) {
      if (user.anchorKind !== 'parent' || !user.anchorId) return [];
      const today = new Date().toISOString().slice(0, 10);
      const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
        tx.query(
          `SELECT DISTINCT t.route_id
           FROM stx_student_guardians sg
           JOIN stx_ridership rd ON rd.student_id = sg.student_id
           JOIN trips t ON t.trip_id = rd.trip_id
           WHERE sg.guardian_id = $1
             AND rd.status = 'active'
             AND rd.effective_from <= $2::date
             AND (rd.effective_to IS NULL OR rd.effective_to >= $2::date)`,
          [user.anchorId, today],
        ),
      )) as Array<{ route_id: string }>;
      return rows.map((r) => r.route_id);
    }

    if (user.role === Role.DRIVER) {
      if (user.anchorKind !== 'driver' || !user.anchorId) return [];
      const today = new Date().toISOString().slice(0, 10);
      const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
        tx.query(
          `SELECT DISTINCT t.route_id
           FROM stx_runs run
           JOIN trips t ON t.trip_id = ANY(run.trip_ids)
           WHERE run.driver_id = $1
             AND run.service_date = $2::date
             AND run.deleted_at IS NULL`,
          [user.anchorId, today],
        ),
      )) as Array<{ route_id: string }>;
      return rows.map((r) => r.route_id);
    }

    // Admin roles: undefined (no filter).
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.STA_ADMIN ||
      user.role === Role.BOARD_ADMIN ||
      user.role === Role.SCHOOL_ADMIN
    ) {
      return undefined;
    }

    return [];
  }

  private async deriveAlertStatus(
    routeId: string,
  ): Promise<'normal' | 'delay' | 'emergency'> {
    try {
      const rows = (await this.rlsContext.runAsCurrent(async (tx) =>
        tx.query(
          `SELECT category
           FROM stx_alerts
           WHERE scope_kind = 'route'
             AND scope_ref = $1
             AND status = 'active'`,
          [routeId],
        ),
      )) as Array<{ category: string }>;
      if (rows.length === 0) return 'normal';
      if (rows.some((r) => r.category === 'safety')) return 'emergency';
      return 'delay';
    } catch {
      return 'normal';
    }
  }

  private buildRouteSummary(
    r: ActiveRouteRow,
    stops: RouteStopRow[],
    path?: [number, number][],
  ): Record<string, unknown> {
    const direction =
      r.direction || (r.route_id.toUpperCase().includes('PM') ? 'PM' : 'AM');
    const startTime = r.start_time || '07:30';
    // Return the real DB stop_sequence as the single source of truth (ADR: Option 2).
    // School stays in its real sequence position; the UI uses `kind` to render the
    // school marker instead of a numbered pin, and to render a smaller badge.
    const orderedStops = stops
      .slice()
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map((s) => ({
        id: s.stop_id,
        routeId: r.route_id,
        sequence: s.stop_sequence,
        kind: s.stop_kind === 'school' ? 'school' : 'stop',
        address: s.stop_name,
        location:
          s.stop_lat !== null && s.stop_lon !== null
            ? `POINT(${s.stop_lon} ${s.stop_lat})`
            : undefined,
      }));
    return {
      id: r.route_id,
      name: r.route_name,
      schoolId: r.school_id || undefined,
      schoolName: r.school_name || 'Unknown School',
      schoolLat: r.school_lat ?? undefined,
      schoolLng: r.school_lng ?? undefined,
      direction,
      vehicleId: r.vehicle_id || undefined,
      startTime,
      estimatedDuration: 60,
      stops: orderedStops,
      status: 'active',
      ...(path && path.length > 0 ? { path } : {}),
    };
  }
}
