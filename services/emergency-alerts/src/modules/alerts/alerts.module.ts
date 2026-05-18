import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { AlertAudit } from './entities/alert-audit.entity';
import { AlertDelivery } from './entities/alert-delivery.entity';
import { AlertSubscription } from './entities/alert-subscription.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsProcessor } from './alerts.processor';
import { AlertClassifierService } from './alert-classifier.service';
import { BullModule } from '@nestjs/bullmq';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alert,
      AlertAudit,
      AlertDelivery,
      AlertSubscription,
    ]),
    BullModule.registerQueue({ name: 'alerts' }),
    BullModule.registerQueue({ name: 'notifications' }),
    ConfigModule,
    RealtimeModule,
    NotificationsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsProcessor, AlertClassifierService],
  exports: [AlertsService],
})
export class AlertsModule {}
