import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertDelivery,
  AlertDeliveryStatus,
} from '../alerts/entities/alert-delivery.entity';
import { AlertChannel } from '../alerts/entities/alert-subscription.entity';

/**
 * Wire-compat enums. Internally we always persist to `stx_alert_deliveries`
 * using `AlertChannel`/`AlertDeliveryStatus`. The string-valued aliases below
 * preserve the call signatures used by `AlertsService` and the historical
 * NotificationsService API.
 */
export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}

export interface NotificationRecord {
  id: string;
  alertId: string;
  recipientUserId: string;
  channel: AlertChannel;
  status: AlertDeliveryStatus;
  timestamp: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(AlertDelivery)
    private readonly deliveriesRepo: Repository<AlertDelivery>,
  ) {}

  async sendPushNotification(
    alertId: string,
    recipientId: string,
  ): Promise<void> {
    await this.logNotificationAttempt(
      alertId,
      recipientId,
      NotificationChannel.PUSH,
      NotificationStatus.SENT,
    );
    this.logger.log(
      `PUSH notification queued for alertId=${alertId}, channel=PUSH`,
    );
  }

  /**
   * Persist a delivery attempt as a `stx_alert_deliveries` row.
   * Accepts the legacy v1 string enums and maps them to v2 values.
   */
  async logNotificationAttempt(
    alertId: string,
    recipientUserId: string,
    channel: NotificationChannel | AlertChannel,
    status: NotificationStatus | AlertDeliveryStatus,
  ): Promise<AlertDelivery> {
    const row = this.deliveriesRepo.create({
      alertId,
      userId: recipientUserId,
      channel: channel as AlertChannel,
      status: status as AlertDeliveryStatus,
    });
    return this.deliveriesRepo.save(row);
  }

  /**
   * Retrieve recent delivery history for a parent user, scoped by staId.
   */
  async getParentNotifications(
    parentUserId: string,
    staId?: string,
  ): Promise<NotificationRecord[]> {
    const qb = this.deliveriesRepo
      .createQueryBuilder('d')
      .where('d.user_id = :parentUserId', { parentUserId })
      .orderBy('d.created_at', 'DESC')
      .take(50);

    if (staId) {
      qb.innerJoin(
        'stx_alerts',
        'a',
        'a.id = d.alert_id AND a.sta_id = :staId',
        { staId },
      );
    }

    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      alertId: r.alertId,
      recipientUserId: r.userId,
      channel: r.channel,
      status: r.status,
      timestamp: r.createdAt,
    }));
  }
}
