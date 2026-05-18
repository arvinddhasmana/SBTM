import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { ConfirmAlertDto } from './dto/confirm-alert.dto';
import { FalseAlarmDto } from './dto/false-alarm.dto';
import { RequestInfoDto } from './dto/request-info.dto';
import { StatusUpdateDto } from './dto/status-update.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { InternalServiceAuthGuard } from '@sbtm/common';

@Controller('api/v1')
@UseGuards(InternalServiceAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('emergency-events')
  async create(@Body() createDto: CreateEmergencyEventDto) {
    const alert = await this.alertsService.create(createDto);
    return { status: 'received', alertId: alert.id };
  }

  @Get('alerts')
  async findAll(@Query('schoolId') schoolId?: string) {
    // schoolId query-string preserved for wire compat; v2 stores it as sta_id.
    return this.alertsService.findAll(schoolId);
  }

  @Get('alerts/active')
  async findAllActive(@Query('schoolId') schoolId?: string) {
    return this.alertsService.findAllActive(schoolId);
  }

  /**
   * GET /api/v1/alerts/audit/:alertId
   * Returns the full lifecycle audit trail for the given alert.
   * Accessible to School Admin, Board Admin, and STA Admin via the API Gateway RBAC.
   */
  @Get('alerts/audit/:alertId')
  async getAuditLog(@Param('alertId') alertId: string) {
    return this.alertsService.getAuditLog(alertId);
  }

  @Patch('alerts/:alertId/resolve')
  async resolve(
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
  ) {
    return this.alertsService.resolve(
      alertId,
      dto.actorUserId,
      dto.actorRole,
      dto.notes,
    );
  }

  /**
   * PATCH /api/v1/alerts/:alertId/confirm
   * School Admin confirms a Tier 1 alert, triggering parent notification.
   */
  @Patch('alerts/:alertId/confirm')
  async confirm(
    @Param('alertId') alertId: string,
    @Body() dto: ConfirmAlertDto,
  ) {
    return this.alertsService.confirm(alertId, dto.actorUserId, dto.actorRole);
  }

  /**
   * PATCH /api/v1/alerts/:alertId/false-alarm
   * School Admin marks a Tier 1 alert as a false alarm, suppressing parent notification.
   */
  @Patch('alerts/:alertId/false-alarm')
  async falseAlarm(
    @Param('alertId') alertId: string,
    @Body() dto: FalseAlarmDto,
  ) {
    return this.alertsService.falseAlarm(
      alertId,
      dto.actorUserId,
      dto.actorRole,
      dto.notes,
    );
  }

  /**
   * PATCH /api/v1/alerts/:alertId/request-info
   * School Admin requests more information about a Tier 1 alert.
   * Logs the event; escalation timers continue running.
   */
  @Patch('alerts/:alertId/request-info')
  async requestInfo(
    @Param('alertId') alertId: string,
    @Body() dto: RequestInfoDto,
  ) {
    return this.alertsService.requestInfo(
      alertId,
      dto.actorUserId,
      dto.actorRole,
    );
  }

  /**
   * PATCH /api/v1/alerts/:alertId/status-update
   * Add a status update (notes) to an active alert.
   */
  @Patch('alerts/:alertId/status-update')
  async addStatusUpdate(
    @Param('alertId') alertId: string,
    @Body() dto: StatusUpdateDto,
  ) {
    return this.alertsService.addStatusUpdate(
      alertId,
      dto.notes,
      dto.actorUserId,
      dto.actorRole,
    );
  }

  @Get('alerts/parent-view/:routeId')
  async findForRoute(@Param('routeId') routeId: string) {
    return this.alertsService.findForRoute(routeId);
  }

  @Get('alerts/by-routes')
  async findByRoutes(@Query('routeIds') routeIds: string) {
    const ids = routeIds ? routeIds.split(',').filter(Boolean) : [];
    return this.alertsService.findByRoutes(ids);
  }

  @Get('alerts/:alertId')
  async findOne(@Param('alertId') alertId: string) {
    return this.alertsService.findOne(alertId);
  }
}
