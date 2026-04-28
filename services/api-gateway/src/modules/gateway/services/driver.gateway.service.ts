import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Route } from '../../auth/entities/route.entity';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { Role } from '@sbtm/common';
import { DataSource } from 'typeorm';

interface DriverUser {
  id: string;
  role?: Role;
  assignedRouteIds?: string[];
  schoolId?: string;
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

const BOY_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Kid boy avatar"><defs><linearGradient id="bgBoy" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cfe8ff"/><stop offset="100%" stop-color="#9bd0ff"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#bgBoy)"/><circle cx="64" cy="68" r="32" fill="#ffd8b5"/><path d="M34 58c2-20 16-34 30-34s29 13 31 31c-4-2-8-3-12-3H46c-4 0-8 2-12 6Z" fill="#4f3a2d"/><circle cx="52" cy="69" r="3" fill="#2b1d14"/><circle cx="76" cy="69" r="3" fill="#2b1d14"/><path d="M53 83c3 3 6 4 11 4s8-1 11-4" fill="none" stroke="#ca6c58" stroke-width="3" stroke-linecap="round"/><path d="M38 122c2-16 13-27 26-27 13 0 24 11 26 27" fill="#2f8de4"/></svg>`;
const GIRL_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Kid girl avatar"><defs><linearGradient id="bgGirl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe0ea"/><stop offset="100%" stop-color="#ffc3d6"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#bgGirl)"/><circle cx="64" cy="68" r="32" fill="#ffd7b4"/><path d="M31 60c2-24 18-39 33-39 17 0 33 15 33 40-4-6-11-10-19-10H50c-8 0-15 4-19 9Z" fill="#5a3a2d"/><path d="M40 60c-4 9-4 17 0 23" fill="none" stroke="#5a3a2d" stroke-width="6" stroke-linecap="round"/><path d="M88 60c4 9 4 17 0 23" fill="none" stroke="#5a3a2d" stroke-width="6" stroke-linecap="round"/><circle cx="52" cy="69" r="3" fill="#2b1d14"/><circle cx="76" cy="69" r="3" fill="#2b1d14"/><path d="M53 83c3 3 6 4 11 4s8-1 11-4" fill="none" stroke="#ca6c58" stroke-width="3" stroke-linecap="round"/><path d="M38 122c2-16 13-27 26-27 13 0 24 11 26 27" fill="#ec6fa0"/></svg>`;

@Injectable()
export class DriverGatewayService {
  private readonly presenceServiceUrl: string;

  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.presenceServiceUrl = this.configService.getOrThrow<string>(
      'PRESENCE_SERVICE_URL',
    );
  }

  async getScheduleForDriver(user: DriverUser): Promise<DriverRouteDto[]> {
    const routeIds = user.assignedRouteIds || [];
    if (routeIds.length === 0) {
      return [];
    }

    // Query routes_reference since assignedRouteIds contains reference IDs (e.g., ROUTE-STBERN-R01-AM)
    const routes = await this.dataSource.query(
      `SELECT r.id, r.name, r.direction, r.schedule, r."vehicleId", r."schoolId",
              r.polyline,
              s.lat AS "schoolLat", s.lng AS "schoolLng", s.name AS "schoolName"
       FROM routes_reference r
       LEFT JOIN schools s ON r."schoolId" = s.id
       WHERE r.id = ANY($1)
       ORDER BY r.id ASC`,
      [routeIds],
    );

    return routes.map((r: any) => {
      const schedule =
        typeof r.schedule === 'string' ? JSON.parse(r.schedule) : r.schedule;
      const direction =
        r.direction || (r.id.toUpperCase().includes('PM') ? 'PM' : 'AM');
      return {
        routeId: r.id,
        name: r.name,
        direction,
        startTime: schedule?.startTime || '07:30',
        vehicleId: r.vehicleId || undefined,
        schoolId: r.schoolId,
        polyline: r.polyline || undefined,
        schoolLat: r.schoolLat != null ? Number(r.schoolLat) : undefined,
        schoolLng: r.schoolLng != null ? Number(r.schoolLng) : undefined,
        schoolName: r.schoolName || undefined,
      };
    });
  }

