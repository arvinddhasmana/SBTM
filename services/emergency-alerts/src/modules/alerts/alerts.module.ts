import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAlert } from './entities/emergency-alert.entity';
import { AlertNotificationLog } from './entities/alert-notification-log.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsProcessor } from './alerts.processor';
import { BullModule } from '@nestjs/bullmq';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmergencyAlert, AlertNotificationLog]),
    BullModule.registerQueue({
      name: 'alerts',
    }),
    RealtimeModule,
    NotificationsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsProcessor],
  exports: [AlertsService],
})
export class AlertsModule {}
