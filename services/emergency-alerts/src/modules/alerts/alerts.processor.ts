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

    if (job.name !== 'emergency-event') {
      return { processed: true, recipientCount: 0 };
    }

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
   * Look up all parent user IDs assigned to a given route.
   * Tries students_reference first (demo data), falls back to students table.
   */
  private async findParentsForRoute(
    routeId: string,
    schoolId?: string,
  ): Promise<ParentRow[]> {
    try {
      const rows: ParentRow[] = await this.dataSource.query(
        `SELECT DISTINCT "parentId" AS "parentId", "schoolId" AS "schoolId"
                 FROM students_reference
                 WHERE "assignedRouteId" = $1 AND "parentId" IS NOT NULL`,
        [routeId],
      );
      if (rows.length > 0) {
        return rows;
      }
    } catch {
      // students_reference table may not exist; fall through to students table
    }

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
      this.logger.warn(
        `Could not query parent lookup tables for routeId=${routeId}`,
      );
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
}
