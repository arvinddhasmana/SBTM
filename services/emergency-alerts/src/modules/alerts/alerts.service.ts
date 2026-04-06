import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  LATE_ARRIVAL: 'Late Arrival',
  ROUTE_DEVIATION: 'Route Deviation',
  PANIC_BUTTON: 'Panic Button',
  INCIDENT: 'Incident',
  ROUTE_DIVERSION: 'Route Diversion',
  PANIC_ALERT: 'Panic Alert',
  OTHER: 'Other',
};

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

  async findAll(schoolId?: string): Promise<EmergencyAlert[]> {
    const where = schoolId ? { schoolId } : {};
    return this.alertsRepo.find({ where, order: { timestamp: 'DESC' } });
  }

  async findAllActive(schoolId?: string): Promise<EmergencyAlert[]> {
    const where = schoolId
      ? { status: EmergencyAlertStatus.ACTIVE, schoolId }
      : { status: EmergencyAlertStatus.ACTIVE };
    return this.alertsRepo.find({ where, order: { timestamp: 'DESC' } });
  }

  async resolve(id: string): Promise<EmergencyAlert> {
    const alert = await this.alertsRepo.findOneBy({ id });
    if (!alert) {
      throw new Error('Alert not found');
    }
    alert.status = EmergencyAlertStatus.RESOLVED;
    const resolved = await this.alertsRepo.save(alert);

    // Broadcast resolution via SSE/WebSocket so clients get real-time updates
    this.wsGateway.broadcastAlert(resolved);

    return resolved;
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
      const label =
        EVENT_TYPE_LABELS[activeAlert.eventType] || activeAlert.eventType;
      const message =
        activeAlert.description ||
        `${label}: ${activeAlert.vehicleId} on route ${routeId}`;

      return {
        id: activeAlert.id,
        routeId,
        vehicleId: activeAlert.vehicleId,
        eventType: activeAlert.eventType,
        description: activeAlert.description || null,
        message,
        status: activeAlert.status,
        lat: activeAlert.lat,
        lng: activeAlert.lng,
        createdAt: activeAlert.createdAt,
        alertActive: true,
      };
    }

    return {
      routeId,
      alertActive: false,
      message: 'No active alerts.',
    };
  }

  async findByRoutes(routeIds: string[]): Promise<EmergencyAlert[]> {
    if (routeIds.length === 0) return [];
    return this.alertsRepo.find({
      where: { routeId: In(routeIds) },
      order: { createdAt: 'DESC' },
    });
  }
}
