import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PreferencesService } from '../preferences/preferences.service';
import { TokensService } from '../tokens/tokens.service';
import { DeliveryLogService } from '../delivery/delivery-log.service';
import { FcmAdapter } from '../channels/fcm/fcm.adapter';
import { EmailAdapter } from '../channels/email/email.adapter';
import { SmsAdapter } from '../channels/sms/sms.adapter';

interface NotificationRequest {
  eventType: string;
  eventSourceId: string;
  recipientUserId: string;
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
    private readonly preferencesService: PreferencesService,
    private readonly tokensService: TokensService,
    private readonly deliveryLogService: DeliveryLogService,
    private readonly fcmAdapter: FcmAdapter,
    private readonly emailAdapter: EmailAdapter,
    private readonly smsAdapter: SmsAdapter,
    private readonly dataSource: DataSource,
  ) {}

  async route(request: NotificationRequest): Promise<void> {
    const { eventType, recipientUserId, schoolId } = request;

    const channels = await this.preferencesService.getEnabledChannels(
      recipientUserId,
      eventType,
    );

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
    const tokens = await this.tokensService.getActiveTokensForUser(
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
