import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { VideoGatewayService, CreateVideoEventDto, VideoEventsQueryDto } from '../services/video.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

@Controller('video-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideoController {
    constructor(private readonly videoGatewayService: VideoGatewayService) { }

    @Get()
    async getVideoEvents(@Query() query: VideoEventsQueryDto, @Request() req: { user: any }) {
        const user = req.user;
        const schoolId = user.role === Role.OSTA_ADMIN ? query.schoolId : user.schoolId;
        return this.videoGatewayService.getVideoEvents({ ...query, schoolId });
    }

    @Get(':id')
    async getVideoEventById(@Param('id') id: string) {
        return this.videoGatewayService.getVideoEventById(id);
    }

    @Post()
    @Roles(Role.DRIVER, Role.ADMIN, Role.SYSTEM)
    async createVideoEvent(@Body() dto: CreateVideoEventDto, @Request() req: { user: any }) {
        const user = req.user;
        const schoolId = user.schoolId;
        return this.videoGatewayService.createVideoEvent({
            ...dto,
            schoolId,
        });
    }
}
