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
import { School } from '../../organization/entities/school.entity';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

type AuthenticatedRequest = { user: AuthenticatedUser };

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
    @Request() req: AuthenticatedRequest,
    @Query('schoolId') schoolId?: string,
  ) {
    const user = req.user;
    const filterSchoolId = this.resolveSchoolIdFilter(user, schoolId);
    return this.alertsGatewayService.getAllAlerts(filterSchoolId);
  }

  @Get('alerts/active')
  async getActiveAlerts(
    @Request() req: AuthenticatedRequest,
    @Query('schoolId') schoolId?: string,
  ) {
    const user = req.user;
    const filterSchoolId = this.resolveSchoolIdFilter(user, schoolId);
    return this.alertsGatewayService.getActiveAlerts(filterSchoolId);
  }

  @Patch('alerts/:id/resolve')
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async resolveAlert(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
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
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async confirmAlert(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { actorUserId?: string; actorRole?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.confirmAlert(id, {
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
    });
  }

  @Patch('alerts/:id/false-alarm')
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async falseAlarmAlert(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
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
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async requestInfoAlert(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { actorUserId?: string; actorRole?: string },
  ) {
    await this.assertAlertOwnership(id, req.user);
    return this.alertsGatewayService.requestInfoAlert(id, {
      actorUserId: body.actorUserId || req.user.id,
      actorRole: body.actorRole || req.user.role,
    });
  }

  @Patch('alerts/:id/status-update')
  @Roles(
    Role.SUPER_ADMIN,
    Role.STA_ADMIN,
    Role.BOARD_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.DRIVER,
  )
  async addStatusUpdate(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
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
  async getParentAlertHistory(@Request() req: AuthenticatedRequest) {
    const user = req.user;
    if (user.anchorKind !== 'parent' || !user.anchorId) {
      throw new ForbiddenException('Caller is not anchored to a guardian');
    }
    return this.alertsGatewayService.getParentAlertHistory(user.anchorId);
  }

  @Get('alerts/:id/audit-trail')
  @Roles(
    Role.SUPER_ADMIN,
    Role.STA_ADMIN,
    Role.BOARD_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.DRIVER,
    Role.PARENT,
  )
  async getAuditTrail(@Param('id') id: string) {
    return this.alertsGatewayService.getAuditTrail(id);
  }

  @Get('alerts/:id')
  async getAlertById(@Param('id') id: string) {
    return this.alertsGatewayService.getAlertById(id);
  }

  @Post('emergency-events')
  @Roles(Role.DRIVER, Role.SUPER_ADMIN, Role.STA_ADMIN)
  async createEmergencyEvent(
    @Body() dto: CreateEmergencyEventDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    // TODO(phase-B): a DRIVER's school context now flows from the run they're on, not
    // a JWT claim. For now we allow the client to pass schoolId in the DTO, falling back
    // to user.anchorId when the driver is school-anchored (rare).
    const schoolId: string | undefined =
      (dto as any).schoolId ??
      (user.anchorKind === 'school' ? user.anchorId : undefined);
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
      driverId:
        dto.driverId ??
        (user.anchorKind === 'driver' ? user.anchorId : user.id),
    });
  }

  // ---------- private helpers ----------

  /**
   * Enforce alert ownership: SCHOOL_ADMIN can only act on alerts from their own school,
   * BOARD_ADMIN can only act on alerts from schools within their board.
   * SUPER_ADMIN and STA_ADMIN bypass this check (via role hierarchy).
   */
  private async assertAlertOwnership(
    alertId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.STA_ADMIN) {
      return;
    }

    const alert = await this.alertsGatewayService.getAlertById(alertId);
    if (!alert) return;

    if (user.role === Role.SCHOOL_ADMIN) {
      const userSchoolId =
        user.anchorKind === 'school' ? user.anchorId : undefined;
      if (alert.schoolId && alert.schoolId !== userSchoolId) {
        throw new ForbiddenException(
          'You can only manage alerts from your own school',
        );
      }
    }

    if (user.role === Role.BOARD_ADMIN) {
      const userBoardId =
        user.anchorKind === 'board' ? user.anchorId : undefined;
      if (alert.schoolId) {
        const school = await this.schoolRepository.findOne({
          where: { id: alert.schoolId },
        });
        if (school && school.boardId !== userBoardId) {
          throw new ForbiddenException(
            'You can only manage alerts from schools within your board',
          );
        }
      }
    }
  }

  private resolveSchoolIdFilter(
    user: AuthenticatedUser,
    requestedSchoolId?: string,
  ): string | undefined {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.STA_ADMIN) {
      return requestedSchoolId;
    }
    // SCHOOL_ADMIN scoped to own anchor; BOARD_ADMIN falls back to the requested filter
    // (board→school resolution is a TODO).
    if (user.anchorKind === 'school' && user.anchorId) {
      return user.anchorId;
    }
    return requestedSchoolId;
  }
}
