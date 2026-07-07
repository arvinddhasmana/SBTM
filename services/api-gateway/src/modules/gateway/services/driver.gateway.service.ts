import {
  Injectable,
  ForbiddenException,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '@sbtm/common';
import { DataSource } from 'typeorm';
import type { AnchorKind } from '../../auth/entities/user.entity';
import { RlsContextService } from '../../../common/services/rls-context.service';
import { PII_CRYPTO, type PiiCrypto } from './pii-crypto.provider';

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
  runId?: string;
  path?: [number, number][];
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
  /** 'school' for the school stop (UI renders school icon, hides number); 'stop' otherwise. */
  kind: 'school' | 'stop';
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
  run_id: string;
  school_id: string;
  school_name: string;
  school_lat: number | null;
  school_lng: number | null;
}

/**
 * v2 driver gateway. `getScheduleForDriver` is wired against `stx_runs` joined
 * to GTFS trips/routes/stop_times. `getRouteStudents` resolves the route roster
 * via `stx_ridership` (canonical student↔stop link, see
 * `docs/Design/RoutePlanner.md` §9 and `docs/Design/v2-followups.md` #2),
 * scoped to trips that belong to runs the caller is assigned to today.
 *
 * RLS posture: driver is an app-layer scoped role (no RLS policy on `stx_runs`
 * for `anchor_kind = 'driver'`). Handlers still run inside
 * `rlsContext.runAsCurrent` so admin-policied joined tables (routes, schools,
 * stx_students, stx_ridership) are read with the caller's anchor context. The
 * app-layer scope is the `WHERE run.driver_id = $1` clause and the `trip_id IN
 * (driver's runs' trip_ids)` filter.
 *
 * Presence merge: this endpoint returns base roster info with
 * `status: 'NOT_BOARDED'` for every student. The driver app overlays
 * server-confirmed boarding state by calling the presence service separately;
 * the gateway does not fan out to presence here to keep the read cheap and
 * because presence has its own SSE channel for live updates.
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
    @Optional()
    @Inject(PII_CRYPTO)
    private readonly pii: PiiCrypto | null = null,
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
          run.id::text                AS run_id,
          s.id::text                  AS school_id,
          s.name                      AS school_name,
          ST_Y(s.location::geometry)  AS school_lat,
          ST_X(s.location::geometry)  AS school_lng
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
        GROUP BY r.route_id, run.vehicle_id, run.id, s.id
        ORDER BY MIN(st.arrival_time)
        `,
        [driverId, serviceDate],
      )) as ScheduleRow[];

      const routeIds = [...new Set(rows.map((r) => r.route_id))];
      const shapeRows =
        routeIds.length > 0
          ? ((await tx.query(
              `
              SELECT DISTINCT ON (sh.shape_id, sh.shape_pt_sequence)
                t.route_id,
                sh.shape_pt_lat      AS lat,
                sh.shape_pt_lon      AS lon,
                sh.shape_pt_sequence AS seq
              FROM shapes sh
              JOIN trips t ON t.shape_id = sh.shape_id
              WHERE t.route_id = ANY($1)
              ORDER BY sh.shape_id, sh.shape_pt_sequence
              `,
              [routeIds],
            )) as Array<{
              route_id: string;
              lat: number;
              lon: number;
              seq: number;
            }>)
          : [];

      const pathByRoute = new Map<string, [number, number][]>();
      for (const sr of shapeRows) {
        if (!pathByRoute.has(sr.route_id)) pathByRoute.set(sr.route_id, []);
        pathByRoute.get(sr.route_id)!.push([sr.lat, sr.lon]);
      }

      return rows.map(
        (row): DriverRouteDto => ({
          routeId: row.route_id,
          name: row.route_long_name || row.route_short_name || row.route_id,
          direction: row.direction,
          startTime: row.start_time,
          vehicleId: row.vehicle_id,
          runId: row.run_id,
          schoolId: row.school_id,
          schoolName: row.school_name,
          schoolLat: row.school_lat ?? undefined,
          schoolLng: row.school_lng ?? undefined,
          path: pathByRoute.get(row.route_id),
        }),
      );
    });
  }

  async getRouteStudents(
    routeId: string,
    user: DriverUser,
  ): Promise<RouteRosterResponse> {
    if (user.anchorKind !== 'driver' || !user.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a driver');
    }
    void this.httpClient;
    void this.presenceServiceUrl;
    void this.dataSource;

    const driverId = user.anchorId;
    const serviceDate = new Date().toISOString().slice(0, 10);

    return this.rlsContext.runAsCurrent(async (tx) => {
      const stopRows = (await tx.query(
        `
        SELECT DISTINCT ON (s.stop_id)
          s.stop_id           AS id,
          s.stop_name         AS stop_name,
          st.stop_sequence    AS sequence,
          st.arrival_time     AS arrival_time,
          s.stop_lat          AS lat,
          s.stop_lon          AS lng,
          s.stx_stop_kind::text AS stop_kind,
          r.stx_direction_kind AS direction
        FROM stx_runs run
        JOIN trips t        ON t.trip_id = ANY(run.trip_ids)
        JOIN routes r       ON r.route_id = t.route_id
        JOIN stop_times st  ON st.trip_id = t.trip_id
        JOIN stops s        ON s.stop_id = st.stop_id
        WHERE run.driver_id     = $1
          AND run.service_date  = $2
          AND run.deleted_at    IS NULL
          AND r.deleted_at      IS NULL
          AND r.route_id        = $3
        ORDER BY s.stop_id, st.stop_sequence
        `,
        [driverId, serviceDate, routeId],
      )) as Array<{
        id: string;
        stop_name: string;
        sequence: number;
        arrival_time: string;
        lat: number | null;
        lng: number | null;
        stop_kind: string | null;
        direction: string;
      }>;

      const studentRows = (await tx.query(
        `
        SELECT DISTINCT ON (rd.student_id)
          rd.student_id          AS student_id,
          stu.legal_name         AS legal_name,
          stu.preferred_name     AS preferred_name,
          rd.stop_id             AS stop_id,
          s.stop_name            AS stop_name,
          st.stop_sequence       AS stop_sequence
        FROM stx_ridership rd
        JOIN stx_students stu ON stu.id = rd.student_id
        JOIN stops s          ON s.stop_id = rd.stop_id
        JOIN stop_times st    ON st.trip_id = rd.trip_id AND st.stop_id = rd.stop_id
        JOIN trips t          ON t.trip_id = rd.trip_id
        WHERE t.route_id = $1
          AND rd.status = 'active'
          AND rd.effective_from <= $2::date
          AND (rd.effective_to IS NULL OR rd.effective_to >= $2::date)
          AND rd.trip_id = ANY(
            SELECT UNNEST(trip_ids)
            FROM stx_runs
            WHERE driver_id    = $3
              AND service_date = $2::date
              AND deleted_at   IS NULL
          )
          AND stu.deleted_at IS NULL
        ORDER BY rd.student_id, st.stop_sequence
        `,
        [routeId, serviceDate, driverId],
      )) as Array<{
        student_id: string;
        legal_name: Buffer | null;
        preferred_name: Buffer | null;
        stop_id: string;
        stop_name: string;
        stop_sequence: number;
      }>;

      const direction = stopRows[0]?.direction ?? '';

      // Return the real DB stop_sequence as the single source of truth (ADR: Option 2).
      // School stays in its real sequence position with kind='school' so the UI can
      // render it with the school glyph instead of a numbered pin.
      const stops: RouteStopDto[] = stopRows
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => ({
          id: row.id,
          stopName: row.stop_name,
          sequence: row.sequence,
          kind: row.stop_kind === 'school' ? 'school' : 'stop',
          arrivalTime: row.arrival_time,
          lat: row.lat ?? undefined,
          lng: row.lng ?? undefined,
        }));

      const students: RouteRosterStudentDto[] = studentRows.map((row) => ({
        id: row.student_id,
        name: this.renderStudentName(
          row.preferred_name,
          row.legal_name,
          row.student_id,
        ),
        status: 'NOT_BOARDED',
        stopId: row.stop_id,
        stopName: row.stop_name,
        stopSequence: row.stop_sequence,
      }));

      return { stops, students, direction };
    });
  }

  /**
   * Decrypts the student's display name. Prefers `preferred_name` over
   * `legal_name`. Falls back to the opaque student id if PII crypto is not
   * wired (dev/test bootstraps without `SBTM_PII_KEY`) — the driver app
   * surfaces this as a placeholder so the roster is still usable, but the
   * absence of a key in production is a deployment bug, not a user-facing
   * feature.
   */
  private renderStudentName(
    preferred: Buffer | null,
    legal: Buffer | null,
    studentId: string,
  ): string {
    if (!this.pii) {
      this.logger.warn(
        'pii crypto not provided; returning student id as display name',
      );
      return studentId;
    }

    try {
      const decryptedPreferred = this.pii.decrypt(preferred);
      if (decryptedPreferred && decryptedPreferred.length > 0) {
        return decryptedPreferred;
      }
      const decryptedLegal = this.pii.decrypt(legal);
      return decryptedLegal ?? studentId;
    } catch (e) {
      this.logger.error(`Failed to decrypt PII for student ${studentId}`, e);
      return 'Unknown (Decryption Error)';
    }
  }
}
