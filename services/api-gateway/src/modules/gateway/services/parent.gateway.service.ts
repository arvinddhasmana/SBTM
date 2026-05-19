import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Observable, Subject, finalize } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { HttpClientService } from '../../../common/utils/http-client.service';
import { School } from '../../organization/entities/school.entity';
import { Route } from '../../gtfs/entities/route.entity';
import type { AnchorKind } from '../../auth/entities/user.entity';

interface ParentUser {
  id: string;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
}

interface StudentRecord {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  am_route_id?: string;
  pm_route_id?: string;
  am_stop_id?: string;
  pm_stop_id?: string;
}

interface ParentChildDto {
  id: string;
  name: string;
  schoolName?: string;
  routeId?: string;
  amRouteId?: string;
  pmRouteId?: string;
  amRouteName?: string;
  pmRouteName?: string;
  amStopId?: string;
  pmStopId?: string;
  vehicleId?: string;
  status: 'on_bus' | 'at_school' | 'at_home' | 'unknown';
  avatarUrl?: string;
}

const BOY_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Kid boy avatar"><defs><linearGradient id="bgBoy" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cfe8ff"/><stop offset="100%" stop-color="#9bd0ff"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#bgBoy)"/><circle cx="64" cy="68" r="32" fill="#ffd8b5"/><path d="M34 58c2-20 16-34 30-34s29 13 31 31c-4-2-8-3-12-3H46c-4 0-8 2-12 6Z" fill="#4f3a2d"/><circle cx="52" cy="69" r="3" fill="#2b1d14"/><circle cx="76" cy="69" r="3" fill="#2b1d14"/><path d="M53 83c3 3 6 4 11 4s8-1 11-4" fill="none" stroke="#ca6c58" stroke-width="3" stroke-linecap="round"/><path d="M38 122c2-16 13-27 26-27 13 0 24 11 26 27" fill="#2f8de4"/></svg>`;
const GIRL_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Kid girl avatar"><defs><linearGradient id="bgGirl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe0ea"/><stop offset="100%" stop-color="#ffc3d6"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#bgGirl)"/><circle cx="64" cy="68" r="32" fill="#ffd7b4"/><path d="M31 60c2-24 18-39 33-39 17 0 33 15 33 40-4-6-11-10-19-10H50c-8 0-15 4-19 9Z" fill="#5a3a2d"/><path d="M40 60c-4 9-4 17 0 23" fill="none" stroke="#5a3a2d" stroke-width="6" stroke-linecap="round"/><path d="M88 60c4 9 4 17 0 23" fill="none" stroke="#5a3a2d" stroke-width="6" stroke-linecap="round"/><circle cx="52" cy="69" r="3" fill="#2b1d14"/><circle cx="76" cy="69" r="3" fill="#2b1d14"/><path d="M53 83c3 3 6 4 11 4s8-1 11-4" fill="none" stroke="#ca6c58" stroke-width="3" stroke-linecap="round"/><path d="M38 122c2-16 13-27 26-27 13 0 24 11 26 27" fill="#ec6fa0"/></svg>`;

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
    this.studentServiceUrl = this.configService.getOrThrow<string>(
      'STUDENT_SERVICE_URL',
    );
  }

  private getKidAvatarUrl(studentId: string): string {
    const hash = studentId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const svg = hash % 2 === 0 ? BOY_AVATAR_SVG : GIRL_AVATAR_SVG;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  async getChildrenForParent(user: ParentUser): Promise<ParentChildDto[]> {
    // Query students table directly using operational schema
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
      ? await this.routeRepository.findBy({ routeId: In(routeIds) })
      : [];

    const schoolMap = new Map(schools.map((s) => [s.id, s]));
    const routeMap = new Map(routes.map((r) => [r.routeId, r]));

    const studentIds = students.map((s) => s.id);
    const statusMap = await this.getStudentStatuses(studentIds);

    return students.map((student) => {
      const amRouteId = student.am_route_id || undefined;
      const pmRouteId = student.pm_route_id || undefined;
      const routeId = amRouteId || pmRouteId;
      const amRoute = amRouteId ? routeMap.get(amRouteId) : undefined;
      const pmRoute = pmRouteId ? routeMap.get(pmRouteId) : undefined;
      const school = schoolMap.get(student.school_id);
      const name = `${student.first_name} ${student.last_name}`.trim();

      const routeDisplayName = (r: Route | undefined): string | undefined =>
        r ? (r.routeShortName ?? r.routeLongName ?? r.routeId) : undefined;

      return {
        id: student.id,
        name,
        schoolName: school?.name,
        routeId,
        amRouteId,
        pmRouteId,
        amRouteName: routeDisplayName(amRoute),
        pmRouteName: routeDisplayName(pmRoute),
        amStopId: student.am_stop_id || undefined,
        pmStopId: student.pm_stop_id || undefined,
        // TODO(phase-B): vehicle assignment moved to stx_runs; resolve via today's run.
        vehicleId: undefined,
        status: statusMap.get(student.id) || ('unknown' as const),
        avatarUrl: this.getKidAvatarUrl(student.id),
      };
    });
  }

  /**
   * Query the latest stx_boarding_events per student to determine on_bus / at_school / at_home status.
   * boarded → on_bus, alighted → at_school (AM route) or at_home (PM route).
   * If no events exist, infer status based on current time.
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
      const rows: Array<{
        studentId: string;
        eventKind: string;
        routeId: string;
        direction: string | null;
      }> = await this.dataSource.query(
        `SELECT DISTINCT ON (be.student_id) be.student_id AS "studentId",
                be.event_kind AS "eventKind", be.route_id AS "routeId", r.direction
         FROM stx_boarding_events be
         LEFT JOIN routes r ON be.route_id = r.id
         WHERE be.student_id = ANY($1)
         ORDER BY be.student_id, be.recorded_at DESC`,
        [studentIds],
      );

      for (const row of rows) {
        if (row.eventKind === 'boarded') {
          statusMap.set(row.studentId, 'on_bus');
        } else if (row.eventKind === 'alighted') {
          const isPmRoute =
            row.direction === 'PM' ||
            (row.direction == null && /pm/i.test(row.routeId ?? ''));
          statusMap.set(row.studentId, isPmRoute ? 'at_home' : 'at_school');
        }
      }

      // For students without presence events, provide a time-based default
      const now = new Date();
      const hour = now.getHours();
      const isSchoolHours = hour >= 8 && hour < 15; // 8 AM - 3 PM school hours
      const defaultStatus = isSchoolHours ? 'at_school' : 'at_home';

      for (const studentId of studentIds) {
        if (!statusMap.has(studentId)) {
          statusMap.set(studentId, defaultStatus);
          this.logger.debug(
            `No presence events for student ${studentId}, defaulting to ${defaultStatus}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to fetch presence statuses: ${(err as Error).message}`,
      );
      // On error, provide time-based defaults
      const now = new Date();
      const hour = now.getHours();
      const defaultStatus = hour >= 8 && hour < 15 ? 'at_school' : 'at_home';
      for (const studentId of studentIds) {
        statusMap.set(studentId, defaultStatus);
      }
    }

    return statusMap;
  }

  async getNotificationsForParent(user: ParentUser): Promise<unknown[]> {
    const alertsUrl = `${this.configService.getOrThrow<string>('ALERTS_SERVICE_URL')}/api/v1/notifications`;
    // v2-followups #1: school scoping is gone from req.user. The alerts
    // service resolves audience for a guardian via stx_alert_subscriptions
    // + Guardian → StudentGuardian → Student joins, so parentUserId alone
    // is sufficient. Cross-board guardians (one child per board) now get
    // both boards' alerts in a single call.
    const params: Record<string, string> = { parentUserId: user.id };
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

    const alertsServiceUrl =
      this.configService.getOrThrow<string>('ALERTS_SERVICE_URL');
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
