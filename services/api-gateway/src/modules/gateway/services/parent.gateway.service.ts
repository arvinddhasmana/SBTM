import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Observable, Subject, finalize } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { School } from '../../auth/entities/school.entity';
import { Route } from '../../auth/entities/route.entity';

interface ParentUser {
  id: string;
  schoolId?: string;
}

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  am_route_id?: string;
  pm_route_id?: string;
}

interface ReferenceStudentRow {
  id: string;
  firstName: string;
  lastName: string;
  parentId: string;
  schoolId: string | null;
  assignedRouteId: string | null;
  amRouteId: string | null;
  pmRouteId: string | null;
  amStopId: string | null;
  pmStopId: string | null;
}

interface ParentChildDto {
  id: string;
  name: string;
  schoolName?: string;
  routeId?: string;
  amRouteId?: string;
  pmRouteId?: string;
  amStopId?: string;
  pmStopId?: string;
  vehicleId?: string;
  status: 'on_bus' | 'at_school' | 'at_home' | 'unknown';
  avatarUrl?: string;
}

@Injectable()
export class ParentGatewayService {
  private readonly studentServiceUrl: string;
  private readonly logger = new Logger(ParentGatewayService.name);
  private readonly alertSubjects = new Set<Subject<MessageEvent>>();

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {
    this.studentServiceUrl = this.configService.get<string>(
      'STUDENT_SERVICE_URL',
      'http://localhost:3006',
    );
  }

  async getChildrenForParent(user: ParentUser): Promise<ParentChildDto[]> {
    // Demo-first behavior: use seeded reference tables for parent portal.
    // This keeps IDs consistent with GPS/presence demo data (ROUTE-A, BUS-001, etc.).
    let refStudents: ReferenceStudentRow[] = [];
    try {
      refStudents = await this.dataSource.query(
        `SELECT id, "firstName" as "firstName", "lastName" as "lastName", "parentId" as "parentId", "schoolId" as "schoolId", "assignedRouteId" as "assignedRouteId", "amRouteId" as "amRouteId", "pmRouteId" as "pmRouteId", "amStopId" as "amStopId", "pmStopId" as "pmStopId"
                 FROM students_reference
                 WHERE "parentId" = $1
                 ORDER BY id ASC`,
        [user.id],
      );
    } catch {
      refStudents = [];
    }

    if (refStudents.length > 0) {
      const schoolIds = Array.from(
        new Set(refStudents.map((s) => s.schoolId).filter(Boolean) as string[]),
      );
      const routeIds = Array.from(
        new Set(
          refStudents
            .flatMap((s) => [s.amRouteId, s.pmRouteId, s.assignedRouteId])
            .filter(Boolean) as string[],
        ),
      );

      const schools = schoolIds.length
        ? await this.schoolRepository.findBy({ id: In(schoolIds) })
        : [];
      const schoolMap = new Map(schools.map((s) => [s.id, s]));

      const routeVehicleRows = routeIds.length
        ? ((await this.dataSource.query(
            `SELECT id, "vehicleId" as "vehicleId" FROM routes_reference WHERE id = ANY($1)`,
            [routeIds],
          )) as Array<{ id: string; vehicleId: string | null }>)
        : [];
      const routeToVehicle = new Map(
        routeVehicleRows.map((r) => [r.id, r.vehicleId || undefined]),
      );

      // Determine student status from latest presence events
      const studentIds = refStudents.map((s) => s.id);
      const statusMap = await this.getStudentStatuses(studentIds);

      return refStudents.map((student) => {
        const school = student.schoolId
          ? schoolMap.get(student.schoolId)
          : undefined;
        const amRouteId =
          student.amRouteId || student.assignedRouteId || undefined;
        const pmRouteId = student.pmRouteId || undefined;
        const routeId = amRouteId; // primary route for backward compat
        const vehicleId = amRouteId ? routeToVehicle.get(amRouteId) : undefined;
        const name = `${student.firstName} ${student.lastName}`.trim();

        return {
          id: student.id,
          name,
          schoolName: school?.name,
          routeId,
          amRouteId,
          pmRouteId,
          amStopId: student.amStopId || undefined,
          pmStopId: student.pmStopId || undefined,
          vehicleId,
          status: statusMap.get(student.id) || ('unknown' as const),
          avatarUrl: name
            ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
            : undefined,
        };
      });
    }

    // Fallback: if reference data isn't present, use student-management service
    const url = `${this.studentServiceUrl}/students`;
    const students = await this.httpClient.get<StudentRecord[]>(url, {
      params: { parent_id: user.id },
    });

    if (!students || students.length === 0) {
      return [];
    }

    const schoolIds = Array.from(
      new Set(students.map((s) => s.school_id).filter(Boolean)),
    );
    const routeIds = Array.from(
      new Set(
        students
          .flatMap((s) => [s.am_route_id, s.pm_route_id])
          .filter(Boolean) as string[],
      ),
    );

    const schools = schoolIds.length
      ? await this.schoolRepository.findBy({ id: In(schoolIds) })
      : [];
    const routes = routeIds.length
      ? await this.routeRepository.findBy({ id: In(routeIds) })
      : [];

    const schoolMap = new Map(schools.map((s) => [s.id, s]));
    const routeMap = new Map(routes.map((r) => [r.id, r]));

    const studentIds = students.map((s) => s.id);
    const statusMap = await this.getStudentStatuses(studentIds);

    return students.map((student) => {
      const amRouteId = student.am_route_id || undefined;
      const pmRouteId = student.pm_route_id || undefined;
      const routeId = amRouteId || pmRouteId;
      const route = routeId ? routeMap.get(routeId) : undefined;
      const school = schoolMap.get(student.school_id);
      const name = `${student.first_name} ${student.last_name}`.trim();

      return {
        id: student.id,
        name,
        schoolName: school?.name,
        routeId,
        amRouteId,
        pmRouteId,
        vehicleId: route?.vehicleId,
        status: statusMap.get(student.id) || ('unknown' as const),
        avatarUrl: name
          ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
          : undefined,
      };
    });
  }

