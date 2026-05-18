import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import {
  AlertDelivery,
  AlertDeliveryStatus,
} from './entities/alert-delivery.entity';
import { AlertChannel } from './entities/alert-subscription.entity';

interface ParentRow {
  parentId: string;
  schoolId: string | null;
}

/**
 * Alerts queue processor. Wire-compat: still subscribes to the `alerts` queue
 * and handles the `emergency-event` job. Tier-based escalation jobs
 * (`confirmation-timeout`, `board-escalation`, `osta-escalation`) were
 * removed in the v2 migration; the alerts service no longer enqueues them
 * and the processor returns a noop for any leftover or unknown job names.
 *
 * Per-recipient fan-out now writes to `stx_alert_deliveries` instead of the
 * v1 `alert_notification_log` table.
 */
@Processor('alerts')
export class AlertsProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(
    @InjectRepository(AlertDelivery)
    private readonly deliveriesRepo: Repository<AlertDelivery>,
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
    if (job.name === 'emergency-event') {
      return this.handleEmergencyEvent(job);
    }
    return { processed: true, recipientCount: 0 };
  }

  // ---------------------------------------------------------------------------

  private async handleEmergencyEvent(
    job: Job,
  ): Promise<{ processed: boolean; recipientCount: number }> {
    const data = job.data as {
      id?: string;
      alertId?: string;
      routeId?: string;
      schoolId?: string;
      staId?: string;
      category?: string;
      severity?: string;
      eventType?: string;
    };

    const alertId = data.id ?? data.alertId;
    const routeId = data.routeId;
    const schoolId = data.schoolId ?? data.staId;

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
      await this.recordDelivery(alertId, parent.parentId);

      await this.notificationsQueue.add('notification-request', {
        eventType: 'EMERGENCY',
        eventSourceId: alertId,
        recipientUserId: parent.parentId,
        routeId,
        schoolId: parent.schoolId ?? schoolId,
        emergencyType: data.eventType,
        category: data.category,
        severity: data.severity,
      });
      sent++;
    }

    this.logger.log(
      `Alert job ${job.id}: queued notifications for ${sent} recipients on routeId=${routeId}`,
    );
    return { processed: true, recipientCount: sent };
  }

  // ---------------------------------------------------------------------------

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

  private async recordDelivery(alertId: string, userId: string): Promise<void> {
    const row = this.deliveriesRepo.create({
      alertId,
      userId,
      channel: AlertChannel.PUSH,
      status: AlertDeliveryStatus.QUEUED,
    });
    await this.deliveriesRepo.save(row);
  }
}