  private getStudentAvatarUrl(studentId: string): string {
    const hash = studentId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const svg = hash % 2 === 0 ? BOY_AVATAR_SVG : GIRL_AVATAR_SVG;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Return the full student roster for a route with server-confirmed presence states,
   * grouped by stop with stop metadata.
   *
   * Students are sourced from the students_reference table (route assignment data).
   * Current presence state is merged from the presence service.
   * Students with no presence events default to NOT_BOARDED.
   *
   * schoolId is always sourced from the authenticated user – never from the client.
   */
  async getRouteStudents(
    routeId: string,
    user: DriverUser,
  ): Promise<RouteRosterResponse> {
    if (!user.assignedRouteIds?.includes(routeId)) {
      throw new ForbiddenException('You do not have access to this route');
    }

    if (!user.schoolId) {
      throw new ForbiddenException('School context required');
    }

    // Determine route direction
    const routeRows: Array<{ direction: string }> = await this.dataSource.query(
      `SELECT direction FROM routes_reference WHERE id = $1`,
      [routeId],
    );
    const direction =
      routeRows[0]?.direction ||
      (routeId.toUpperCase().includes('PM') ? 'PM' : 'AM');
    const isAm = direction === 'AM';

    // Fetch enrolled students for this route (T4 data – scoped by schoolId)
    const enrolled: Array<{
      id: string;
      firstName: string;
      lastName: string;
      amStopId: string | null;
      pmStopId: string | null;
    }> = await this.dataSource.query(
      `SELECT id, "firstName", "lastName", "amStopId", "pmStopId"
               FROM students_reference
               WHERE ("assignedRouteId" = $1 OR "amRouteId" = $1 OR "pmRouteId" = $1)
                 AND "schoolId" = $2
               ORDER BY "lastName" ASC, "firstName" ASC`,
      [routeId, user.schoolId],
    );

    // Fetch stops for this route
    const stops: Array<{
      id: string;
      sequenceOrder: number;
      stopName: string;
      lat: number;
      lng: number;
      arrivalTime: string;
    }> = await this.dataSource.query(
      `SELECT id, "sequenceOrder", "stopName", lat, lng, "arrivalTime"
               FROM route_stops_reference
               WHERE "routeId" = $1
               ORDER BY "sequenceOrder" ASC`,
      [routeId],
    );

    const stopMap = new Map(stops.map((s) => [s.id, s]));

    if (enrolled.length === 0) {
      return {
        stops: stops.map((s) => ({
          id: s.id,
          stopName: s.stopName,
          sequence: s.sequenceOrder,
          arrivalTime: s.arrivalTime,
          lat: s.lat != null ? Number(s.lat) : undefined,
          lng: s.lng != null ? Number(s.lng) : undefined,
        })),
        students: [],
        direction,
      };
    }

    // Fetch current presence state for the route (may be empty for fresh routes)
    let presenceByStudentId = new Map<
      string,
      { status: 'BOARDED' | 'ALIGHTED'; lastSeen: string }
    >();
    try {
      const presenceUrl = `${this.presenceServiceUrl}/api/v1/routes/${routeId}/students`;
      const presenceResponse = await this.httpClient.get<any>(presenceUrl, {
        params: { schoolId: user.schoolId },
      });
      const presenceList: Array<{
        studentId: string;
        status: string;
        lastSeen?: string;
      }> = Array.isArray(presenceResponse)
        ? presenceResponse
        : (presenceResponse?.students ?? []);

      for (const p of presenceList) {
        if (p.status === 'BOARDED' || p.status === 'ALIGHTED') {
          presenceByStudentId.set(p.studentId, {
            status: p.status,
            lastSeen: p.lastSeen ?? new Date().toISOString(),
          });
        }
      }
    } catch {
      // Non-fatal – presence service unavailable; return roster with NOT_BOARDED defaults
    }

    return {
      stops: stops.map((s) => ({
        id: s.id,
        stopName: s.stopName,
        sequence: s.sequenceOrder,
        arrivalTime: s.arrivalTime,
        lat: s.lat != null ? Number(s.lat) : undefined,
        lng: s.lng != null ? Number(s.lng) : undefined,
      })),
      students: enrolled.map((student) => {
        const presence = presenceByStudentId.get(student.id);
        const stopId = isAm ? student.amStopId : student.pmStopId;
        const stop = stopId ? stopMap.get(stopId) : undefined;
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          status: presence?.status ?? 'NOT_BOARDED',
          lastSeen: presence?.lastSeen,
          stopId: stopId ?? undefined,
          stopName: stop?.stopName ?? undefined,
          stopSequence: stop?.sequenceOrder ?? undefined,
          avatarUrl: this.getStudentAvatarUrl(student.id),
        };
      }),
      direction,
    };
  }
}
