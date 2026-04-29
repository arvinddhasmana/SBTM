import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import { AlertConfigGatewayService } from '../services/alert-config.gateway.service';

@Controller('alert-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertConfigController {
  constructor(private readonly alertConfigService: AlertConfigGatewayService) {}

  // ============================================================================
  // Event Type Configuration Endpoints
  // ============================================================================

  @Get('event-types')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getEventTypeConfigs() {
    return this.alertConfigService.getAllEventTypeConfigs();
  }

  @Get('event-types/:eventType')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getEventTypeConfig(@Param('eventType') eventType: string) {
    return this.alertConfigService.getEventTypeConfig(eventType);
  }

  @Post('event-types')
  @Roles(Role.SUPER_ADMIN)
  async createEventTypeConfig(@Body() dto: any, @Request() req: { user: any }) {
    return this.alertConfigService.createEventTypeConfig(dto, req.user.id);
  }

  @Put('event-types/:eventType')
  @Roles(Role.SUPER_ADMIN)
  async updateEventTypeConfig(
    @Param('eventType') eventType: string,
    @Body() dto: any,
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.updateEventTypeConfig(
      eventType,
      dto,
      req.user.id,
    );
  }

  @Delete('event-types/:eventType')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEventTypeConfig(
    @Param('eventType') eventType: string,
    @Request() req: { user: any },
  ) {
    await this.alertConfigService.deleteEventTypeConfig(eventType, req.user.id);
  }

  // ============================================================================
  // Escalation Timing Configuration Endpoints
  // ============================================================================

  @Get('escalation-timing')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getEscalationConfigs() {
    return this.alertConfigService.getAllEscalationConfigs();
  }

  @Get('escalation-timing/:tier')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getEscalationConfig(@Param('tier') tier: string) {
    return this.alertConfigService.getEscalationConfig(tier);
  }

  @Post('escalation-timing')
  @Roles(Role.SUPER_ADMIN)
  async createEscalationConfig(
    @Body() dto: any,
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.createEscalationConfig(dto, req.user.id);
  }

  @Put('escalation-timing/:tier')
  @Roles(Role.SUPER_ADMIN)
  async updateEscalationConfig(
    @Param('tier') tier: string,
    @Body() dto: any,
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.updateEscalationConfig(
      tier,
      dto,
      req.user.id,
    );
  }

  @Delete('escalation-timing/:tier')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEscalationConfig(
    @Param('tier') tier: string,
    @Request() req: { user: any },
  ) {
    await this.alertConfigService.deleteEscalationConfig(tier, req.user.id);
  }

  // ============================================================================
  // Escalation Chain Configuration Endpoints
  // ============================================================================

  @Get('escalation-chain')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getEscalationChainConfig() {
    return this.alertConfigService.getEscalationChain();
  }

  // ============================================================================
  // Notification Routing Configuration Endpoints
  // ============================================================================

  @Get('notification-routing')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getNotificationRoutingConfigs(
    @Query('tier') tier?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.alertConfigService.getAllNotificationRoutingConfigs(
      tier,
      eventType,
    );
  }

  @Get('notification-routing/:id')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getNotificationRoutingConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertConfigService.getNotificationRoutingConfig(id);
  }

  @Post('notification-routing')
  @Roles(Role.SUPER_ADMIN)
  async createNotificationRoutingConfig(
    @Body() dto: any,
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.createNotificationRoutingConfig(
      dto,
      req.user.id,
    );
  }

  @Put('notification-routing/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateNotificationRoutingConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.updateNotificationRoutingConfig(
      id,
      dto,
      req.user.id,
    );
  }

  @Delete('notification-routing/:id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotificationRoutingConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: any },
  ) {
    await this.alertConfigService.deleteNotificationRoutingConfig(
      id,
      req.user.id,
    );
  }

  // ============================================================================
  // Workflow Configuration Endpoints
  // ============================================================================

  @Get('workflow')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getWorkflowConfigs(
    @Query('tier') tier?: string,
    @Query('status') status?: string,
  ) {
    return this.alertConfigService.getAllWorkflowConfigs(tier, status);
  }

  @Get('workflow/:id')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getWorkflowConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertConfigService.getWorkflowConfig(id);
  }

  @Post('workflow')
  @Roles(Role.SUPER_ADMIN)
  async createWorkflowConfig(@Body() dto: any, @Request() req: { user: any }) {
    return this.alertConfigService.createWorkflowConfig(dto, req.user.id);
  }

  @Put('workflow/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateWorkflowConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.updateWorkflowConfig(id, dto, req.user.id);
  }

  @Delete('workflow/:id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflowConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: any },
  ) {
    await this.alertConfigService.deleteWorkflowConfig(id, req.user.id);
  }

  // ============================================================================
  // Change Request Endpoints (for Board/School Admins)
  // ============================================================================

  @Get('change-requests')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getChangeRequests(
    @Query('status') status?: string,
    @Query('requestorId') requestorId?: string,
  ) {
    return this.alertConfigService.getAllChangeRequests(status, requestorId);
  }

  @Get('change-requests/:id')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getChangeRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertConfigService.getChangeRequest(id);
  }

  @Post('change-requests')
  @Roles(Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async createChangeRequest(@Body() dto: any, @Request() req: { user: any }) {
    return this.alertConfigService.createChangeRequest(
      dto,
      req.user.id,
      req.user.role,
      req.user.email,
    );
  }

  @Put('change-requests/:id/review')
  @Roles(Role.SUPER_ADMIN)
  async reviewChangeRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { action: 'APPROVED' | 'REJECTED'; reviewNotes?: string },
    @Request() req: { user: any },
  ) {
    return this.alertConfigService.reviewChangeRequest(id, dto, req.user.id);
  }

  // ============================================================================
  // Audit Log Endpoints
  // ============================================================================

  @Get('audit')
  @Roles(Role.SUPER_ADMIN)
  async getConfigAuditLog(
    @Query('configType') configType?: string,
    @Query('configKey') configKey?: string,
    @Query('limit') limit?: number,
  ) {
    return this.alertConfigService.getConfigAuditLog(
      configType,
      configKey,
      limit,
    );
  }

  // ============================================================================
  // Cache Management Endpoints
  // ============================================================================

  @Post('cache/invalidate')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateCache() {
    await this.alertConfigService.invalidateCache();
  }

  @Get('cache/status')
  @Roles(Role.SUPER_ADMIN)
  async getCacheStatus() {
    return this.alertConfigService.getCacheStatus();
  }
}
