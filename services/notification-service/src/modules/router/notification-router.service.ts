import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TokensService } from '../tokens/tokens.service';
import { DeliveryLogService } from '../delivery/delivery-log.service';
import { FcmAdapter } from '../channels/fcm/fcm.adapter';
import { EmailAdapter } from '../channels/email/email.adapter';
import { SmsAdapter } from '../channels/sms/sms.adapter';
import type { DeviceTokenRecipientKind } from '../tokens/entities/device-token.entity';

interface NotificationRequest {
  eventType: string;
  eventSourceId: string;
  recipientUserId: string;
  /**
   * v2-followups #6: defaults to 'user' (admin/driver). Parent-app flows
   * should pass 'guardian' so token lookup keys off stx_guardians.id.
   */
  recipientKind?: DeviceTokenRecipientKind;
  schoolId: string;
  routeId?: string;
  studentId?: string;
  emergencyType?: string;
}

interface UserContact {
  email: string | null;
  phone: string | null;
}

@Injectable()
export class NotificationRouterService {
  private readonly logger = new Logger(NotificationRouterService.name);

  constructor(
    private readonly tokensService: TokensService,
    private readonly deliveryLogService: DeliveryLogService,
    private readonly fcmAdapter: FcmAdapter,
    private readonly emailAdapter: EmailAdapter,
    private readonly smsAdapter: SmsAdapter,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * TODO(phase-B): wire to stx_alert_subscriptions via api-gateway.
   * v1 NotificationPreference was removed in the SBTM v2 cutover; per-channel
   * subscription enforcement now lives in stx_alert_subscriptions and will be
   * resolved upstream by the api-gateway in a future slice. Until then this
   * service defaults to permissive delivery (send on all channels) with the
   * existing EMERGENCY-always-on / push-fallback-to-SMS behaviour.
   */
  private getEnabledChannels(eventType: string): string[] {
    if (eventType === 'EMERGENCY') {
      return ['PUSH', 'SMS'];
    }
    return ['PUSH', 'EMAIL', 'SMS'];
  }

  async route(request: NotificationRequest): Promise<void> {
    const { eventType, recipientUserId } = request;

    const channels = this.getEnabledChannels(eventType);

    this.logger.log(
      `Routing notification: eventType=${eventType}, userId=${recipientUserId}, channels=[${channels.join(',')}]`,
    );

    const { title, body } = this.buildMessage(request);
    let pushFailed = false;

    for (const channel of channels) {
      switch (channel) {
        case 'PUSH':
          pushFailed = !(await this.deliverPush(request, title, body));
          break;
        case 'EMAIL':
          await this.deliverEmail(request, title, body);
          break;
        case 'SMS':
          await this.deliverSms(request, body);
          break;
      }
    }

    if (pushFailed && eventType === 'EMERGENCY' && !channels.includes('SMS')) {
      this.logger.log(
        `Push failed for EMERGENCY — escalating to SMS for userId=${recipientUserId}`,
      );
      await this.deliverSms(request, body);
    }
  }

  private buildMessage(request: NotificationRequest): {
    title: string;
    body: string;
  } {
    switch (request.eventType) {
      case 'BOARD':
        return {
          title: 'Child Boarded',
          body: 'Your child has boarded the bus.',
        };
      case 'ALIGHT':
        return {
          title: 'Child Alighted',
          body: 'Your child has alighted from the bus.',
        };
      case 'EMERGENCY':
        return {
          title: 'Emergency Alert',
          body: `Emergency reported on your child's bus route: ${request.emergencyType ?? 'ALERT'}`,
        };
      case 'ROUTE_CHANGE':
        return {
          title: 'Route Update',
          body: 'A route your child uses has been updated. Please check the app for details.',
        };
      case 'ABSENCE_REPORTED':
        return {
          title: 'Absence Reported',
          body: 'A student absence has been reported for your route.',
        };
      case 'ABSENCE_CONFIRMED':
        return {
          title: 'Absence Confirmed',
          body: 'The absence report has been confirmed.',
        };
      default:
        return {
          title: 'Bus Notification',
          body: `Update for your child's bus route.`,
        };
    }
  }

  private async deliverPush(
    request: NotificationRequest,
    title: string,
    body: string,
  ): Promise<boolean> {
    const tokens = await this.tokensService.getActiveTokensForRecipient(
      request.recipientKind ?? 'user',
      request.recipientUserId,
    );

    if (tokens.length === 0) {
      this.logger.log(
        `No active device tokens for userId=${request.recipientUserId}`,
      );
      await this.deliveryLogService.create({
        schoolId: request.schoolId,
        recipientUserId: request.recipientUserId,
        eventType: request.eventType,
        eventSourceId: request.eventSourceId,
        channel: 'PUSH',
        status: 'FAILED',
        failureReason: 'NO_DEVICE_TOKENS',
      });
      return false;
    }

    const results = await this.fcmAdapter.sendToDevices(
      tokens.map((t) => t.token),
      {
        title,
        body,
        data: {
          eventType: request.eventType,
          eventSourceId: request.eventSourceId,
        },
      },
    );

    let anySuccess = false;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      if (result.error === 'INVALID_TOKEN') {
        await this.tokensService.deactivateByToken(tokens[i].token);
      }

      await this.deliveryLogService.create({
        schoolId: request.schoolId,
        recipientUserId: request.recipientUserId,
        eventType: request.eventType,
        eventSourceId: request.eventSourceId,
        channel: 'PUSH',
        status: result.success ? 'SENT' : 'FAILED',
        providerMessageId: result.messageId,
        failureReason: result.error,
      });

      if (result.success) anySuccess = true;
    }

    return anySuccess;
  }

