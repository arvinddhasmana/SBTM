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
import { RolesGuard, Roles, Role } from '@sbtm/common';

@Controller('video-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideoController {
  constructor(private readonly videoGatewayService: VideoGatewayService) {}

  @Get()
  async getVideoEvents(
    @Query() query: VideoEventsQueryDto,
    @Request() req: { user: any },
  ) {
    const user = req.user;
    const schoolId =
      user.role === Role.STA_ADMIN ? query.schoolId : user.schoolId;
    return this.videoGatewayService.getVideoEvents({ ...query, schoolId });
  }

  @Get(':id')
  async getVideoEventById(@Param('id') id: string) {
    return this.videoGatewayService.getVideoEventById(id);
  }

  @Post()
  // TODO(phase-B): replace with internal-service guard
  @Roles(Role.DRIVER, Role.SUPER_ADMIN, Role.STA_ADMIN)
  async createVideoEvent(
    @Body() dto: CreateVideoEventDto,
    @Request() req: { user: any },
  ) {
    const user = req.user;
    const schoolId = user.schoolId;
    return this.videoGatewayService.createVideoEvent({
      ...dto,
      schoolId,
    });
  }
}
