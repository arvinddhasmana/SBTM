import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  EmergencyAlert,
  EmergencyAlertStatus,
  AlertEscalationLevel,
} from './entities/emergency-alert.entity';
import {
  AlertAuditLog,
  AlertAuditEventType,
} from './entities/alert-audit-log.entity';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationChannel,
  NotificationStatus,
} from './entities/alert-notification-log.entity';
import { AlertClassifierService } from './alert-classifier.service';
import { AlertTier } from './entities/emergency-alert.entity';

/** Delay constants for the escalation timer chain (milliseconds). */
const CONFIRMATION_TIMEOUT_MS = 120_000; // 2 minutes
const BOARD_ESCALATION_MS = 300_000; // 5 minutes
const OSTA_ESCALATION_MS = 900_000; // 15 minutes

/** Shape returned by findForRoute — used by the parent-app API endpoint. */
export interface RouteAlertView {
  routeId: string;
  alertActive: boolean;
  message: string;
  id?: string;
  vehicleId?: string;
  eventType?: string;
  description?: string | null;
  status?: string;
  lat?: number;
  lng?: number;
  createdAt?: Date;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  LATE_ARRIVAL: 'Late Arrival',
  ROUTE_DEVIATION: 'Route Deviation',
  PANIC_BUTTON: 'Panic Button',
  INCIDENT: 'Incident',
  ROUTE_DIVERSION: 'Route Diversion',
  PANIC_ALERT: 'Panic Alert',
  MEDICAL: 'Medical',
  LATE_DEPARTURE: 'Late Departure',
  COMPLIANCE: 'Compliance',
  OTHER: 'Other',
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(EmergencyAlert)
    private alertsRepo: Repository<EmergencyAlert>,
    @InjectRepository(AlertAuditLog)
    private auditLogRepo: Repository<AlertAuditLog>,
    @InjectQueue('alerts') private alertsQueue: Queue,
    private wsGateway: WebsocketGateway,
    private notificationsService: NotificationsService,
    private classifierService: AlertClassifierService,
  ) {}

  async create(createDto: CreateEmergencyEventDto): Promise<EmergencyAlert> {
    const tier = this.classifierService.classify(createDto.eventType);

    const alert = this.alertsRepo.create({
      ...createDto,
      tier,
      status:
        tier === AlertTier.TIER_1
          ? EmergencyAlertStatus.PENDING_CONFIRMATION
          : EmergencyAlertStatus.ACTIVE,
    });
    const savedAlert = await this.alertsRepo.save(alert);

    // Log CREATED audit event
    await this.writeAuditLog(savedAlert.id, AlertAuditEventType.CREATED, {
      escalationLevel: AlertEscalationLevel.SCHOOL,
    });

    if (tier === AlertTier.TIER_1) {
      // Tier 1: Hold parent notification until admin confirms or timer fires.
      await this.writeAuditLog(
        savedAlert.id,
        AlertAuditEventType.PENDING_CONFIRMATION,
        { escalationLevel: AlertEscalationLevel.SCHOOL },
      );

      // Schedule escalation timer chain (state-guarded in processor).
      await this.alertsQueue.add(
        'confirmation-timeout',
        {
          alertId: savedAlert.id,
          routeId: savedAlert.routeId,
          schoolId: savedAlert.schoolId,
          eventType: savedAlert.eventType,
        },
        { delay: CONFIRMATION_TIMEOUT_MS },
      );
      await this.alertsQueue.add(
        'board-escalation',
        {
          alertId: savedAlert.id,
          routeId: savedAlert.routeId,
          schoolId: savedAlert.schoolId,
        },
        { delay: BOARD_ESCALATION_MS },
      );
      await this.alertsQueue.add(
        'osta-escalation',
        {
          alertId: savedAlert.id,
          routeId: savedAlert.routeId,
          schoolId: savedAlert.schoolId,
        },
        { delay: OSTA_ESCALATION_MS },
      );
    } else if (tier === AlertTier.TIER_2) {
      // Tier 2: Admin-only alert. No parent notification.
      this.logger.log(
        `Tier 2 alert created: alertId=${savedAlert.id}, eventType=${savedAlert.eventType}`,
      );
    } else {
      // Tier 3: Bypass confirmation — deliver directly to parents.
      await this.alertsQueue.add('emergency-event', savedAlert);

      await this.notificationsService.logNotificationAttempt(
        savedAlert.id,
        'route:' + createDto.routeId,
        NotificationChannel.PUSH,
        NotificationStatus.SENT,
      );
    }

    // Broadcast to admin WebSocket subscribers for all tiers.
    this.wsGateway.broadcastAlert(savedAlert);

    return savedAlert;
  }

  /**
   * School Admin confirms a Tier 1 alert. Triggers parent notification.
   */
  async confirm(
    alertId: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<EmergencyAlert> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.status = EmergencyAlertStatus.CONFIRMED;
    alert.confirmedBy = actorUserId ?? null;
    alert.confirmedAt = new Date();
    const saved = await this.alertsRepo.save(alert);

    await this.writeAuditLog(alertId, AlertAuditEventType.CONFIRMED, {
      actorUserId,
      actorRole,
      escalationLevel: AlertEscalationLevel.SCHOOL,
    });

    // Fan out to parents now that the alert is confirmed.
    await this.alertsQueue.add('emergency-event', saved);
    await this.notificationsService.logNotificationAttempt(
      saved.id,
      'route:' + saved.routeId,
      NotificationChannel.PUSH,
      NotificationStatus.SENT,
    );

    this.wsGateway.broadcastAlert(saved);
    return saved;
  }

  /**
   * School Admin marks the alert as a false alarm. Suppresses parent notification.
   */
  async falseAlarm(
    alertId: string,
    actorUserId?: string,
    actorRole?: string,
    notes?: string,
  ): Promise<EmergencyAlert> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.status = EmergencyAlertStatus.FALSE_ALARM;
    const saved = await this.alertsRepo.save(alert);

    await this.writeAuditLog(alertId, AlertAuditEventType.FALSE_ALARM, {
      actorUserId,
      actorRole,
      notes,
      escalationLevel: AlertEscalationLevel.SCHOOL,
    });

    this.wsGateway.broadcastAlert(saved);
    return saved;
  }

  /**
   * School Admin requests more information about a Tier 1 alert.
   * Logs the event; the BullMQ delayed jobs continue running.
   */
  async requestInfo(
    alertId: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<EmergencyAlert> {
    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    await this.writeAuditLog(alertId, AlertAuditEventType.INFO_REQUESTED, {
      actorUserId,
      actorRole,
      escalationLevel: AlertEscalationLevel.SCHOOL,
    });

    return alert;
  }

  /**
   * Retrieve the full audit trail for a specific alert.
   * Returns IDs and event metadata only — no T4 PII.
   */
  async getAuditLog(alertId: string): Promise<AlertAuditLog[]> {
    return this.auditLogRepo.find({
      where: { alertId },
      order: { eventTimestamp: 'ASC' },
    });
  }

  async findAll(schoolId?: string): Promise<EmergencyAlert[]> {
    const where = schoolId ? { schoolId } : {};
    return this.alertsRepo.find({ where, order: { timestamp: 'DESC' } });
  }

  async findAllActive(schoolId?: string): Promise<EmergencyAlert[]> {
    // Include PENDING_CONFIRMATION alerts — they are operationally "active"
    // and must be visible to admins for confirmation action.
    const statuses = [
      EmergencyAlertStatus.ACTIVE,
      EmergencyAlertStatus.PENDING_CONFIRMATION,
    ];
    if (schoolId) {
      return this.alertsRepo
        .createQueryBuilder('a')
        .where('a.schoolId = :schoolId', { schoolId })
        .andWhere('a.status IN (:...statuses)', { statuses })
        .orderBy('a.timestamp', 'DESC')
        .getMany();
    }
    return this.alertsRepo
      .createQueryBuilder('a')
      .where('a.status IN (:...statuses)', { statuses })
      .orderBy('a.timestamp', 'DESC')
      .getMany();
  }

  async resolve(id: string): Promise<EmergencyAlert> {
    const alert = await this.alertsRepo.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }
    alert.status = EmergencyAlertStatus.RESOLVED;
    const resolved = await this.alertsRepo.save(alert);

    await this.writeAuditLog(id, AlertAuditEventType.RESOLVED);

    // Broadcast resolution via SSE/WebSocket so clients get real-time updates.
    this.wsGateway.broadcastAlert(resolved);

    return resolved;
  }

  async findOne(id: string): Promise<EmergencyAlert | null> {
    return this.alertsRepo.findOneBy({ id });
  }

  async findForRoute(routeId: string): Promise<RouteAlertView> {
    const activeAlert = await this.alertsRepo.findOne({
      where: { routeId, status: EmergencyAlertStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (activeAlert) {
      const label =
        EVENT_TYPE_LABELS[activeAlert.eventType] || activeAlert.eventType;
      const message =
        activeAlert.description ||
        `${label}: ${activeAlert.vehicleId} on route ${routeId}`;

      return {
        id: activeAlert.id,
        routeId,
        vehicleId: activeAlert.vehicleId,
        eventType: activeAlert.eventType,
        description: activeAlert.description || null,
        message,
        status: activeAlert.status,
        lat: activeAlert.lat,
        lng: activeAlert.lng,
        createdAt: activeAlert.createdAt,
        alertActive: true,
      };
    }

    return {
      routeId,
      alertActive: false,
      message: 'No active alerts.',
    };
  }

  async findByRoutes(routeIds: string[]): Promise<EmergencyAlert[]> {
    if (routeIds.length === 0) return [];
    return this.alertsRepo.find({
      where: { routeId: In(routeIds) },
      order: { createdAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async writeAuditLog(
    alertId: string,
    eventType: AlertAuditEventType,
    opts: {
      actorUserId?: string;
      actorRole?: string;
      notes?: string;
      escalationLevel?: string;
    } = {},
  ): Promise<void> {
    const entry = this.auditLogRepo.create({
      alertId,
      eventType,
      actorUserId: opts.actorUserId ?? null,
      actorRole: opts.actorRole ?? null,
      notes: opts.notes ?? null,
      escalationLevel: opts.escalationLevel ?? null,
    });
    await this.auditLogRepo.save(entry);
  }
}
