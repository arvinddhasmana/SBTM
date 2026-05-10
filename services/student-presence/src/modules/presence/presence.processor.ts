import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { PresenceEvent, EventType } from './entities/presence-event.entity';
import {
  PresenceNotificationLog,
  PresenceNotificationChannel,
  PresenceNotificationStatus,
} from './entities/presence-notification-log.entity';

interface ParentRow {
  parentId: string;
  schoolId: string;
}

@Processor('presence')
export class PresenceProcessor extends WorkerHost {
  private readonly logger = new Logger(PresenceProcessor.name);

  constructor(
    @InjectRepository(PresenceNotificationLog)
    private readonly notificationLogRepo: Repository<PresenceNotificationLog>,
    private readonly dataSource: DataSource,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<{ processed: boolean; notified: boolean }> {
    this.logger.log(`Processing presence job ${job.id}, name=${job.name}`);

    if (job.name !== 'presence-event') {
      return { processed: true, notified: false };
    }

    const event = job.data as Partial<PresenceEvent>;
    const { id: eventId, studentId, routeId, schoolId, eventType } = event;

    if (!eventId || !studentId || !routeId || !schoolId) {
      this.logger.warn(`Presence job ${job.id} missing required fields — skipping`);
      return { processed: false, notified: false };
    }

    const parent = await this.findParentForStudent(studentId, schoolId);
    if (!parent) {
      this.logger.log(`No parent found for studentId (id omitted) on routeId=${routeId}`);
      return { processed: true, notified: false };
    }

    await this.persistNotification({
      presenceEventId: eventId,
      studentId,
      routeId,
      schoolId,
      recipientUserId: parent.parentId,
      eventType: eventType ?? 'UNKNOWN',
      status: PresenceNotificationStatus.PENDING,
    });

    await this.notificationsQueue.add('notification-request', {
      eventType: eventType === EventType.BOARD ? 'BOARD' : 'ALIGHT',
      eventSourceId: eventId,
      recipientUserId: parent.parentId,
      studentId,
      routeId,
      schoolId,
    });

    this.logger.log(
      `Presence notification queued: eventType=${eventType}, routeId=${routeId}, userId=${parent.parentId}`,
    );

    return { processed: true, notified: true };
  }

  /**
   * Look up the parent user ID for a given student from the students table.
   */
  private async findParentForStudent(
    studentId: string,
    schoolId: string,
  ): Promise<ParentRow | null> {
    try {
      const rows: ParentRow[] = await this.dataSource.query(
        `SELECT parent_user_id AS "parentId", school_id AS "schoolId"
                 FROM students
                 WHERE id = $1 AND school_id = $2 AND parent_user_id IS NOT NULL
                 LIMIT 1`,
        [studentId, schoolId],
      );
      return rows && rows.length > 0 ? rows[0] : null;
    } catch {
      this.logger.warn(`Could not query parent for studentId (id omitted), schoolId=${schoolId}`);
      return null;
    }
  }

  private async persistNotification(data: {
    presenceEventId: string;
    studentId: string;
    routeId: string;
    schoolId: string;
    recipientUserId: string;
    eventType: string;
    status: PresenceNotificationStatus;
  }): Promise<void> {
    const log = this.notificationLogRepo.create({
      ...data,
      channel: PresenceNotificationChannel.PUSH,
    });
    await this.notificationLogRepo.save(log);
  }
}
