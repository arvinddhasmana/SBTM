import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/common.module';
import { GpsGatewayService } from './services/gps.gateway.service';
import { GpsSseService } from './services/gps-sse.service';
import { GpsRouteAccessGuard } from './guards/gps-route-access.guard';
import { AlertsGatewayService } from './services/alerts.gateway.service';
import { AlertConfigGatewayService } from './services/alert-config.gateway.service';
import { PresenceGatewayService } from './services/presence.gateway.service';
import { VideoGatewayService } from './services/video.gateway.service';
import { StudentGatewayService } from './services/student.gateway.service';
import { ComplianceGatewayService } from './services/compliance.gateway.service';
import { ParentGatewayService } from './services/parent.gateway.service';
import { DriverGatewayService } from './services/driver.gateway.service';
import { AbsenceGatewayService } from './services/absence.gateway.service';
import { NotificationSettingsGatewayService } from './services/notification-settings.gateway.service';
import { OrganizationGatewayService } from './services/organization.gateway.service';
import { FleetAssignmentGatewayService } from './services/fleet-assignment.gateway.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { RouteChangeNotifierService } from './services/route-change-notifier.service';
import { SystemSettingsGatewayService } from './services/system-settings.gateway.service';
import { GpsController } from './controllers/gps.controller';
import { AlertsController } from './controllers/alerts.controller';
import { AlertConfigController } from './controllers/alert-config.controller';
import { PresenceController } from './controllers/presence.controller';
import { VideoController } from './controllers/video.controller';
import { StudentController } from './controllers/student.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { ParentController } from './controllers/parent.controller';
import { DriverController } from './controllers/driver.controller';
import { AbsenceController } from './controllers/absence.controller';
import { NotificationSettingsController } from './controllers/notification-settings.controller';
import { OrganizationController } from './controllers/organization.controller';
import { FleetAssignmentController } from './controllers/fleet-assignment.controller';
import { DocumentController } from './controllers/document.controller';
import { SystemSettingsController } from './controllers/system-settings.controller';
import { PageVisibilityController } from './controllers/page-visibility.controller';
import { School } from '../auth/entities/school.entity';
import { SchoolBoard } from '../auth/entities/school-board.entity';
import { Route } from '../auth/entities/route.entity';
import { StudentAbsence } from './entities/student-absence.entity';
import { FleetAssignment } from './entities/fleet-assignment.entity';
import { PageVisibility } from './entities/page-visibility.entity';
import { PageVisibilityService } from './services/page-visibility.service';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      School,
      SchoolBoard,
      Route,
      StudentAbsence,
      FleetAssignment,
      PageVisibility,
    ]),
  ],
  controllers: [
    GpsController,
    AlertsController,
    AlertConfigController,
    PresenceController,
    VideoController,
    StudentController,
    ComplianceController,
    ParentController,
    DriverController,
    AbsenceController,
    NotificationSettingsController,
    OrganizationController,
    FleetAssignmentController,
    DocumentController,
    SystemSettingsController,
    PageVisibilityController,
  ],
  providers: [
    GpsGatewayService,
    GpsSseService,
    GpsRouteAccessGuard,
    AlertsGatewayService,
    AlertConfigGatewayService,
    PresenceGatewayService,
    VideoGatewayService,
    StudentGatewayService,
    ComplianceGatewayService,
    ParentGatewayService,
    DriverGatewayService,
    AbsenceGatewayService,
    NotificationSettingsGatewayService,
    OrganizationGatewayService,
    FleetAssignmentGatewayService,
    PdfGeneratorService,
    RouteChangeNotifierService,
    SystemSettingsGatewayService,
    PageVisibilityService,
  ],
  exports: [
    GpsGatewayService,
    GpsSseService,
    AlertsGatewayService,
    AlertConfigGatewayService,
    PresenceGatewayService,
    VideoGatewayService,
    StudentGatewayService,
    ComplianceGatewayService,
    ParentGatewayService,
    DriverGatewayService,
    AbsenceGatewayService,
    NotificationSettingsGatewayService,
    OrganizationGatewayService,
    FleetAssignmentGatewayService,
    PdfGeneratorService,
    RouteChangeNotifierService,
    SystemSettingsGatewayService,
  ],
})
export class GatewayModule {}
