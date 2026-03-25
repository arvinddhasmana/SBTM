import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/common.module';
import { GpsGatewayService } from './services/gps.gateway.service';
import { AlertsGatewayService } from './services/alerts.gateway.service';
import { PresenceGatewayService } from './services/presence.gateway.service';
import { VideoGatewayService } from './services/video.gateway.service';
import { StudentGatewayService } from './services/student.gateway.service';
import { ComplianceGatewayService } from './services/compliance.gateway.service';
import { ParentGatewayService } from './services/parent.gateway.service';
import { DriverGatewayService } from './services/driver.gateway.service';
import { AbsenceGatewayService } from './services/absence.gateway.service';
import { GpsController } from './controllers/gps.controller';
import { AlertsController } from './controllers/alerts.controller';
import { PresenceController } from './controllers/presence.controller';
import { VideoController } from './controllers/video.controller';
import { StudentController } from './controllers/student.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { ParentController } from './controllers/parent.controller';
import { DriverController } from './controllers/driver.controller';
import { AbsenceController } from './controllers/absence.controller';
import { School } from '../auth/entities/school.entity';
import { Route } from '../auth/entities/route.entity';
import { StudentAbsence } from './entities/student-absence.entity';

@Module({
    imports: [CommonModule, TypeOrmModule.forFeature([School, Route, StudentAbsence])],
    controllers: [
        GpsController,
        AlertsController,
        PresenceController,
        VideoController,
        StudentController,
        ComplianceController,
        ParentController,
        DriverController,
        AbsenceController,
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
        AbsenceGatewayService,
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
        AbsenceGatewayService,
    ],
})
export class GatewayModule { }
