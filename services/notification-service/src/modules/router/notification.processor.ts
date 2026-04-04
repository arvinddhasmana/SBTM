import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationRouterService } from './notification-router.service';

@Processor('notifications', {
  concurrency: 5,
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationRouter: NotificationRouterService) {
    super();
  }

  async process(job: Job): Promise<{ processed: boolean }> {
    this.logger.log(`Processing notification job ${job.id}, name=${job.name}`);

    if (job.name !== 'notification-request') {
      return { processed: true };
    }

    const request = job.data as {
      eventType: string;
      eventSourceId: string;
      recipientUserId: string;
      schoolId: string;
      routeId?: string;
      studentId?: string;
      emergencyType?: string;
    };

    if (!request.eventType || !request.recipientUserId || !request.schoolId) {
      this.logger.warn(
        `Notification job ${job.id} missing required fields — skipping`,
      );
      return { processed: false };
    }

    await this.notificationRouter.route(request);

    this.logger.log(
      `Notification job ${job.id} completed: eventType=${request.eventType}, userId=${request.recipientUserId}`,
    );
    return { processed: true };
  }
}