  private async deliverEmail(
    request: NotificationRequest,
    title: string,
    body: string,
  ): Promise<void> {
    const contact = await this.getUserContact(request.recipientUserId);
    if (!contact.email) {
      await this.deliveryLogService.create({
        schoolId: request.schoolId,
        recipientUserId: request.recipientUserId,
        eventType: request.eventType,
        eventSourceId: request.eventSourceId,
        channel: 'EMAIL',
        status: 'FAILED',
        failureReason: 'NO_EMAIL_ADDRESS',
      });
      return;
    }

    const htmlBody = `<h2>${title}</h2><p>${body}</p><p><em>SBTM Parent Notification</em></p>`;
    const result = await this.emailAdapter.send(contact.email, title, htmlBody);

    await this.deliveryLogService.create({
      schoolId: request.schoolId,
      recipientUserId: request.recipientUserId,
      eventType: request.eventType,
      eventSourceId: request.eventSourceId,
      channel: 'EMAIL',
      status: result.success ? 'SENT' : 'FAILED',
      providerMessageId: result.messageId,
      failureReason: result.error,
    });
  }

  private async deliverSms(
    request: NotificationRequest,
    body: string,
  ): Promise<void> {
    const contact = await this.getUserContact(request.recipientUserId);
    if (!contact.phone) {
      await this.deliveryLogService.create({
        schoolId: request.schoolId,
        recipientUserId: request.recipientUserId,
        eventType: request.eventType,
        eventSourceId: request.eventSourceId,
        channel: 'SMS',
        status: 'FAILED',
        failureReason: 'NO_PHONE_NUMBER',
      });
      return;
    }

    const result = await this.smsAdapter.send(contact.phone, body);

    await this.deliveryLogService.create({
      schoolId: request.schoolId,
      recipientUserId: request.recipientUserId,
      eventType: request.eventType,
      eventSourceId: request.eventSourceId,
      channel: 'SMS',
      status: result.success ? 'SENT' : 'FAILED',
      providerMessageId: result.messageId,
      failureReason: result.error,
    });
  }

  private async getUserContact(userId: string): Promise<UserContact> {
    try {
      const rows: { email: string; phone: string | null }[] =
        await this.dataSource.query(
          `SELECT email, phone FROM users WHERE id = $1 LIMIT 1`,
          [userId],
        );
      if (rows.length > 0) {
        return { email: rows[0].email, phone: rows[0].phone };
      }
    } catch {
      this.logger.warn(`Could not fetch contact for userId=${userId}`);
    }
    return { email: null, phone: null };
  }
}
