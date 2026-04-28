import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PresenceEvent, EventType, EventSource } from './entities/presence-event.entity';
import { ProcessPresenceEventsDto } from './dto/process-presence-events.dto';
import { ManualPresenceEventDto } from './dto/manual-presence-event.dto';
import { PresenceStatsDto, RouteStatsDto } from './dto/presence-stats.dto';
import { PresenceEventsQueryDto } from './dto/presence-events-query.dto';
import { StudentPresenceState, StudentPresenceInfo } from './dto/presence-state.interface';
import { TagsService } from '../tags/tags.service';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { DataSource } from 'typeorm';

// Configuration constants
const SIGNAL_STRENGTH_THRESHOLD = parseInt(process.env.BLE_SIGNAL_STRENGTH_THRESHOLD ?? '-80', 10); // Minimum signal strength in dBm
const ALIGHT_TIMEOUT_MS = parseInt(process.env.PRESENCE_ALIGHT_TIMEOUT_MS ?? '30000', 10); // Grace period before student marked as alighted

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private redis: Redis;

  constructor(
    @InjectRepository(PresenceEvent)
    private presenceRepo: Repository<PresenceEvent>,
    @InjectQueue('presence') private presenceQueue: Queue,
    private tagsService: TagsService,
    private wsGateway: WebsocketGateway,
    private dataSource: DataSource,
  ) {
    // Initialize Redis client for caching
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  /**
   * Process BLE detections from driver app
   */
  async processDetections(
    dto: ProcessPresenceEventsDto,
  ): Promise<{ status: string; eventsProcessed: number }> {
    let eventsProcessed = 0;

    for (const detection of dto.detections) {
      // Filter by signal strength
      if (detection.signalStrength < SIGNAL_STRENGTH_THRESHOLD) {
        this.logger.debug(
          `Ignoring weak signal for tag ${detection.tagId}: ${detection.signalStrength} dBm`,
        );
        continue;
      }

      // Find student by tag
      const tag = await this.tagsService.findByTagId(detection.tagId, dto.schoolId);
      if (!tag) {
        this.logger.warn(`Unknown tag detected: ${detection.tagId}`);
        continue;
      }

      // Check current presence state
      const currentState = await this.getPresenceState(dto.schoolId, tag.studentId, dto.routeId);

      // Determine if this is a BOARD event
      if (!currentState || currentState.status === 'ALIGHTED') {
        await this.logPresenceEvent({
          schoolId: dto.schoolId,
          studentId: tag.studentId,
          vehicleId: dto.vehicleId,
          routeId: dto.routeId,
          eventType: EventType.BOARD,
          timestamp: new Date(dto.timestamp),
          source: EventSource.SMARTTAG,
          signalStrength: detection.signalStrength,
        });
        eventsProcessed++;
      } else {
        // Student already boarded - just update last seen
        await this.updateLastSeen(
          dto.schoolId,
          tag.studentId,
          dto.routeId,
          dto.vehicleId,
          detection.signalStrength,
        );
      }
    }

    // Check for ALIGHT events (students who were present but not detected)
    await this.checkForAlightEvents(
      dto.schoolId,
      dto.routeId,
      dto.vehicleId,
      dto.detections.map((d) => d.tagId),
    );

    return { status: 'processed', eventsProcessed };
  }

  /**
   * Manual override by driver
   */
  async manualOverride(dto: ManualPresenceEventDto): Promise<PresenceEvent> {
    const event = await this.logPresenceEvent({
      schoolId: dto.schoolId,
      studentId: dto.studentId,
      vehicleId: dto.vehicleId,
      routeId: dto.routeId,
      eventType: dto.eventType as EventType,
      timestamp: new Date(dto.timestamp),
      source: EventSource.MANUAL,
      signalStrength: null,
    });

    return event;
  }

  /**
   * Get current presence state for a route
   */
  async getRoutePresence(routeId: string, schoolId?: string): Promise<StudentPresenceInfo[]> {
    const cacheKey = `route:${schoolId || 'global'}:${routeId}:students`;
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Fallback to database if cache miss
    const events = await this.presenceRepo
      .createQueryBuilder('event')
      .where('event.routeId = :routeId', { routeId })
      .andWhere(schoolId ? 'event.schoolId = :schoolId' : '1=1', { schoolId })
      .orderBy('event.timestamp', 'DESC')
      .getMany();

    const studentStates = new Map<string, StudentPresenceInfo>();

    for (const event of events) {
      if (!studentStates.has(event.studentId)) {
        studentStates.set(event.studentId, {
          studentId: event.studentId,
          status: event.eventType === EventType.BOARD ? 'BOARDED' : 'ALIGHTED',
          lastSeen: event.timestamp.toISOString(),
          signalStrength: event.signalStrength,
        });
      }
    }

    const result = Array.from(studentStates.values());

    // Cache for 30 seconds
    await this.redis.setex(cacheKey, 30, JSON.stringify(result));

    return result;
  }

  /**
   * Helper: Log a presence event and update cache
   */
  private async logPresenceEvent(data: {
    schoolId: string;
    studentId: string;
    vehicleId: string;
    routeId: string;
    eventType: EventType;
    timestamp: Date;
    source: EventSource;
    signalStrength: number | null;
  }): Promise<PresenceEvent> {
    // Create and save event
    const event = this.presenceRepo.create(data);
    const savedEvent = await this.presenceRepo.save(event);

    // Update Redis cache
    await this.updatePresenceCache(
      data.schoolId,
      data.studentId,
      data.routeId,
      data.vehicleId,
      data.eventType === EventType.BOARD ? 'BOARDED' : 'ALIGHTED',
      data.timestamp,
      data.signalStrength,
    );

    // Queue for async processing
    await this.presenceQueue.add('presence-event', savedEvent);

    // Broadcast via WebSocket
    this.wsGateway.broadcastPresenceEvent({
      studentId: data.studentId,
      routeId: data.routeId,
      eventType: data.eventType,
      timestamp: data.timestamp.toISOString(),
    });

    this.logger.log(
      `${data.eventType} event for student ${data.studentId} on route ${data.routeId}`,
    );

    return savedEvent;
  }

  /**
   * Helper: Update presence state cache
   */
  private async updatePresenceCache(
    schoolId: string,
    studentId: string,
    routeId: string,
    vehicleId: string,
    status: 'BOARDED' | 'ALIGHTED',
    lastSeen: Date,
    signalStrength: number | null,
  ): Promise<void> {
    const state: StudentPresenceState = {
      schoolId,
      studentId,
      status,
      lastSeen,
      vehicleId,
      routeId,
      signalStrength,
    };

    const cacheKey = `presence:${schoolId}:${studentId}:${routeId}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(state)); // 1 hour TTL

    // Invalidate route cache
    await this.redis.del(`route:${schoolId}:${routeId}:students`);
  }

  /**
   * Helper: Update last seen timestamp
   */
  private async updateLastSeen(
    schoolId: string,
    studentId: string,
    routeId: string,
    vehicleId: string,
    signalStrength: number,
  ): Promise<void> {
    const cacheKey = `presence:${schoolId}:${studentId}:${routeId}`;
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      const state: StudentPresenceState = JSON.parse(cachedData);
      state.lastSeen = new Date();
      state.signalStrength = signalStrength;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(state));
    }
  }

  /**
   * Helper: Get presence state from cache
   */
  private async getPresenceState(
    schoolId: string,
    studentId: string,
    routeId: string,
  ): Promise<StudentPresenceState | null> {
    const cacheKey = `presence:${schoolId}:${studentId}:${routeId}`;
    const cachedData = await this.redis.get(cacheKey);

    if (!cachedData) {
      return null;
    }

    return JSON.parse(cachedData);
  }

  /**
   * Helper: Check for students who have alighted (not detected in latest scan)
   */
  private async checkForAlightEvents(
    schoolId: string,
    routeId: string,
    vehicleId: string,
    detectedTagIds: string[],
  ): Promise<void> {
    // Get all students currently on this route
    const routePresence = await this.getRoutePresence(routeId, schoolId);
    const boardedStudents = routePresence.filter((s) => s.status === 'BOARDED');

    for (const student of boardedStudents) {
      const state = await this.getPresenceState(schoolId, student.studentId, routeId);
      if (!state) continue;

      // Find student's tag
      const studentTags = await this.tagsService.findByStudentId(student.studentId, schoolId);
      const studentTagIds = studentTags.map((t) => t.tagId);

      // Check if any of student's tags were detected
      const wasDetected = studentTagIds.some((tagId) => detectedTagIds.includes(tagId));

      if (!wasDetected) {
        // Check if timeout exceeded
        const timeSinceLastSeen = Date.now() - new Date(state.lastSeen).getTime();
        if (timeSinceLastSeen > ALIGHT_TIMEOUT_MS) {
          // Log ALIGHT event
          await this.logPresenceEvent({
            schoolId,
            studentId: student.studentId,
            vehicleId,
            routeId,
            eventType: EventType.ALIGHT,
            timestamp: new Date(),
            source: EventSource.SMARTTAG,
            signalStrength: null,
          });
        }
      }
    }
  }

  /**
   * Get global presence stats for a school
   */
  async getStats(schoolId?: string): Promise<PresenceStatsDto> {
    const params: any[] = [];
    let schoolFilter = '';
    let schoolFilterJoin = '';

    if (schoolId) {
      schoolFilter = `WHERE "schoolId" = $1`;
      schoolFilterJoin = `AND s.school_id = $1::uuid`;
      params.push(schoolId);
    }

    // 1. Total Enrolled Students
    const totalStudentsResult = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM students s WHERE s.status = 'ENROLLED' ${schoolFilterJoin}`,
      params,
    );
    const totalStudents = parseInt(totalStudentsResult[0]?.count || '0');

    // 2. Latest status per student
    const latestEvents = await this.dataSource.query(
      `
            WITH LatestEvents AS (
                SELECT DISTINCT ON ("studentId") *
                FROM presence_event
                ${schoolFilter}
                ORDER BY "studentId", timestamp DESC
            )
            SELECT "eventType", COUNT(*) as count
            FROM LatestEvents
            GROUP BY "eventType"
        `,
      params,
    );

    let boarded = 0;
    let alighted = 0;

    latestEvents.forEach((e: any) => {
      if (e.eventType === 'BOARD') boarded = parseInt(e.count);
      if (e.eventType === 'ALIGHT') alighted = parseInt(e.count);
    });

    const unknown = Math.max(0, totalStudents - boarded - alighted);

    // 3. Stats by route
    const routeStatsRaw = await this.dataSource.query(
      `
            WITH LatestEvents AS (
                SELECT DISTINCT ON ("studentId") *
                FROM presence_event
                ${schoolFilter}
                ORDER BY "studentId", timestamp DESC
            )
            SELECT "routeId", "eventType", COUNT(*) as count
            FROM LatestEvents
            GROUP BY "routeId", "eventType"
        `,
      params,
    );

    // We need route names, so let's fetch those if possible, but for now we'll just use IDs
    const routeMap = new Map<string, RouteStatsDto>();

    routeStatsRaw.forEach((r: any) => {
      if (!routeMap.has(r.routeId)) {
        routeMap.set(r.routeId, {
          routeId: r.routeId,
          routeName: `Route ${r.routeId.substring(0, 4)}`, // Placeholder
          boarded: 0,
          alighted: 0,
        });
      }
      const stats = routeMap.get(r.routeId)!;
      if (r.eventType === 'BOARD') stats.boarded = parseInt(r.count);
      if (r.eventType === 'ALIGHT') stats.alighted = parseInt(r.count);
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
   * Get paginated presence events with student details
   */
  async getEvents(query: PresenceEventsQueryDto) {
    const limit = Math.max(1, Number(query.limit) || 10);
    const page = Math.max(1, Number(query.page) || 1);
    const offset = (page - 1) * limit;
    const schoolId = query.schoolId;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (schoolId) {
      whereClause += ` AND e."schoolId" = $${params.length + 1}`;
      params.push(schoolId);
    }

    if (query.routeId) {
      whereClause += ` AND e."routeId" = $${params.length + 1}`;
      params.push(query.routeId);
    }

    if (query.vehicleId) {
      whereClause += ` AND e."vehicleId" = $${params.length + 1}`;
      params.push(query.vehicleId);
    }

    if (query.eventType) {
      whereClause += ` AND e."eventType" = $${params.length + 1}::presence_event_eventtype_enum`;
      params.push(query.eventType);
    }

    if (query.studentName) {
      whereClause += ` AND (s.first_name ILIKE $${params.length + 1} OR s.last_name ILIKE $${params.length + 1})`;
      params.push(`%${query.studentName}%`);
    }

    const events = await this.dataSource.query(
      `
            SELECT 
                e.*,
                s.first_name as "firstName",
                s.last_name as "lastName",
                s.grade
            FROM presence_event e
            LEFT JOIN students s ON (e."studentId" = s.external_student_id)
            ${whereClause}
            ORDER BY e.timestamp DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
      [...params, limit, offset],
    );

    const totalResult = await this.dataSource.query(
      `
            SELECT COUNT(*) as count
            FROM presence_event e
            LEFT JOIN students s ON (e."studentId" = s.external_student_id)
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
