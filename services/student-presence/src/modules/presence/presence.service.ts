import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  BoardingEvent,
  BoardingEventKind,
  BoardingEventSource,
} from './entities/boarding-event.entity';
import { ProcessPresenceEventsDto } from './dto/process-presence-events.dto';
import { ManualPresenceEventDto } from './dto/manual-presence-event.dto';
import { PresenceStatsDto, RouteStatsDto } from './dto/presence-stats.dto';
import { PresenceEventsQueryDto } from './dto/presence-events-query.dto';
import { StudentPresenceState, StudentPresenceInfo } from './dto/presence-state.interface';
import { TagsService } from '../tags/tags.service';
import { WebsocketGateway } from '../realtime/websocket.gateway';

// Configuration constants
const SIGNAL_STRENGTH_THRESHOLD = parseInt(process.env.BLE_SIGNAL_STRENGTH_THRESHOLD ?? '-80', 10);
const ALIGHT_TIMEOUT_MS = parseInt(process.env.PRESENCE_ALIGHT_TIMEOUT_MS ?? '30000', 10);

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(BoardingEvent)
    private boardingRepo: Repository<BoardingEvent>,
    @InjectQueue('presence') private presenceQueue: Queue,
    private tagsService: TagsService,
    private wsGateway: WebsocketGateway,
    private dataSource: DataSource,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  /**
   * Process BLE detections from driver app.
   * Each detection is resolved tag -> legacy studentId -> v2 student uuid and
   * written to `stx_boarding_events` carrying the run/stop context.
   */
  async processDetections(
    dto: ProcessPresenceEventsDto,
  ): Promise<{ status: string; eventsProcessed: number }> {
    let eventsProcessed = 0;

    for (const detection of dto.detections) {
      if (detection.signalStrength < SIGNAL_STRENGTH_THRESHOLD) {
        this.logger.debug(
          `Ignoring weak signal for tag ${detection.tagId}: ${detection.signalStrength} dBm`,
        );
        continue;
      }

      const tag = await this.tagsService.findByTagId(detection.tagId, dto.schoolId);
      if (!tag) {
        this.logger.warn(`Unknown tag detected: ${detection.tagId}`);
        continue;
      }

      const currentState = await this.getPresenceState(dto.schoolId, tag.studentId, dto.routeId);

      if (!currentState || currentState.status === 'ALIGHTED') {
        await this.logPresenceEvent({
          schoolId: dto.schoolId,
          legacyStudentId: tag.studentId,
          vehicleId: dto.vehicleId,
          routeId: dto.routeId,
          runId: dto.runId,
          stopId: dto.stopId,
          eventKind: BoardingEventKind.BOARDED,
          timestamp: new Date(dto.timestamp),
          source: BoardingEventSource.SMARTTAG,
        });
        eventsProcessed++;
      } else {
        await this.updateLastSeen(dto.schoolId, tag.studentId, dto.routeId);
      }
    }

    await this.checkForAlightEvents(
      dto.schoolId,
      dto.routeId,
      dto.vehicleId,
      dto.runId,
      dto.stopId,
      dto.detections.map((d) => d.tagId),
    );

    return { status: 'processed', eventsProcessed };
  }

  /**
   * Manual override by driver.
   */
  async manualOverride(dto: ManualPresenceEventDto): Promise<BoardingEvent> {
    return this.logPresenceEvent({
      schoolId: dto.schoolId,
      legacyStudentId: dto.studentId,
      vehicleId: dto.vehicleId,
      routeId: dto.routeId,
      runId: dto.runId,
      stopId: dto.stopId,
      eventKind: dto.eventKind,
      timestamp: new Date(dto.timestamp),
      source: dto.source ?? BoardingEventSource.DRIVER_APP,
    });
  }

  /**
   * Get current presence state for a route.
   */
  async getRoutePresence(routeId: string, schoolId?: string): Promise<StudentPresenceInfo[]> {
    const cacheKey = `route:${schoolId || 'global'}:${routeId}:students`;
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Fallback to db — latest boarding row per student on this route.
    const params: any[] = [routeId];
    let schoolFilter = '';
    if (schoolId) {
      schoolFilter = ` AND s.school_id = $2::uuid`;
      params.push(schoolId);
    }

    const rows = await this.dataSource.query(
      `
        WITH route_events AS (
          SELECT e.*
          FROM stx_boarding_events e
          JOIN stx_runs r ON r.id = e.run_id
          JOIN stx_students s ON s.id = e.student_id
          WHERE r.route_id = $1 ${schoolFilter}
        )
        SELECT DISTINCT ON (student_id)
          student_id   AS "studentId",
          event_kind   AS "eventKind",
          recorded_at  AS "recordedAt"
        FROM route_events
        ORDER BY student_id, recorded_at DESC
      `,
      params,
    );

    const studentStates: StudentPresenceInfo[] = rows.map((r: any) => ({
      studentId: r.studentId,
      status: r.eventKind === BoardingEventKind.BOARDED ? 'BOARDED' : 'ALIGHTED',
      lastSeen: new Date(r.recordedAt).toISOString(),
    }));

    await this.redis.setex(cacheKey, 30, JSON.stringify(studentStates));

    return studentStates;
  }

  /**
   * Helper: resolve legacy free-text student id -> v2 stx_students.id uuid via
   * `external_ids->>'board_student_number'` JSONB lookup. Falls through to the
   * literal value if it already looks like a uuid (manual override path may
   * pass either).
   */
  private async resolveStudentUuid(legacyId: string, schoolId: string): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT id FROM stx_students
       WHERE school_id = $1::uuid
         AND external_ids->>'board_student_number' = $2
       LIMIT 1`,
      [schoolId, legacyId],
    );
    if (rows && rows.length > 0) {
      return rows[0].id;
    }
    // Fallback: maybe caller already passed a uuid
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(legacyId);
    if (isUuid) {
      const direct = await this.dataSource.query(
        `SELECT id FROM stx_students WHERE id = $1::uuid AND school_id = $2::uuid LIMIT 1`,
        [legacyId, schoolId],
      );
      if (direct && direct.length > 0) return direct[0].id;
    }
    throw new NotFoundException(`No stx_students row found for legacy id (school=${schoolId})`);
  }

  /**
   * Helper: persist a boarding event and update caches/queues/sockets.
   */
  private async logPresenceEvent(data: {
    schoolId: string;
    legacyStudentId: string;
    vehicleId: string;
    routeId: string;
    runId: string;
    stopId: string;
    eventKind: BoardingEventKind;
    timestamp: Date;
    source: BoardingEventSource;
  }): Promise<BoardingEvent> {
    const studentUuid = await this.resolveStudentUuid(data.legacyStudentId, data.schoolId);

    const event = this.boardingRepo.create({
      runId: data.runId,
      stopId: data.stopId,
      studentId: studentUuid,
      eventKind: data.eventKind,
      recordedAt: data.timestamp,
      source: data.source,
      location: null,
      notes: null,
      recordedByDriverId: null,
    });
    const savedEvent = await this.boardingRepo.save(event);

    await this.updatePresenceCache(
      data.schoolId,
      data.legacyStudentId,
      data.routeId,
      data.vehicleId,
      data.runId,
      data.stopId,
      data.eventKind === BoardingEventKind.BOARDED ? 'BOARDED' : 'ALIGHTED',
      data.timestamp,
    );

    await this.presenceQueue.add('presence-event', {
      ...savedEvent,
      // Pass legacy ids for downstream processor that still keys on schoolId.
      schoolId: data.schoolId,
      routeId: data.routeId,
      vehicleId: data.vehicleId,
    });

    this.wsGateway.broadcastPresenceEvent({
      studentId: studentUuid,
      routeId: data.routeId,
      runId: data.runId,
      stopId: data.stopId,
      eventKind: data.eventKind,
      timestamp: data.timestamp.toISOString(),
    });

    this.logger.log(
      `${data.eventKind} event for student ${studentUuid} on route ${data.routeId} (run ${data.runId})`,
    );

    return savedEvent;
  }

  private async updatePresenceCache(
    schoolId: string,
    studentId: string,
    routeId: string,
    vehicleId: string,
    runId: string,
    stopId: string,
    status: 'BOARDED' | 'ALIGHTED',
    lastSeen: Date,
  ): Promise<void> {
    const state: StudentPresenceState = {
      schoolId,
      studentId,
      status,
      lastSeen,
      vehicleId,
      routeId,
      runId,
      stopId,
    };

    const cacheKey = `presence:${schoolId}:${studentId}:${routeId}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(state));
    await this.redis.del(`route:${schoolId}:${routeId}:students`);
  }

  private async updateLastSeen(
    schoolId: string,
    studentId: string,
    routeId: string,
  ): Promise<void> {
    const cacheKey = `presence:${schoolId}:${studentId}:${routeId}`;
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      const state: StudentPresenceState = JSON.parse(cachedData);
      state.lastSeen = new Date();
      await this.redis.setex(cacheKey, 3600, JSON.stringify(state));
    }
  }

  private async getPresenceState(
    schoolId: string,
    studentId: string,
    routeId: string,
  ): Promise<StudentPresenceState | null> {
    const cacheKey = `presence:${schoolId}:${studentId}:${routeId}`;
    const cachedData = await this.redis.get(cacheKey);
    if (!cachedData) return null;
    return JSON.parse(cachedData);
  }

  private async checkForAlightEvents(
    schoolId: string,
    routeId: string,
    vehicleId: string,
    runId: string,
    stopId: string,
    detectedTagIds: string[],
  ): Promise<void> {
    const routePresence = await this.getRoutePresence(routeId, schoolId);
    const boardedStudents = routePresence.filter((s) => s.status === 'BOARDED');

    for (const student of boardedStudents) {
      const state = await this.getPresenceState(schoolId, student.studentId, routeId);
      if (!state) continue;

      const studentTags = await this.tagsService.findByStudentId(student.studentId, schoolId);
      const studentTagIds = studentTags.map((t) => t.tagId);
      const wasDetected = studentTagIds.some((tagId) => detectedTagIds.includes(tagId));

      if (!wasDetected) {
        const timeSinceLastSeen = Date.now() - new Date(state.lastSeen).getTime();
        if (timeSinceLastSeen > ALIGHT_TIMEOUT_MS) {
          await this.logPresenceEvent({
            schoolId,
            legacyStudentId: student.studentId,
            vehicleId,
            routeId,
            runId,
            stopId,
            eventKind: BoardingEventKind.ALIGHTED,
            timestamp: new Date(),
            source: BoardingEventSource.SMARTTAG,
          });
        }
      }
    }
  }

  /**
   * Get global presence stats for a school.
   */
  async getStats(schoolId?: string): Promise<PresenceStatsDto> {
    const params: any[] = [];
    let studentSchoolFilter = '';
    let eventSchoolJoinFilter = '';

    if (schoolId) {
      studentSchoolFilter = `AND s.school_id = $1::uuid`;
      eventSchoolJoinFilter = `AND s.school_id = $1::uuid`;
      params.push(schoolId);
    }

    // 1. Total enrolled students
    const totalStudentsResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM stx_students s WHERE s.status = 'enrolled' ${studentSchoolFilter}`,
      params,
    );
    const totalStudents = parseInt(totalStudentsResult[0]?.count || '0');

    // 2. Latest event per student
    const latestEvents = await this.dataSource.query(
      `
        WITH LatestEvents AS (
          SELECT DISTINCT ON (e.student_id) e.*
          FROM stx_boarding_events e
          JOIN stx_students s ON s.id = e.student_id
          WHERE 1=1 ${eventSchoolJoinFilter}
          ORDER BY e.student_id, e.recorded_at DESC
        )
        SELECT event_kind AS "eventKind", COUNT(*) as count
        FROM LatestEvents
        GROUP BY event_kind
      `,
      params,
    );

    let boarded = 0;
    let alighted = 0;
    latestEvents.forEach((e: any) => {
      if (e.eventKind === BoardingEventKind.BOARDED) {
        boarded = parseInt(e.count);
      }
      if (e.eventKind === BoardingEventKind.ALIGHTED) {
        alighted = parseInt(e.count);
      }
    });
    const unknown = Math.max(0, totalStudents - boarded - alighted);

    // 3. Stats by route (route resolved via stx_runs.route_id)
    const routeStatsRaw = await this.dataSource.query(
      `
        WITH LatestEvents AS (
          SELECT DISTINCT ON (e.student_id) e.*, r.route_id
          FROM stx_boarding_events e
          JOIN stx_runs r ON r.id = e.run_id
          JOIN stx_students s ON s.id = e.student_id
          WHERE 1=1 ${eventSchoolJoinFilter}
          ORDER BY e.student_id, e.recorded_at DESC
        )
        SELECT route_id AS "routeId", event_kind AS "eventKind", COUNT(*) as count
        FROM LatestEvents
        GROUP BY route_id, event_kind
      `,
      params,
    );

    const routeMap = new Map<string, RouteStatsDto>();
    routeStatsRaw.forEach((r: any) => {
      const key = String(r.routeId);
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          routeId: key,
          routeName: `Route ${key.substring(0, 4)}`,
          boarded: 0,
          alighted: 0,
        });
      }
      const stats = routeMap.get(key)!;
      if (r.eventKind === BoardingEventKind.BOARDED) {
        stats.boarded = parseInt(r.count);
      }
      if (r.eventKind === BoardingEventKind.ALIGHTED) {
        stats.alighted = parseInt(r.count);
      }
    });

    return {
      totalStudents,
      boarded,
      alighted,
      unknown,
      byRoute: Array.from(routeMap.values()),
    };
  }

  /**
   * Get paginated boarding events joined with student details.
   * Joins `stx_students` by uuid (v2 PK), not by legacy external id.
   */
  async getEvents(query: PresenceEventsQueryDto) {
    const limit = Math.max(1, Number(query.limit) || 10);
    const page = Math.max(1, Number(query.page) || 1);
    const offset = (page - 1) * limit;
    const schoolId = query.schoolId;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (schoolId) {
      whereClause += ` AND s.school_id = $${params.length + 1}::uuid`;
      params.push(schoolId);
    }

    if (query.routeId) {
      whereClause += ` AND r.route_id = $${params.length + 1}`;
      params.push(query.routeId);
    }

    if (query.runId) {
      whereClause += ` AND e.run_id = $${params.length + 1}::uuid`;
      params.push(query.runId);
    }

    if (query.eventKind) {
      whereClause += ` AND e.event_kind = $${params.length + 1}::stx_boarding_event_kind_enum`;
      params.push(query.eventKind);
    }

    if (query.studentName) {
      // Names are encrypted (bytea) in v2 — filter is best-effort, returns
      // empty unless the integration layer surfaces a plaintext column.
      whereClause += ` AND FALSE`;
    }

    const events = await this.dataSource.query(
      `
        SELECT
          e.id,
          e.run_id        AS "runId",
          e.stop_id       AS "stopId",
          e.student_id    AS "studentId",
          e.event_kind    AS "eventKind",
          e.recorded_at   AS "recordedAt",
          e.source,
          r.route_id      AS "routeId",
          s.grade
        FROM stx_boarding_events e
        JOIN stx_runs r ON r.id = e.run_id
        JOIN stx_students s ON s.id = e.student_id
        ${whereClause}
        ORDER BY e.recorded_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    );

    const totalResult = await this.dataSource.query(
      `
        SELECT COUNT(*) as count
        FROM stx_boarding_events e
        JOIN stx_runs r ON r.id = e.run_id
        JOIN stx_students s ON s.id = e.student_id
        ${whereClause}
      `,
      params,
    );

    return {
      items: events,
      total: parseInt(totalResult[0]?.count || '0'),
      page,
      limit,
    };
  }
}
