import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import {
  AlertNotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/alert-notification-log.entity';
import {
  EmergencyAlert,
  EmergencyAlertStatus,
  AlertEscalationLevel,
} from './entities/emergency-alert.entity';
import {
  AlertAuditLog,
  AlertAuditEventType,
} from './entities/alert-audit-log.entity';

interface ParentRow {
  parentId: string;
  schoolId: string | null;
}

@Processor('alerts')
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    @InjectRepository(AlertNotificationLog)
    private readonly notificationLogRepo: Repository<AlertNotificationLog>,
    @InjectRepository(EmergencyAlert)
    private readonly alertsRepo: Repository<EmergencyAlert>,
    @InjectRepository(AlertAuditLog)
    private readonly auditLogRepo: Repository<AlertAuditLog>,
    private readonly dataSource: DataSource,
    @InjectQueue('notifications')
    private readonly notificationsQueue: Queue,
  ) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ processed: boolean; recipientCount: number }> {
    this.logger.log(`Processing alert job ${job.id}, name=${job.name}`);

    switch (job.name) {
      case 'emergency-event':
        return this.handleEmergencyEvent(job);
      case 'confirmation-timeout':
        return this.handleConfirmationTimeout(job);
      case 'board-escalation':
        return this.handleBoardEscalation(job);
      case 'osta-escalation':
        return this.handleStaEscalation(job);
      default:
        return { processed: true, recipientCount: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // Job handlers
  // ---------------------------------------------------------------------------

  private async handleEmergencyEvent(
    job: Job,
  ): Promise<{ processed: boolean; recipientCount: number }> {
    const alert = job.data as {
      id?: string;
      alertId?: string;
      routeId?: string;
      schoolId?: string;
      eventType?: string;
    };

    const alertId = alert.id ?? alert.alertId;
    const routeId = alert.routeId;
    const schoolId = alert.schoolId;

    if (!alertId || !routeId) {
      this.logger.warn(
        `Alert job ${job.id} missing alertId or routeId — skipping fan-out`,
      );
      return { processed: false, recipientCount: 0 };
    }

    const parents = await this.findParentsForRoute(routeId, schoolId);

    if (parents.length === 0) {
      this.logger.log(`No parent recipients found for routeId=${routeId}`);
      return { processed: true, recipientCount: 0 };
    }

    let sent = 0;
    for (const parent of parents) {
      await this.logNotification(
        alertId,
        parent.parentId,
        NotificationStatus.PENDING,
      );

      await this.notificationsQueue.add('notification-request', {
        eventType: 'EMERGENCY',
        eventSourceId: alertId,
        recipientUserId: parent.parentId,
        routeId,
        schoolId: parent.schoolId ?? schoolId,
        emergencyType: alert.eventType,
      });
      sent++;
    }

    this.logger.log(
      `Alert job ${job.id}: queued notifications for ${sent} recipients on routeId=${routeId}`,
    );
    return { processed: true, recipientCount: sent };
  }

  /**
   * Handles the 2-minute confirmation timeout for Tier 1 alerts.
   * If the alert is still PENDING_CONFIRMATION, auto-escalates to parents.
   * State guard: if the alert has already been confirmed/resolved/false-alarmed,
   * this job is a no-op.
   */
  private async handleConfirmationTimeout(
    job: Job,
  ): Promise<{ processed: boolean; recipientCount: number }> {
    const { alertId, routeId, schoolId, eventType } = job.data as {
      alertId: string;
      routeId: string;
      schoolId: string;
      eventType: string;
    };

    if (!alertId) {
      this.logger.warn(
        `confirmation-timeout job ${job.id} missing alertId — skipping`,
      );
      return { processed: false, recipientCount: 0 };
    }

    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      this.logger.warn(
        `confirmation-timeout: alert ${alertId} not found — skipping`,
      );
      return { processed: false, recipientCount: 0 };
    }

    // State guard: only auto-escalate if still waiting for confirmation.
    if (alert.status !== EmergencyAlertStatus.PENDING_CONFIRMATION) {
      this.logger.log(
        `confirmation-timeout: alert ${alertId} already handled (status=${alert.status}) — skipping`,
      );
      return { processed: true, recipientCount: 0 };
    }

    // Update status and record escalation timestamp.
    // escalationLevel=SCHOOL records that this alert is still within the school
    // tier of the escalation chain (auto-escalated to parents, not yet escalated
    // to Board or STA admins). The board-escalation job will advance this to BOARD.
    alert.status = EmergencyAlertStatus.AUTO_ESCALATED;
    alert.autoEscalatedAt = new Date();
    alert.escalationLevel = AlertEscalationLevel.SCHOOL;
    await this.alertsRepo.save(alert);

    await this.writeAuditLog(alertId, AlertAuditEventType.AUTO_ESCALATED, {
      escalationLevel: AlertEscalationLevel.SCHOOL,
      notes: 'Auto-escalated after 2-minute confirmation timeout',
    });

    this.logger.log(
      `Auto-escalating alert ${alertId} to parents after confirmation timeout`,
    );

    // Fan out to parents.
    await this.notificationsQueue.add('notification-request', {
      eventType: 'EMERGENCY_AUTO_ESCALATED',
      eventSourceId: alertId,
      routeId,
      schoolId,
      emergencyType: eventType,
    });

    return { processed: true, recipientCount: 1 };
  }

  /**
   * Handles the 5-minute Board Admin escalation for unacknowledged Tier 1 alerts.
   * State guard: only escalates if the alert is still PENDING_CONFIRMATION.
   */
  private async handleBoardEscalation(
    job: Job,
  ): Promise<{ processed: boolean; recipientCount: number }> {
    const { alertId, schoolId } = job.data as {
      alertId: string;
      schoolId: string;
    };

    if (!alertId) {
      this.logger.warn(
        `board-escalation job ${job.id} missing alertId — skipping`,
      );
      return { processed: false, recipientCount: 0 };
    }

    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      this.logger.warn(
        `board-escalation: alert ${alertId} not found — skipping`,
      );
      return { processed: false, recipientCount: 0 };
    }

    // State guard: Board escalation only if still unacknowledged.
    if (alert.status !== EmergencyAlertStatus.PENDING_CONFIRMATION) {
      this.logger.log(
        `board-escalation: alert ${alertId} already handled (status=${alert.status}) — skipping`,
      );
      return { processed: true, recipientCount: 0 };
    }

    alert.escalationLevel = AlertEscalationLevel.BOARD;
    await this.alertsRepo.save(alert);

    await this.writeAuditLog(alertId, AlertAuditEventType.BOARD_ESCALATED, {
      escalationLevel: AlertEscalationLevel.BOARD,
      notes: 'Unacknowledged after 5 minutes — escalated to Board Admin',
    });

    await this.notificationsQueue.add('notification-request', {
      eventType: 'EMERGENCY_BOARD_ESCALATION',
      eventSourceId: alertId,
      schoolId,
      escalationLevel: AlertEscalationLevel.BOARD,
    });

    this.logger.log(
      `Board escalation triggered for alert ${alertId} (schoolId=${schoolId})`,
    );
    return { processed: true, recipientCount: 1 };
  }

  /**
   * Handles the 15-minute STA Admin escalation for unacknowledged Tier 1 alerts.
   * State guard: only escalates if the alert is still PENDING_CONFIRMATION.
   */
  private async handleStaEscalation(
    job: Job,
  ): Promise<{ processed: boolean; recipientCount: number }> {
    const { alertId, schoolId } = job.data as {
      alertId: string;
      schoolId: string;
    };

    if (!alertId) {
      this.logger.warn(
        `osta-escalation job ${job.id} missing alertId — skipping`,
      );
      return { processed: false, recipientCount: 0 };
    }

    const alert = await this.alertsRepo.findOneBy({ id: alertId });
    if (!alert) {
      this.logger.warn(
        `osta-escalation: alert ${alertId} not found — skipping`,
      );
      return { processed: false, recipientCount: 0 };
    }

    // State guard: STA escalation only if still unacknowledged.
    if (alert.status !== EmergencyAlertStatus.PENDING_CONFIRMATION) {
      this.logger.log(
        `osta-escalation: alert ${alertId} already handled (status=${alert.status}) — skipping`,
      );
      return { processed: true, recipientCount: 0 };
    }

    alert.escalationLevel = AlertEscalationLevel.STA;
    await this.alertsRepo.save(alert);

    await this.writeAuditLog(alertId, AlertAuditEventType.STA_ESCALATED, {
      escalationLevel: AlertEscalationLevel.STA,
      notes: 'Unacknowledged after 15 minutes — escalated to STA Admin',
    });

    await this.notificationsQueue.add('notification-request', {
      eventType: 'EMERGENCY_STA_ESCALATION',
      eventSourceId: alertId,
      schoolId,
      escalationLevel: AlertEscalationLevel.STA,
    });

    this.logger.log(
      `STA escalation triggered for alert ${alertId} (schoolId=${schoolId})`,
    );
    return { processed: true, recipientCount: 1 };
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  /**
   * Look up all parent user IDs assigned to a given route from the students table.
   */
  private async findParentsForRoute(
    routeId: string,
    schoolId?: string,
  ): Promise<ParentRow[]> {
    try {
      const query = schoolId
        ? `SELECT DISTINCT parent_user_id AS "parentId", school_id AS "schoolId"
                   FROM students
                   WHERE (am_route_id = $1 OR pm_route_id = $1)
                     AND school_id = $2
                     AND parent_user_id IS NOT NULL`
        : `SELECT DISTINCT parent_user_id AS "parentId", school_id AS "schoolId"
                   FROM students
                   WHERE (am_route_id = $1 OR pm_route_id = $1)
                     AND parent_user_id IS NOT NULL`;

      const params: string[] = schoolId ? [routeId, schoolId] : [routeId];
      const rows: ParentRow[] = await this.dataSource.query(query, params);
      return rows ?? [];
    } catch {
      this.logger.warn(`Could not query students table for routeId=${routeId}`);
      return [];
    }
  }

  private async logNotification(
    alertId: string,
    recipientUserId: string,
    status: NotificationStatus,
  ): Promise<void> {
    const log = this.notificationLogRepo.create({
      alertId,
      recipientUserId,
      channel: NotificationChannel.PUSH,
      status,
    });
    await this.notificationLogRepo.save(log);
  }

  private async writeAuditLog(
    alertId: string,
    eventType: AlertAuditEventType,
    opts: { escalationLevel?: string; notes?: string } = {},
  ): Promise<void> {
    const entry = this.auditLogRepo.create({
      alertId,
      eventType,
      actorUserId: null,
      actorRole: 'SYSTEM',
      notes: opts.notes ?? null,
      escalationLevel: opts.escalationLevel ?? null,
    });
    await this.auditLogRepo.save(entry);
  }
}
