import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import { NotificationSettingsGatewayService } from '../services/notification-settings.gateway.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsGatewayService,
  ) {}

  @Post('device-tokens')
  @Roles(Role.PARENT)
  async registerDeviceToken(
    @Request() req: { user: AuthenticatedUser },
    @Body() body: { token: string; platform: string },
  ) {
    // v2-followups #1/#6: parents still authenticate as users.id today, so
    // kind='user' + id=user.id is correct. When the parent-app cutover (#10)
    // migrates parents to guardian-only (no users row), switch to
    // kind='guardian', id=user.anchorId.
    return this.notificationSettingsService.registerDeviceToken({
      recipientKind: 'user',
      recipientId: req.user.id,
      token: body.token,
      platform: body.platform,
    });
  }

  @Delete('device-tokens/:tokenId')
  @Roles(Role.PARENT)
  async deactivateDeviceToken(
    @Request() req: { user: AuthenticatedUser },
    @Param('tokenId') tokenId: string,
  ) {
    return this.notificationSettingsService.deactivateDeviceToken(
      tokenId,
      req.user.id,
      'user',
    );
  }

  @Get('device-tokens')
  @Roles(Role.PARENT)
  async getDeviceTokens(@Request() req: { user: AuthenticatedUser }) {
    return this.notificationSettingsService.getDeviceTokens(
      req.user.id,
      'user',
    );
  }

  @Get('delivery-log')
  @Roles(Role.PARENT)
  async getDeliveryLog(@Request() req: { user: AuthenticatedUser }) {
    return this.notificationSettingsService.getDeliveryLog(req.user.id);
  }
}
