import {
  Injectable,
  ForbiddenException,
  Logger,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '@sbtm/common';
import { DataSource } from 'typeorm';
import type { AnchorKind } from '../../auth/entities/user.entity';
import { RlsContextService } from '../../../common/services/rls-context.service';

interface DriverUser {
  id: string;
  role?: Role;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

interface DriverRouteDto {
  routeId: string;
  name: string;
  direction: string;
  startTime: string;
  vehicleId?: string;
  schoolId: string;
  polyline?: string;
  schoolLat?: number;
  schoolLng?: number;
  schoolName?: string;
}

export interface RouteRosterStudentDto {
  id: string;
  name: string;
  status: 'BOARDED' | 'ALIGHTED' | 'NOT_BOARDED';
  lastSeen?: string;
  stopId?: string;
  stopName?: string;
  stopSequence?: number;
  avatarUrl?: string;
}

export interface RouteStopDto {
  id: string;
  stopName: string;
  sequence: number;
  arrivalTime: string;
  lat?: number;
  lng?: number;
}

export interface RouteRosterResponse {
  stops: RouteStopDto[];
  students: RouteRosterStudentDto[];
  direction: string;
}

interface ScheduleRow {
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
  direction: string;
  start_time: string;
  vehicle_id: string;
  school_id: string;
  school_name: string;
  school_location: string | null;
}

/**
 * v2 driver gateway. `getScheduleForDriver` is wired against `stx_runs` joined
 * to GTFS trips/routes/stop_times. `getRouteStudents` remains a 501 stub until
 * the student↔stop assignment model is finalised (Phase B follow-up).
 *
 * RLS posture: driver is an app-layer scoped role (no RLS policy on `stx_runs`
 * for `anchor_kind = 'driver'`). The handler still runs inside
 * `rlsContext.runAsCurrent` so admin-policied joined tables (routes, schools)
 * are read with the caller's anchor context, and so the discipline of
 * tx-scoped reads is consistent across the codebase. The app-layer scope is
 * the `WHERE r.driver_id = $1` clause.
 */
@Injectable()
export class DriverGatewayService {
  private readonly logger = new Logger(DriverGatewayService.name);
  private readonly presenceServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly rlsContext: RlsContextService,
  ) {
    this.presenceServiceUrl = this.configService.getOrThrow<string>(
      'PRESENCE_SERVICE_URL',
    );
  }

  async getScheduleForDriver(user: DriverUser): Promise<DriverRouteDto[]> {
    this.logger.debug('getScheduleForDriver', { id: user.id });
    if (user.anchorKind !== 'driver' || !user.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a driver');
    }
    const driverId = user.anchorId;
    const serviceDate = new Date().toISOString().slice(0, 10);

    return this.rlsContext.runAsCurrent(async (tx) => {
      const rows = (await tx.query(
        `
        SELECT
          r.route_id,
          r.route_short_name,
          r.route_long_name,
          r.stx_direction_kind        AS direction,
          MIN(st.arrival_time)::text  AS start_time,
          run.vehicle_id::text        AS vehicle_id,
          s.id::text                  AS school_id,
          s.name                      AS school_name,
          s.location                  AS school_location
        FROM stx_runs run
        JOIN trips t        ON t.trip_id = ANY(run.trip_ids)
        JOIN routes r       ON r.route_id = t.route_id
        JOIN stx_schools s  ON s.id = r.stx_school_id
        JOIN stop_times st  ON st.trip_id = t.trip_id
        WHERE run.driver_id = $1
          AND run.service_date = $2
          AND run.deleted_at IS NULL
          AND r.deleted_at IS NULL
          AND s.deleted_at IS NULL
        GROUP BY r.route_id, run.vehicle_id, s.id
        ORDER BY MIN(st.arrival_time)
        `,
        [driverId, serviceDate],
      )) as ScheduleRow[];

      return rows.map((row): DriverRouteDto => {
        const { lat, lng } = parsePoint(row.school_location);
        return {
          routeId: row.route_id,
          name: row.route_long_name || row.route_short_name || row.route_id,
          direction: row.direction,
          startTime: row.start_time,
          vehicleId: row.vehicle_id,
          schoolId: row.school_id,
          schoolName: row.school_name,
          schoolLat: lat,
          schoolLng: lng,
        };
      });
    });
  }

  async getRouteStudents(
    _routeId: string,
    user: DriverUser,
  ): Promise<RouteRosterResponse> {
    if (user.anchorKind !== 'driver' || !user.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a driver');
    }
    // touch the deps so eslint/tsc don't drop them — they'll be needed once this is wired.
    void this.httpClient;
    void this.presenceServiceUrl;
    void this.dataSource;
    throw new NotImplementedException(
      'Driver route roster is not yet wired to the v2 stx_runs / stop_times model',
    );
  }
}

/**
 * Parse `stx_schools.location` (today: plain `text`, future: PostGIS
 * `geography(Point, 4326)` per v2-followups #5). Accepts WKT `POINT(lng lat)`
 * or `lat,lng` string. Returns `{}` if unparseable — callers treat missing
 * coords as "no map pin", which is the correct degraded behaviour.
 */
function parsePoint(loc: string | null): { lat?: number; lng?: number } {
  if (!loc) return {};
  const wkt = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(
    loc,
  );
  if (wkt) return { lng: Number(wkt[1]), lat: Number(wkt[2]) };
  const csv = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(loc);
  if (csv) return { lat: Number(csv[1]), lng: Number(csv[2]) };
  return {};
}
