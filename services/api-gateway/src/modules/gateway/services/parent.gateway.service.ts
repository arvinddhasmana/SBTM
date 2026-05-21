import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Observable, Subject, finalize } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { HttpClientService } from '../../../common/utils/http-client.service';
import type { AnchorKind } from '../../auth/entities/user.entity';
import { PII_CRYPTO, type PiiCrypto } from './pii-crypto.provider';

interface ParentUser {
  id: string;
  anchorKind?: AnchorKind | null;
  anchorId?: string | null;
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
  private readonly logger = new Logger(ParentGatewayService.name);
  private readonly alertSubjects = new Set<Subject<MessageEvent>>();

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @Inject(PII_CRYPTO)
    @Optional()
    private readonly pii: PiiCrypto | null,
  ) {}

  private getKidAvatarUrl(studentId: string): string {
    const hash = studentId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const svg = hash % 2 === 0 ? BOY_AVATAR_SVG : GIRL_AVATAR_SVG;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  async getChildrenForParent(user: ParentUser): Promise<ParentChildDto[]> {
    // 1. Resolve guardian record for this user
    const guardians = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM stx_guardians WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [user.id],
    );
    if (!guardians.length) return [];
    const guardianId = guardians[0].id;

    // 2. Find students linked to this guardian
    const studentLinks = await this.dataSource.query<
      Array<{ student_id: string }>
    >(`SELECT student_id FROM stx_student_guardians WHERE guardian_id = $1`, [
      guardianId,
    ]);
    if (!studentLinks.length) return [];
    const studentIds = studentLinks.map((r) => r.student_id);

    // 3. Fetch student rows (PII columns come back as Buffer)
    const studentRows = await this.dataSource.query<
      Array<{
        id: string;
        school_id: string;
        grade: string | null;
        legal_name: Buffer | null;
        preferred_name: Buffer | null;
        external_ids: Record<string, unknown>;
      }>
    >(
      `SELECT id, school_id, grade, legal_name, preferred_name, external_ids
       FROM stx_students
       WHERE id = ANY($1) AND deleted_at IS NULL`,
      [studentIds],
    );
    if (!studentRows.length) return [];

    // 4. Fetch school names
    const schoolIds = Array.from(new Set(studentRows.map((s) => s.school_id)));
    const schools = await this.dataSource.query<
      Array<{ id: string; name: string }>
    >(`SELECT id, name FROM stx_schools WHERE id = ANY($1)`, [schoolIds]);
    const schoolMap = new Map(schools.map((s) => [s.id, s.name]));

    // 5. Fetch active ridership: student → trip → route (direction_id 0=AM, 1=PM)
    const ridershipRows = await this.dataSource.query<
      Array<{
        student_id: string;
        route_id: string;
        route_name: string;
        direction_id: number;
        stop_id: string;
      }>
    >(
      `SELECT DISTINCT ON (rd.student_id, rd.direction_id)
         rd.student_id,
         t.route_id,
         COALESCE(r.route_long_name, r.route_short_name, t.route_id) AS route_name,
         rd.direction_id,
         rd.stop_id
       FROM stx_ridership rd
       JOIN trips t ON t.trip_id = rd.trip_id
       JOIN routes r ON r.route_id = t.route_id
       WHERE rd.student_id = ANY($1)
         AND rd.status = 'active'
         AND rd.effective_from <= CURRENT_DATE
         AND (rd.effective_to IS NULL OR rd.effective_to >= CURRENT_DATE)
       ORDER BY rd.student_id, rd.direction_id`,
      [studentIds],
    );

    type RouteInfo = { routeId: string; routeName: string; stopId: string };
    const amRouteMap = new Map<string, RouteInfo>();
    const pmRouteMap = new Map<string, RouteInfo>();
    for (const row of ridershipRows) {
      const info: RouteInfo = {
        routeId: row.route_id,
        routeName: row.route_name,
        stopId: row.stop_id,
      };
      if (row.direction_id === 0) {
        amRouteMap.set(row.student_id, info);
      } else {
        pmRouteMap.set(row.student_id, info);
      }
    }

    // 6. Get boarding event statuses
    const statusMap = await this.getStudentStatuses(studentIds);

    return studentRows.map((student) => {
      const amRoute = amRouteMap.get(student.id);
      const pmRoute = pmRouteMap.get(student.id);
      return {
        id: student.id,
        name: this.renderStudentName(
          student.preferred_name,
          student.legal_name,
          student.id,
          student.external_ids,
        ),
        schoolName: schoolMap.get(student.school_id),
        routeId: amRoute?.routeId ?? pmRoute?.routeId,
        amRouteId: amRoute?.routeId,
        pmRouteId: pmRoute?.routeId,
        amRouteName: amRoute?.routeName,
        pmRouteName: pmRoute?.routeName,
        amStopId: amRoute?.stopId,
        pmStopId: pmRoute?.stopId,
        vehicleId: undefined,
        status: statusMap.get(student.id) ?? ('unknown' as const),
        avatarUrl: this.getKidAvatarUrl(student.id),
      };
    });
  }

  private renderStudentName(
    preferred: Buffer | null,
    legal: Buffer | null,
    studentId: string,
    externalIds?: Record<string, unknown>,
  ): string {
    const fallback =
      typeof externalIds?.board_student_number === 'string'
        ? `Student ${externalIds.board_student_number}`
        : studentId.slice(0, 8);

    if (!this.pii) {
      return fallback;
    }
    try {
      const decryptedPreferred = this.pii.decrypt(preferred);
      if (decryptedPreferred && decryptedPreferred.length > 0) {
        return decryptedPreferred;
      }
      const decryptedLegal = this.pii.decrypt(legal);
      return decryptedLegal ?? fallback;
    } catch {
      return fallback;
    }
  }

  async getNotificationsForParent(user: ParentUser): Promise<unknown[]> {
    const alertsUrl = `${this.configService.getOrThrow<string>('ALERTS_SERVICE_URL')}/api/v1/notifications`;
    const params: Record<string, string> = { parentUserId: user.id };
    try {
      return await this.httpClient.get<unknown[]>(alertsUrl, { params });
    } catch {
      return [];
    }
  }

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
                be.event_kind AS "eventKind", be.route_id AS "routeId", r.stx_direction_kind AS direction
         FROM stx_boarding_events be
         LEFT JOIN routes r ON be.route_id = r.route_id
         WHERE be.student_id = ANY($1)
         ORDER BY be.student_id, be.recorded_at DESC`,
        [studentIds],
      );

      for (const row of rows) {
        if (row.eventKind === 'boarded') {
          statusMap.set(row.studentId, 'on_bus');
        } else if (row.eventKind === 'alighted') {
          const isPmRoute =
            row.direction?.toUpperCase() === 'PM' ||
            (row.direction == null && /pm/i.test(row.routeId ?? ''));
          statusMap.set(row.studentId, isPmRoute ? 'at_home' : 'at_school');
        }
      }

      const now = new Date();
      const hour = now.getHours();
      const isSchoolHours = hour >= 8 && hour < 15;
      const defaultStatus = isSchoolHours ? 'at_school' : 'at_home';

      for (const studentId of studentIds) {
        if (!statusMap.has(studentId)) {
          statusMap.set(studentId, defaultStatus);
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to fetch presence statuses: ${(err as Error).message}`,
      );
      const now = new Date();
      const hour = now.getHours();
      const defaultStatus = hour >= 8 && hour < 15 ? 'at_school' : 'at_home';
      for (const studentId of studentIds) {
        statusMap.set(studentId, defaultStatus);
      }
    }

    return statusMap;
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
