import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InternalServiceAuthGuard, RolesGuard, Roles, Role } from '@sbtm/common';
import { AlertConfigService } from './alert-config.service';
import {
  CreateEventTypeConfigDto,
  UpdateEventTypeConfigDto,
} from './dto/event-type-config.dto';
import {
  CreateEscalationConfigDto,
  UpdateEscalationConfigDto,
} from './dto/escalation-config.dto';
import {
  CreateNotificationRoutingConfigDto,
  UpdateNotificationRoutingConfigDto,
} from './dto/notification-routing-config.dto';
import {
  CreateWorkflowConfigDto,
  UpdateWorkflowConfigDto,
} from './dto/workflow-config.dto';
import {
  CreateChangeRequestDto,
  ReviewChangeRequestDto,
} from './dto/change-request.dto';

@ApiTags('Alert Configuration')
@ApiBearerAuth()
@Controller('api/v1/alert-config')
@UseGuards(InternalServiceAuthGuard, RolesGuard)
export class AlertConfigController {
  constructor(private readonly configService: AlertConfigService) {}

  // ============================================================================
  // Event Type Configuration Endpoints
  // ============================================================================

  @Get('event-types')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all event type configurations' })
  @ApiResponse({ status: 200, description: 'Event type configurations retrieved' })
  async getEventTypeConfigs() {
    return this.configService.getAllEventTypeConfigs();
  }

  @Get('event-types/:eventType')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get configuration for a specific event type' })
  @ApiResponse({ status: 200, description: 'Event type configuration retrieved' })
  async getEventTypeConfig(@Param('eventType') eventType: string) {
    return this.configService.getEventTypeConfig(eventType);
  }

  @Post('event-types')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create event type configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Event type configuration created' })
  async createEventTypeConfig(
    @Body() dto: CreateEventTypeConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createEventTypeConfig(dto, actorUserId);
  }

  @Put('event-types/:eventType')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update event type configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Event type configuration updated' })
  async updateEventTypeConfig(
    @Param('eventType') eventType: string,
    @Body() dto: UpdateEventTypeConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateEventTypeConfig(eventType, dto, actorUserId);
  }

