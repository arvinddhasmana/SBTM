import {
  Controller,
  Get,
  Put,
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

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsGatewayService,
  ) {}

  @Get('notification-preferences')
  @Roles(Role.PARENT)
  async getPreferences(@Request() req: { user: any }) {
    const user = req.user;
    return this.notificationSettingsService.getPreferences(
      user.id,
      user.schoolId,
    );
  }

  @Put('notification-preferences')
  @Roles(Role.PARENT)
  async updatePreferences(
    @Request() req: { user: any },
    @Body()
    body: {
      preferences: { eventType: string; channel: string; enabled: boolean }[];
    },
  ) {
    const user = req.user;
    return this.notificationSettingsService.updatePreferences({
      userId: user.id,
      schoolId: user.schoolId,
      preferences: body.preferences,
    });
  }

  @Post('device-tokens')
  @Roles(Role.PARENT)
  async registerDeviceToken(
    @Request() req: { user: any },
    @Body() body: { token: string; platform: string },
  ) {
    const user = req.user;
    // v2-followups #6: parents currently still hold a users.id (Role.PARENT),
    // so kind='user' + id=user.id stays valid. When the parent-app cutover
    // (#10) migrates parents to be guardian-only (no users row), switch this
    // to kind='guardian', id=user.anchorId.
    return this.notificationSettingsService.registerDeviceToken({
      recipientKind: 'user',
      recipientId: user.id,
      schoolId: user.schoolId,
      token: body.token,
      platform: body.platform,
    });
  }

  @Delete('device-tokens/:tokenId')
  @Roles(Role.PARENT)
  async deactivateDeviceToken(
    @Request() req: { user: any },
    @Param('tokenId') tokenId: string,
  ) {
    const user = req.user;
    return this.notificationSettingsService.deactivateDeviceToken(
      tokenId,
      user.id,
      'user',
    );
  }

  @Get('device-tokens')
  @Roles(Role.PARENT)
  async getDeviceTokens(@Request() req: { user: any }) {
    const user = req.user;
    return this.notificationSettingsService.getDeviceTokens(
      user.id,
      user.schoolId,
      'user',
    );
  }

  @Get('delivery-log')
  @Roles(Role.PARENT)
  async getDeliveryLog(@Request() req: { user: any }) {
    const user = req.user;
    return this.notificationSettingsService.getDeliveryLog(
      user.id,
      user.schoolId,
    );
  }
}
