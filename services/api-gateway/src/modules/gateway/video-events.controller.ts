import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { VideoGateway } from './video.gateway';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('video-events')
export class VideoEventsController {
    constructor(private readonly videoGateway: VideoGateway) { }

    @Get()
    @Roles('ADMIN')
    async getVideoEvents() {
        return this.videoGateway.getVideoEvents();
    }

    @Get(':id')
    @Roles('ADMIN')
    async getVideoEventById(@Param('id') id: string) {
        return this.videoGateway.getVideoEventById(id);
    }

    @Post()
    @Roles('ADMIN', 'SYSTEM') // Assuming system/admin triggers
    async createVideoEvent(@Body() event: any) {
        return this.videoGateway.createVideoEvent(event);
    }
}
