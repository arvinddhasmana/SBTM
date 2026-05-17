import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  VideoGatewayService,
  CreateVideoEventDto,
  VideoEventsQueryDto,
} from '../services/video.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  RolesGuard,
  Roles,
  Role,
  InternalServiceAuthGuard,
} from '@sbtm/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

@Controller('video-events')
export class VideoController {
  constructor(private readonly videoGatewayService: VideoGatewayService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STA_ADMIN, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async getVideoEvents(
    @Query() query: VideoEventsQueryDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const user = req.user;
    // STA / SUPER admins may query any school via ?schoolId=; school-anchored
    // admins are pinned to their own school.
    const schoolId =
      user.role === Role.STA_ADMIN || user.role === Role.SUPER_ADMIN
        ? query.schoolId
        : user.anchorKind === 'school'
          ? (user.anchorId ?? undefined)
          : undefined;
    return this.videoGatewayService.getVideoEvents({ ...query, schoolId });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STA_ADMIN, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.BOARD_ADMIN)
  async getVideoEventById(@Param('id') id: string) {
    return this.videoGatewayService.getVideoEventById(id);
  }

  /**
   * Internal-service callback (e.g. the video-processing pipeline) writes
   * detected events back to the gateway. Authenticated via the internal
   * service JWT (issuer `sbtm-internal`, signed with INTERNAL_SERVICE_SECRET) —
   * not a user token. The DTO carries `schoolId`; the gateway no longer tries
   * to derive it from the caller's anchor (the caller is a service, not a user).
   */
  @Post()
  @UseGuards(InternalServiceAuthGuard)
  async createVideoEvent(@Body() dto: CreateVideoEventDto) {
    return this.videoGatewayService.createVideoEvent(dto);
  }
}
