import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationDeliveryLog } from './entities/notification-delivery-log.entity';

@Injectable()
export class DeliveryLogService {
  private readonly logger = new Logger(DeliveryLogService.name);

  constructor(
    @InjectRepository(NotificationDeliveryLog)
    private readonly logRepo: Repository<NotificationDeliveryLog>,
  ) {}

  async create(data: {
    boardId?: string | null;
    schoolId?: string | null;
    recipientUserId: string;
    eventType: string;
    eventSourceId: string;
    channel: string;
    status: string;
    providerMessageId?: string;
    failureReason?: string;
  }): Promise<NotificationDeliveryLog> {
    const log = this.logRepo.create({
      boardId: data.boardId ?? null,
      schoolId: data.schoolId ?? null,
      recipientUserId: data.recipientUserId,
      eventType: data.eventType,
      eventSourceId: data.eventSourceId,
      channel: data.channel,
      status: data.status,
      providerMessageId: data.providerMessageId ?? null,
      failureReason: data.failureReason ?? null,
    });
    return this.logRepo.save(log);
  }

  async updateStatus(
    logId: string,
    status: string,
    providerMessageId?: string,
    failureReason?: string,
  ): Promise<void> {
    await this.logRepo.update(logId, {
      status,
      ...(providerMessageId && { providerMessageId }),
      ...(failureReason && { failureReason }),
    });
  }

  async getForUser(
    userId: string,
    limit = 50,
  ): Promise<NotificationDeliveryLog[]> {
    return this.logRepo.find({
      where: { recipientUserId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
