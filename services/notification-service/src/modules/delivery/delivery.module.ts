import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationDeliveryLog } from './entities/notification-delivery-log.entity';
import { DeliveryLogService } from './delivery-log.service';
import { DeliveryController } from './delivery.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationDeliveryLog])],
  controllers: [DeliveryController],
  providers: [DeliveryLogService],
  exports: [DeliveryLogService],
})
export class DeliveryModule {}
