import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertConfigService } from './alert-config.service';
import { AlertConfigController } from './alert-config.controller';
import {
  AlertEventTypeConfig,
  AlertEscalationConfig,
  AlertEscalationChain,
  NotificationRoutingConfig,
  AlertWorkflowConfig,
  AlertConfigAudit,
  AlertConfigChangeRequest,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AlertEventTypeConfig,
      AlertEscalationConfig,
      AlertEscalationChain,
      NotificationRoutingConfig,
      AlertWorkflowConfig,
      AlertConfigAudit,
      AlertConfigChangeRequest,
    ]),
  ],
  controllers: [AlertConfigController],
  providers: [AlertConfigService],
  exports: [AlertConfigService, TypeOrmModule],
})
export class ConfigModule {}
