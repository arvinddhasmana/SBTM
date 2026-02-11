
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyAlert, EmergencyAlertStatus } from './entities/emergency-alert.entity';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WebsocketGateway } from '../realtime/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AlertsService {
    constructor(
        @InjectRepository(EmergencyAlert)
        private alertsRepo: Repository<EmergencyAlert>,
        @InjectQueue('alerts') private alertsQueue: Queue,
        private wsGateway: WebsocketGateway,
        private notificationsService: NotificationsService,
    ) { }

    async create(createDto: CreateEmergencyEventDto): Promise<EmergencyAlert> {
        const alert = this.alertsRepo.create(createDto);
        const savedAlert = await this.alertsRepo.save(alert);

        // Publish to Queue
        await this.alertsQueue.add('emergency-event', savedAlert);

        // Notify Admins
        this.wsGateway.broadcastAlert(savedAlert);

        // Notify Parents
        // In a real system, we'd fetch parents associated with the route.
        // For MVP/Demo, we assume the notification service handles the broadcasting logic or we send to a topic.
        await this.notificationsService.sendPushNotification('parents-route-' + createDto.routeId, `Emergency on route ${createDto.routeId}`);

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
                routeId,
                alertActive: true,
                message: 'Emergency reported on your child’s bus.',
            };
        }

        return {
            routeId,
            alertActive: false,
            message: 'No active alerts.',
        };
    }
}
