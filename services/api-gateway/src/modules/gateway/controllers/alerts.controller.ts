import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Patch,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlertsGatewayService,
  CreateEmergencyEventDto,
} from '../services/alerts.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import { School } from '../../auth/entities/school.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(
    private readonly alertsGatewayService: AlertsGatewayService,
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
  ) {}

  @Get('alerts')
  async getAllAlerts(
    @Request() req: { user: any },
    @Query('schoolId') schoolId?: string,
  ) {
    const user = req.user;
    const filterSchoolId = this.resolveSchoolIdFilter(user, schoolId);
    return this.alertsGatewayService.getAllAlerts(filterSchoolId);
  }

  @Get('alerts/active')
  async getActiveAlerts(
    @Request() req: { user: any },
    @Query('schoolId') schoolId?: string,
  ) {
    const user = req.user;
    const filterSchoolId = this.resolveSchoolIdFilter(user, schoolId);
    return this.alertsGatewayService.getActiveAlerts(filterSchoolId);
  }

  @Patch('alerts/:id/resolve')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN)
  async resolveAlert(
    @Param('id') id: string,
    @Request() req: { user: any },
    @Body() body: { notes?: string; actorUserId?: string; actorRole?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.resolveAlert(id, {
      notes: body.notes,
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
    });
  }

  @Patch('alerts/:id/confirm')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async confirmAlert(
    @Param('id') id: string,
    @Request() req: { user: any },
    @Body() body: { actorUserId?: string; actorRole?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.confirmAlert(id, {
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
    });
  }

  @Patch('alerts/:id/false-alarm')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async falseAlarmAlert(
    @Param('id') id: string,
    @Request() req: { user: any },
    @Body() body: { actorUserId?: string; actorRole?: string; notes?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.falseAlarmAlert(id, {
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
      notes: body.notes,
    });
  }

  @Patch('alerts/:id/request-info')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async requestInfoAlert(
    @Param('id') id: string,
    @Request() req: { user: any },
    @Body() body: { actorUserId?: string; actorRole?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.requestInfoAlert(id, {
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
    });
  }

  @Patch('alerts/:id/status-update')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async addStatusUpdate(
    @Param('id') id: string,
    @Request() req: { user: any },
    @Body() body: { notes: string; actorUserId?: string; actorRole?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.addStatusUpdate(id, {
      notes: body.notes,
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
    });
  }

  @Get('alerts/parent-view/:routeId')
  @Roles(Role.PARENT)
  async getAlertsForRoute(@Param('routeId') routeId: string) {
    return this.alertsGatewayService.getAlertsForRoute(routeId);
  }

  @Get('alerts/parent-history')
  @Roles(Role.PARENT)
  async getParentAlertHistory(@Request() req: { user: any }) {
    const user = req.user;
    const routeIds: string[] = user.childRouteIds || [];
    return this.alertsGatewayService.getAlertsByRoutes(routeIds);
  }

  @Get('alerts/:id/audit-trail')
  @Roles(Role.OSTA_ADMIN, Role.ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async getAuditTrail(@Param('id') id: string) {
    return this.alertsGatewayService.getAuditTrail(id);
  }

  @Get('alerts/:id')
  async getAlertById(@Param('id') id: string) {
    return this.alertsGatewayService.getAlertById(id);
  }

  @Post('emergency-events')
  @Roles(Role.DRIVER, Role.ADMIN)
  async createEmergencyEvent(
    @Body() dto: CreateEmergencyEventDto,
    @Request() req: { user: any },
  ) {
    const user = req.user;
    const schoolId = user.schoolId;
    // Support both flat lat/lng and nested location object from older clients
    const location = (dto as any).location as
      | { lat: number; lng: number }
      | undefined;
    const lat = dto.lat ?? location?.lat;
    const lng = dto.lng ?? location?.lng;
    return this.alertsGatewayService.createEmergencyEvent({
      vehicleId: dto.vehicleId,
      routeId: dto.routeId,
      eventType: dto.eventType,
      timestamp: dto.timestamp,
      description: dto.description,
      lat,
      lng,
      schoolId,
      driverId: dto.driverId || user.driverId || user.id,
    });
  }

  // ---------- private helpers ----------

  /**
   * Enforce alert ownership: SCHOOL_ADMIN can only act on alerts from their own school,
   * BOARD_ADMIN can only act on alerts from schools within their board.
   * OSTA_ADMIN, SUPER_ADMIN, and ADMIN bypass this check (via role hierarchy).
   */
  private async assertAlertOwnership(
    alertId: string,
    user: any,
  ): Promise<void> {
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.OSTA_ADMIN ||
      user.role === Role.ADMIN
    ) {
      return;
    }

    const alert = await this.alertsGatewayService.getAlertById(alertId);
    if (!alert) return;

    if (user.role === Role.SCHOOL_ADMIN) {
      if (alert.schoolId && alert.schoolId !== user.schoolId) {
        throw new ForbiddenException(
          'You can only manage alerts from your own school',
        );
      }
    }

    if (user.role === Role.BOARD_ADMIN) {
      if (alert.schoolId) {
        const school = await this.schoolRepository.findOne({
          where: { id: alert.schoolId },
        });
        if (school && school.boardId !== user.boardId) {
          throw new ForbiddenException(
            'You can only manage alerts from schools within your board',
          );
        }
      }
    }
  }

  private resolveSchoolIdFilter(
    user: any,
    requestedSchoolId?: string,
  ): string | undefined {
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.OSTA_ADMIN ||
      user.role === Role.ADMIN
    ) {
      return requestedSchoolId;
    }
    // SCHOOL_ADMIN and BOARD_ADMIN scoped to own context
    return user.schoolId || requestedSchoolId;
  }
}
