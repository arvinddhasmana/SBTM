
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Job } from 'bullmq';
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

        const message =
            eventType === EventType.BOARD
                ? 'Your child has boarded the bus.'
                : 'Your child has alighted from the bus.';

        // TODO: integrate with real push/SMS delivery channel
        await this.persistNotification({
            presenceEventId: eventId,
            studentId,
            routeId,
            schoolId,
            recipientUserId: parent.parentId,
            eventType: eventType ?? 'UNKNOWN',
            status: PresenceNotificationStatus.SENT,
        });

        this.logger.log(
            `Presence notification persisted: eventType=${eventType}, routeId=${routeId}, status=SENT. Message length=${message.length}`,
        );

        return { processed: true, notified: true };
    }

    /**
     * Look up the parent user ID for a given student.
     * Tries students_reference first (demo data), falls back to students table.
     */
    private async findParentForStudent(
        studentId: string,
        schoolId: string,
    ): Promise<ParentRow | null> {
        try {
            const rows: ParentRow[] = await this.dataSource.query(
                `SELECT "parentId" AS "parentId", "schoolId" AS "schoolId"
                 FROM students_reference
                 WHERE id = $1 AND "schoolId" = $2 AND "parentId" IS NOT NULL
                 LIMIT 1`,
                [studentId, schoolId],
            );
            if (rows && rows.length > 0) {
                return rows[0];
            }
        } catch {
            // students_reference may not exist; fall through
        }

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
