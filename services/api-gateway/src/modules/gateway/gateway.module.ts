import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { GpsGatewayService } from './services/gps.gateway.service';
import { AlertsGatewayService } from './services/alerts.gateway.service';
import { PresenceGatewayService } from './services/presence.gateway.service';
import { VideoGatewayService } from './services/video.gateway.service';
import { StudentGatewayService } from './services/student.gateway.service';
import { ComplianceGatewayService } from './services/compliance.gateway.service';
import { GpsController } from './controllers/gps.controller';
import { AlertsController } from './controllers/alerts.controller';
import { PresenceController } from './controllers/presence.controller';
import { VideoController } from './controllers/video.controller';
import { StudentController } from './controllers/student.controller';
import { ComplianceController } from './controllers/compliance.controller';

@Module({
    imports: [CommonModule],
    controllers: [
        GpsController,
        AlertsController,
        PresenceController,
        VideoController,
        StudentController,
        ComplianceController,
    ],
    providers: [
        GpsGatewayService,
        AlertsGatewayService,
        PresenceGatewayService,
        VideoGatewayService,
        StudentGatewayService,
        ComplianceGatewayService,
    ],
    exports: [
        GpsGatewayService,
        AlertsGatewayService,
        PresenceGatewayService,
        VideoGatewayService,
        StudentGatewayService,
        ComplianceGatewayService,
    ],
})
export class GatewayModule { }