  @Delete('event-types/:eventType')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event type configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 204, description: 'Event type configuration deleted' })
  async deleteEventTypeConfig(
    @Param('eventType') eventType: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    await this.configService.deleteEventTypeConfig(eventType, actorUserId);
  }

  // ============================================================================
  // Escalation Timing Configuration Endpoints
  // ============================================================================

  @Get('escalation-timing')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all escalation timing configurations' })
  @ApiResponse({ status: 200, description: 'Escalation timing configurations retrieved' })
  async getEscalationConfigs() {
    return this.configService.getAllEscalationConfigs();
  }

  @Get('escalation-timing/:tier')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get escalation timing for a specific tier' })
  @ApiResponse({ status: 200, description: 'Escalation timing configuration retrieved' })
  async getEscalationConfig(@Param('tier') tier: string) {
    return this.configService.getEscalationConfig(tier);
  }

  @Post('escalation-timing')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create escalation timing configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Escalation timing configuration created' })
  async createEscalationConfig(
    @Body() dto: CreateEscalationConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createEscalationConfig(dto, actorUserId);
  }

  @Put('escalation-timing/:tier')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update escalation timing configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Escalation timing configuration updated' })
  async updateEscalationConfig(
    @Param('tier') tier: string,
    @Body() dto: UpdateEscalationConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateEscalationConfig(tier, dto, actorUserId);
  }

  @Delete('escalation-timing/:tier')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete escalation timing configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 204, description: 'Escalation timing configuration deleted' })
  async deleteEscalationConfig(
    @Param('tier') tier: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    await this.configService.deleteEscalationConfig(tier, actorUserId);
  }

  // ============================================================================
  // Escalation Chain Configuration Endpoints
  // ============================================================================

  @Get('escalation-chain')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get escalation chain configuration' })
  @ApiResponse({ status: 200, description: 'Escalation chain retrieved' })
  async getEscalationChainConfig() {
    return this.configService.getEscalationChain();
  }

  // ============================================================================
  // Notification Routing Configuration Endpoints
  // ============================================================================

  @Get('notification-routing')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all notification routing configurations' })
  @ApiResponse({ status: 200, description: 'Notification routing configurations retrieved' })
  async getNotificationRoutingConfigs(
    @Query('tier') tier?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.configService.getAllNotificationRoutingConfigs(tier, eventType);
  }

  @Get('notification-routing/:id')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get notification routing configuration by ID' })
  @ApiResponse({ status: 200, description: 'Notification routing configuration retrieved' })
  async getNotificationRoutingConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getNotificationRoutingConfigById(id);
  }

  @Post('notification-routing')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create notification routing configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Notification routing configuration created' })
  async createNotificationRoutingConfig(
    @Body() dto: CreateNotificationRoutingConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createNotificationRoutingConfig(dto, actorUserId);
  }

  @Put('notification-routing/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update notification routing configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Notification routing configuration updated' })
  async updateNotificationRoutingConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationRoutingConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateNotificationRoutingConfig(id, dto, actorUserId);
  }

  @Delete('notification-routing/:id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification routing configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 204, description: 'Notification routing configuration deleted' })
  async deleteNotificationRoutingConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    await this.configService.deleteNotificationRoutingConfig(id, actorUserId);
  }

  // ============================================================================
  // Workflow Configuration Endpoints
  // ============================================================================

  @Get('workflow')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all workflow configurations' })
  @ApiResponse({ status: 200, description: 'Workflow configurations retrieved' })
  async getWorkflowConfigs(
    @Query('tier') tier?: string,
    @Query('status') status?: string,
  ) {
    return this.configService.getAllWorkflowConfigs(tier, status);
  }

  @Get('workflow/:id')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get workflow configuration by ID' })
  @ApiResponse({ status: 200, description: 'Workflow configuration retrieved' })
  async getWorkflowConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getWorkflowConfigById(id);
  }

  @Post('workflow')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create workflow configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Workflow configuration created' })
  async createWorkflowConfig(
    @Body() dto: CreateWorkflowConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createWorkflowConfig(dto, actorUserId);
  }

  @Put('workflow/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update workflow configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Workflow configuration updated' })
  async updateWorkflowConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateWorkflowConfig(id, dto, actorUserId);
  }

  @Delete('workflow/:id')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow configuration (SUPER_ADMIN only)' })
  @ApiResponse({ status: 204, description: 'Workflow configuration deleted' })
  async deleteWorkflowConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    await this.configService.deleteWorkflowConfig(id, actorUserId);
  }

  // ============================================================================
  // Change Request Endpoints (for Board/School Admins)
  // ============================================================================

  @Get('change-requests')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all change requests (optionally filter by status)' })
  @ApiResponse({ status: 200, description: 'Change requests retrieved' })
  async getChangeRequests(
    @Query('status') status?: string,
    @Query('requestorId') requestorId?: string,
  ) {
    return this.configService.getChangeRequests(status, requestorId);
  }

  @Get('change-requests/:id')
  @Roles(Role.SUPER_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get change request by ID' })
  @ApiResponse({ status: 200, description: 'Change request retrieved' })
  async getChangeRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getChangeRequest(id);
  }

  @Post('change-requests')
  @Roles(Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create change request (Board/School Admins)' })
  @ApiResponse({ status: 201, description: 'Change request created' })
  async createChangeRequest(
    @Body() dto: CreateChangeRequestDto,
    @Query('requestorId') requestorId: string,
    @Query('requestorRole') requestorRole: string,
    @Query('requestorEmail') requestorEmail?: string,
  ) {
    return this.configService.createChangeRequest(
      dto,
      requestorId,
      requestorRole,
      requestorEmail,
    );
  }

  @Put('change-requests/:id/review')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Review change request (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Change request reviewed' })
  async reviewChangeRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewChangeRequestDto,
    @Query('reviewerId') reviewerId: string,
  ) {
    return this.configService.reviewChangeRequest(id, dto, reviewerId);
  }

  // ============================================================================
  // Audit Log Endpoints
  // ============================================================================

  @Get('audit')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get configuration audit log (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved' })
  async getConfigAuditLog(
    @Query('configType') configType?: string,
    @Query('configKey') configKey?: string,
    @Query('limit') limit?: number,
  ) {
    return this.configService.getConfigAuditLog(configType, configKey, limit);
  }

  // ============================================================================
  // Cache Management Endpoints
  // ============================================================================

  @Post('cache/invalidate')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate configuration cache (SUPER_ADMIN only)' })
  @ApiResponse({ status: 204, description: 'Cache invalidated' })
  async invalidateCache() {
    await this.configService.invalidateCache();
  }

  @Get('cache/status')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get cache status (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Cache status retrieved' })
  async getCacheStatus() {
    return this.configService.getCacheStatus();
  }
}
