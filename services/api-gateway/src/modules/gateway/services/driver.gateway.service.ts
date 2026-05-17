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

/**
 * v2 stub-ish: the v1 model had `user.assignedRouteIds` and `routes` / `route_stops`
 * tables; v2 splits that across `stx_runs` (driver↔run for a service_date), `routes`,
 * `trips`, `stops`, `stop_times`. Until the run resolver and GTFS-backed driver schedule
 * are wired (Phase B follow-up), the read paths here throw 501. Avatar helpers and the
 * HTTP-client wiring are retained so this service still constructs cleanly.
 *
 * TODO(phase-B):
 *   - getScheduleForDriver: SELECT runs WHERE driver_id = :anchorId AND service_date = today,
 *     join routes/trips/stops/shapes.
 *   - getRouteStudents: derive the day's roster from the assigned trip's stop_times and the
 *     student↔stop assignment table (TBD).
 */
@Injectable()
export class DriverGatewayService {
  private readonly logger = new Logger(DriverGatewayService.name);
  private readonly presenceServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.presenceServiceUrl = this.configService.getOrThrow<string>(
      'PRESENCE_SERVICE_URL',
    );
  }

  async getScheduleForDriver(user: DriverUser): Promise<DriverRouteDto[]> {
    this.logger.debug('getScheduleForDriver stub hit', { id: user.id });
    if (user.anchorKind !== 'driver' || !user.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a driver');
    }
    throw new NotImplementedException(
      'Driver schedule is not yet wired to the v2 stx_runs / GTFS model',
    );
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
