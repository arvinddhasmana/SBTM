import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HttpClientService } from '../../../common/utils/http-client.service';

@Injectable()
export class RouteChangeNotifierService {
  private readonly logger = new Logger(RouteChangeNotifierService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      '',
    );
  }

  /**
   * Notify all parents of students on a given route about a route change.
   * Queries operational students table for students with am_route_id or pm_route_id matching routeId,
   * then sends a notification to each distinct parent.
   */
  async notifyRouteChange(
    routeId: string,
    changeDescription: string,
    schoolId: string,
  ): Promise<void> {
    this.logger.log('Notifying parents of route change', {
      routeId,
      schoolId,
      changeDescription,
      action: 'route-change.notify',
    });

    if (!this.notificationServiceUrl) {
      this.logger.debug(
        'NOTIFICATION_SERVICE_URL not configured, skipping route change notification',
      );
      return;
    }

    // Find all distinct parent user IDs for students on this route
    const rows: Array<{ parentId: string }> = await this.dataSource.query(
      `SELECT DISTINCT parent_user_id as "parentId"
       FROM students
       WHERE (am_route_id = $1 OR pm_route_id = $1)
         AND parent_user_id IS NOT NULL`,
      [routeId],
    );

    if (rows.length === 0) {
      this.logger.log('No parents found for route change notification', {
        routeId,
      });
      return;
    }

    const parentUserIds = rows.map((r) => r.parentId);
    this.logger.log(
      `Sending route change notifications to ${parentUserIds.length} parent(s)`,
      { routeId },
    );

    const url = `${this.notificationServiceUrl}/api/v1/notifications/send`;

    for (const parentUserId of parentUserIds) {
      try {
        await this.httpClient.post(url, {
          eventType: 'ROUTE_CHANGE',
          eventSourceId: routeId,
          recipientUserId: parentUserId,
          schoolId,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send route change notification to parent ${parentUserId}`,
          { routeId, error: (error as Error).message },
        );
      }
    }
  }
}
