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
import { InternalServiceAuthGuard } from '@sbtm/common';
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

@Controller('api/v1/alert-config')
@UseGuards(InternalServiceAuthGuard)
export class AlertConfigController {
  constructor(private readonly configService: AlertConfigService) {}

  // ============================================================================
  // Event Type Configuration Endpoints
  // ============================================================================

  @Get('event-types')
  async getEventTypeConfigs() {
    return this.configService.getAllEventTypeConfigs();
  }

  @Get('event-types/:eventType')
  async getEventTypeConfig(@Param('eventType') eventType: string) {
    return this.configService.getEventTypeConfig(eventType);
  }

  @Post('event-types')
  async createEventTypeConfig(
    @Body() dto: CreateEventTypeConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createEventTypeConfig(dto, actorUserId);
  }

  @Put('event-types/:eventType')
  async updateEventTypeConfig(
    @Param('eventType') eventType: string,
    @Body() dto: UpdateEventTypeConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateEventTypeConfig(
      eventType,
      dto,
      actorUserId,
    );
  }

  @Delete('event-types/:eventType')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async getEscalationConfigs() {
    return this.configService.getAllEscalationConfigs();
  }

  @Get('escalation-timing/:tier')
  async getEscalationConfig(@Param('tier') tier: string) {
    return this.configService.getEscalationConfig(tier);
  }

  @Post('escalation-timing')
  async createEscalationConfig(
    @Body() dto: CreateEscalationConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createEscalationConfig(dto, actorUserId);
  }

  @Put('escalation-timing/:tier')
  async updateEscalationConfig(
    @Param('tier') tier: string,
    @Body() dto: UpdateEscalationConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateEscalationConfig(tier, dto, actorUserId);
  }

  @Delete('escalation-timing/:tier')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async getEscalationChainConfig() {
    return this.configService.getEscalationChain();
  }

  // ============================================================================
  // Notification Routing Configuration Endpoints
  // ============================================================================

  @Get('notification-routing')
  async getNotificationRoutingConfigs(
    @Query('tier') tier?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.configService.getAllNotificationRoutingConfigs(tier, eventType);
  }

  @Get('notification-routing/:id')
  async getNotificationRoutingConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getNotificationRoutingConfigById(id);
  }

  @Post('notification-routing')
  async createNotificationRoutingConfig(
    @Body() dto: CreateNotificationRoutingConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createNotificationRoutingConfig(dto, actorUserId);
  }

  @Put('notification-routing/:id')
  async updateNotificationRoutingConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationRoutingConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateNotificationRoutingConfig(
      id,
      dto,
      actorUserId,
    );
  }

  @Delete('notification-routing/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async getWorkflowConfigs(
    @Query('tier') tier?: string,
    @Query('status') status?: string,
  ) {
    return this.configService.getAllWorkflowConfigs(tier, status);
  }

  @Get('workflow/:id')
  async getWorkflowConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getWorkflowConfigById(id);
  }

  @Post('workflow')
  async createWorkflowConfig(
    @Body() dto: CreateWorkflowConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.createWorkflowConfig(dto, actorUserId);
  }

  @Put('workflow/:id')
  async updateWorkflowConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowConfigDto,
    @Query('actorUserId') actorUserId?: string,
  ) {
    return this.configService.updateWorkflowConfig(id, dto, actorUserId);
  }

  @Delete('workflow/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  async getChangeRequests(
    @Query('status') status?: string,
    @Query('requestorId') requestorId?: string,
  ) {
    return this.configService.getChangeRequests(status, requestorId);
  }

  @Get('change-requests/:id')
  async getChangeRequest(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.getChangeRequest(id);
  }

  @Post('change-requests')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateCache() {
    await this.configService.invalidateCache();
  }

  @Get('cache/status')
  async getCacheStatus() {
    return this.configService.getCacheStatus();
  }
}
