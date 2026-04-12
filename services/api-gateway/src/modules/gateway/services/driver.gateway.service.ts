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
}

export interface RouteRosterStudentDto {
  id: string;
  name: string;
  status: 'BOARDED' | 'ALIGHTED' | 'NOT_BOARDED';
  lastSeen?: string;
}

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
    this.presenceServiceUrl = this.configService.get<string>(
      'PRESENCE_SERVICE_URL',
      'http://localhost:3004',
    );
  }

  async getScheduleForDriver(user: DriverUser): Promise<DriverRouteDto[]> {
    const routeIds = user.assignedRouteIds || [];
    if (routeIds.length === 0) {
      return [];
    }

    // Query routes_reference since assignedRouteIds contains reference IDs (e.g., ROUTE-STBERN-R01-AM)
    const routes = await this.dataSource.query(
      `SELECT r.id, r.name, r.direction, r.schedule, r."vehicleId", r."schoolId"
       FROM routes_reference r
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
      };
    });
  }

  /**
   * Return the full student roster for a route with server-confirmed presence states.
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
  ): Promise<RouteRosterStudentDto[]> {
    if (!user.assignedRouteIds?.includes(routeId)) {
      throw new ForbiddenException('You do not have access to this route');
    }

    if (!user.schoolId) {
      throw new ForbiddenException('School context required');
    }

    // Fetch enrolled students for this route (T4 data – scoped by schoolId)
    const enrolled: Array<{ id: string; firstName: string; lastName: string }> =
      await this.dataSource.query(
        `SELECT id, "firstName", "lastName"
                 FROM students_reference
                 WHERE "assignedRouteId" = $1
                   AND "schoolId" = $2
                 ORDER BY "lastName" ASC, "firstName" ASC`,
        [routeId, user.schoolId],
      );

    if (enrolled.length === 0) {
      return [];
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

    return enrolled.map((student) => {
      const presence = presenceByStudentId.get(student.id);
      return {
        id: student.id,
        // T4: name is required for the driver to identify students at boarding
        name: `${student.firstName} ${student.lastName}`,
        status: presence?.status ?? 'NOT_BOARDED',
        lastSeen: presence?.lastSeen,
      };
    });
  }
}
