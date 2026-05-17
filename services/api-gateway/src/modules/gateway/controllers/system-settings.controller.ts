/**
 * SystemSettingsController
 *
 * Exposes GPS source and device token management endpoints through the API gateway.
 * All endpoints require SUPER_ADMIN role — no other role may manage system-wide
 * GPS configuration.
 *
 * The controller never accepts schoolId or userId from the request body for
 * auth-sensitive decisions. updatedBy is always req.user.id. schoolId for
 * device-token creation is sourced from the request DTO because SUPER_ADMIN
 * spans every school and is not anchor-scoped.
 *
 * Classification: T2 — operational configuration, no student PII.
 */
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';
import {
  SystemSettingsGatewayService,
  GpsTrackingSource,
  CreateDeviceTokenDto,
} from '../services/system-settings.gateway.service';

interface SetGpsSourceBody {
  source: GpsTrackingSource;
}

type AuthenticatedRequest = { user: AuthenticatedUser };

@Controller('system-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsGatewayService: SystemSettingsGatewayService,
  ) {}

  /**
   * GET /api/v1/system-settings/gps-source
   * Returns the current GPS tracking source.
   */
  @Get('gps-source')
  async getGpsSource() {
    return this.systemSettingsGatewayService.getGpsSource();
  }

  /**
   * PUT /api/v1/system-settings/gps-source
   * Switches the GPS tracking source. Only SUPER_ADMIN may call this.
   * updatedBy is always derived from the authenticated JWT — never from the body.
   */
  @Put('gps-source')
  async setGpsSource(
    @Body() body: SetGpsSourceBody,
    @Request() req: AuthenticatedRequest,
  ) {
    const { source } = body;
    if (source !== 'DRIVER_APP' && source !== 'DEDICATED_GPS') {
      throw new BadRequestException(
        'source must be one of: DRIVER_APP, DEDICATED_GPS',
      );
    }

    // updatedBy is the Super Admin's user ID — never a name or contact detail
    return this.systemSettingsGatewayService.setGpsSource(source, req.user.id);
  }

  /**
   * POST /api/v1/system-settings/gps-device-tokens
   * Creates a new GPS device token.
   * schoolId is provided in the body but the admin must specify which school the
   * device belongs to (Super Admin spans all schools).
   */
  @Post('gps-device-tokens')
  @HttpCode(HttpStatus.CREATED)
  async createDeviceToken(
    @Body() dto: CreateDeviceTokenDto,
    @Request() _req: AuthenticatedRequest,
  ) {
    if (!dto.vehicleId || !dto.schoolId) {
      throw new BadRequestException('vehicleId and schoolId are required');
    }

    return this.systemSettingsGatewayService.createDeviceToken({
      vehicleId: dto.vehicleId,
      schoolId: dto.schoolId,
      description: dto.description,
    });
  }

  /**
   * GET /api/v1/system-settings/gps-device-tokens?schoolId=<id>
   * Lists GPS device tokens for a school. Token values are masked.
   * SUPER_ADMIN must pass the target schoolId as a query parameter.
   */
  @Get('gps-device-tokens')
  async listDeviceTokens(@Query('schoolId') schoolId: string | undefined) {
    if (!schoolId) {
      throw new BadRequestException('schoolId query parameter is required');
    }

    return this.systemSettingsGatewayService.listDeviceTokens(schoolId);
  }

  /**
   * DELETE /api/v1/system-settings/gps-device-tokens/:id
   * Hard-deletes a GPS device token. The token is immediately invalidated.
   */
  @Delete('gps-device-tokens/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDeviceToken(
    @Param('id') id: string,
    @Request() _req: AuthenticatedRequest,
  ) {
    return this.systemSettingsGatewayService.deleteDeviceToken(id);
  }
}
