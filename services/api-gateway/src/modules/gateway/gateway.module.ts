import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { GpsGatewayService } from './services/gps.gateway.service';
import { AlertsGatewayService } from './services/alerts.gateway.service';
import { PresenceGatewayService } from './services/presence.gateway.service';
import { VideoGatewayService } from './services/video.gateway.service';
import { StudentGatewayService } from './services/student.gateway.service';
import { ComplianceGatewayService } from './services/compliance.gateway.service';
import { ParentGatewayService } from './services/parent.gateway.service';
import { DriverGatewayService } from './services/driver.gateway.service';
import { GpsController } from './controllers/gps.controller';
import { AlertsController } from './controllers/alerts.controller';
import { PresenceController } from './controllers/presence.controller';
import { VideoController } from './controllers/video.controller';
import { StudentController } from './controllers/student.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { ParentController } from './controllers/parent.controller';
import { DriverController } from './controllers/driver.controller';

@Module({
    imports: [CommonModule],
    controllers: [
        GpsController,
        AlertsController,
        PresenceController,
        VideoController,
        StudentController,
        ComplianceController,
        ParentController,
        DriverController,
    ],
    providers: [
        GpsGatewayService,
        AlertsGatewayService,
        PresenceGatewayService,
        VideoGatewayService,
        StudentGatewayService,
        ComplianceGatewayService,
        ParentGatewayService,
        DriverGatewayService,
    ],
    exports: [
        GpsGatewayService,
        AlertsGatewayService,
        PresenceGatewayService,
        VideoGatewayService,
        StudentGatewayService,
        ComplianceGatewayService,
        ParentGatewayService,
        DriverGatewayService,
    ],
})
export class GatewayModule { }
