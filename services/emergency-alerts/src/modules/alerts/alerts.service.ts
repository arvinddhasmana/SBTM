import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmergencyAlert,
  EmergencyAlertStatus,
} from './entities/emergency-alert.entity';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationChannel,
  NotificationStatus,
} from './entities/alert-notification-log.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(EmergencyAlert)
    private alertsRepo: Repository<EmergencyAlert>,
    @InjectQueue('alerts') private alertsQueue: Queue,
    private wsGateway: WebsocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreateEmergencyEventDto): Promise<EmergencyAlert> {
    const alert = this.alertsRepo.create(createDto);
    const savedAlert = await this.alertsRepo.save(alert);

    // Publish to Queue - processor handles parent fan-out and notification logging
    await this.alertsQueue.add('emergency-event', savedAlert);

    // Broadcast to admin WebSocket subscribers
    this.wsGateway.broadcastAlert(savedAlert);

    // Log an immediate in-app delivery attempt for the route topic.
    // Full per-parent fan-out is handled by AlertsProcessor consuming the queue.
    await this.notificationsService.logNotificationAttempt(
      savedAlert.id,
      'route:' + createDto.routeId,
      NotificationChannel.PUSH,
      NotificationStatus.SENT,
    );

    return savedAlert;
  }

  async findAllActive(schoolId?: string): Promise<EmergencyAlert[]> {
    const where = schoolId
      ? { status: EmergencyAlertStatus.ACTIVE, schoolId }
      : { status: EmergencyAlertStatus.ACTIVE };
    return this.alertsRepo.find({ where });
  }

  async findOne(id: string): Promise<EmergencyAlert | null> {
    return this.alertsRepo.findOneBy({ id });
  }

  async findForRoute(routeId: string): Promise<any> {
    const activeAlert = await this.alertsRepo.findOne({
      where: { routeId, status: EmergencyAlertStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (activeAlert) {
      return {
        id: activeAlert.id,
        routeId,
        vehicleId: activeAlert.vehicleId,
        eventType: activeAlert.eventType,
        createdAt: activeAlert.createdAt,
        alertActive: true,
        message: "Emergency reported on your child's bus.",
      };
    }

    return {
      routeId,
      alertActive: false,
      message: 'No active alerts.',
    };
  }
}