  /**
   * Query the latest presence_event per student to determine on_bus / at_school / at_home status.
   * BOARD → on_bus, ALIGHT → at_school (during school hours) or at_home.
   */
  private async getStudentStatuses(
    studentIds: string[],
  ): Promise<Map<string, 'on_bus' | 'at_school' | 'at_home' | 'unknown'>> {
    const statusMap = new Map<
      string,
      'on_bus' | 'at_school' | 'at_home' | 'unknown'
    >();
    if (studentIds.length === 0) return statusMap;

    try {
      // Get the latest presence event for each student using DISTINCT ON
      const rows: Array<{
        studentId: string;
        eventType: string;
        routeId: string;
      }> = await this.dataSource.query(
        `SELECT DISTINCT ON ("studentId") "studentId", "eventType", "routeId"
                     FROM presence_event
                     WHERE "studentId" = ANY($1)
                     ORDER BY "studentId", "timestamp" DESC`,
        [studentIds],
      );

      for (const row of rows) {
        if (row.eventType === 'BOARD') {
          statusMap.set(row.studentId, 'on_bus');
        } else if (row.eventType === 'ALIGHT') {
          // If alighted on AM route → at_school; if PM route → at_home
          const isPmRoute = row.routeId?.includes('PM');
          statusMap.set(row.studentId, isPmRoute ? 'at_home' : 'at_school');
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to fetch presence statuses: ${(err as Error).message}`,
      );
    }

    return statusMap;
  }

  async getNotificationsForParent(user: ParentUser): Promise<unknown[]> {
    const alertsUrl = `${this.configService.get<string>('ALERTS_SERVICE_URL', 'http://localhost:3003')}/api/v1/notifications`;
    const params: Record<string, string> = { parentUserId: user.id };
    if (user.schoolId) {
      params.schoolId = user.schoolId;
    }
    try {
      return await this.httpClient.get<unknown[]>(alertsUrl, { params });
    } catch {
      return [];
    }
  }

  /**
   * Proxy the emergency-alerts SSE stream for an authenticated parent.
   * The gateway validates the JWT before forwarding the stream.
   */
  getAlertStream(_user: ParentUser): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    this.alertSubjects.add(subject);

    const alertsServiceUrl = this.configService.get<string>(
      'ALERTS_SERVICE_URL',
      'http://localhost:3003',
    );
    const url = `${alertsServiceUrl}/api/v1/alerts/stream`;
    this.proxySSE(url, subject);

    return subject.asObservable().pipe(
      finalize(() => {
        this.alertSubjects.delete(subject);
        this.logger.debug('Parent SSE client disconnected');
      }),
    );
  }

  private proxySSE(url: string, subject: Subject<MessageEvent>): void {
    fetch(url)
      .then(async (response) => {
        if (!response.ok || !response.body) {
          subject.error(new Error(`Upstream SSE error: ${response.status}`));
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const pump = async (): Promise<void> => {
          if (subject.closed) return;
          const { done, value } = await reader.read();
          if (done) {
            subject.complete();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const raw = line.slice(5).trim();
              try {
                subject.next({ data: JSON.parse(raw) } as MessageEvent);
              } catch {
                subject.next({ data: raw } as MessageEvent);
              }
            }
          }
          return pump();
        };

        return pump();
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `SSE proxy upstream connection failed: ${(err as Error).message}`,
        );
        subject.error(err);
      });
  }
}
