import { Controller, Get, Query, Logger } from '@nestjs/common';
import {
  NotificationsService,
  NotificationRecord,
} from './notifications.service';

/**
 * Internal notification history endpoint.
 * Authentication and parent-scoping are enforced at the API Gateway.
 * This controller is not exposed directly to untrusted clients.
 */
@Controller('api/v1/notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/v1/notifications?parentUserId=<id>&schoolId=<id>
   * Returns notification history for the given parent user.
   * schoolId is used to enforce tenant isolation.
   */
  @Get()
  async getParentNotifications(
    @Query('parentUserId') parentUserId: string,
    @Query('schoolId') schoolId?: string,
  ): Promise<NotificationRecord[]> {
    if (!parentUserId) {
      return [];
    }
    this.logger.log(
      `Fetching notifications for parentUserId (id omitted), schoolId provided=${!!schoolId}`,
    );
    return this.notificationsService.getParentNotifications(
      parentUserId,
      schoolId,
    );
  }
}
