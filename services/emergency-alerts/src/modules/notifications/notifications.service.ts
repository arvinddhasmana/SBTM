import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertNotificationLog,
  NotificationChannel,
  NotificationStatus,
} from '../alerts/entities/alert-notification-log.entity';

export interface NotificationRecord {
  id: string;
  alertId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  timestamp: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(AlertNotificationLog)
    private readonly notificationLogRepo: Repository<AlertNotificationLog>,
  ) {}

  /**
   * Send a push notification to a recipient.
   * Persists the attempt for audit purposes.
   * Does not log recipient identity or message body (T4 privacy).
   */
  async sendPushNotification(
    alertId: string,
    recipientId: string,
  ): Promise<void> {
    const status = NotificationStatus.SENT;
    // TODO: integrate with FCM/OneSignal for real delivery
    await this.logNotificationAttempt(
      alertId,
      recipientId,
      NotificationChannel.PUSH,
      status,
    );
    this.logger.log(
      `PUSH notification queued for alertId=${alertId}, channel=PUSH, status=${status}`,
    );
  }

  /**
   * Persist a notification attempt record.
   */
  async logNotificationAttempt(
    alertId: string,
    recipientUserId: string,
    channel: NotificationChannel,
    status: NotificationStatus,
  ): Promise<AlertNotificationLog> {
    const log = this.notificationLogRepo.create({
      alertId,
      recipientUserId,
      channel,
      status,
    });
    return this.notificationLogRepo.save(log);
  }

  /**
   * Retrieve notification history for a parent user, scoped by schoolId.
   */
  async getParentNotifications(
    parentUserId: string,
    schoolId?: string,
  ): Promise<NotificationRecord[]> {
    const qb = this.notificationLogRepo
      .createQueryBuilder('log')
      .where('log.recipientUserId = :parentUserId', { parentUserId })
      .orderBy('log.timestamp', 'DESC')
      .take(50);

    // schoolId scoping: join with alerts table to enforce tenant boundary
    if (schoolId) {
      qb.innerJoin(
        'emergency_alert',
        'alert',
        'alert.id = log.alertId AND alert.schoolId = :schoolId',
        { schoolId },
      );
    }

    return qb.getMany();
  }
}
