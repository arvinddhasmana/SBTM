import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationProcessor } from './notification.processor';
import { NotificationRouterService } from './notification-router.service';
import { TokensModule } from '../tokens/tokens.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    }),
    TokensModule,
    DeliveryModule,
    ChannelsModule,
  ],
  providers: [NotificationProcessor, NotificationRouterService],
  exports: [NotificationRouterService],
})
export class RouterModule {}
