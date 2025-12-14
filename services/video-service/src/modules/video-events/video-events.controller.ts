import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    Delete,
    HttpCode,
    HttpStatus,
    Headers,
    Ip,
    Logger,
} from '@nestjs/common';
import { VideoEventsService } from './video-events.service';
import { CreateVideoEventDto } from './dto/create-video-event.dto';
import { CompleteVideoEventDto } from './dto/complete-video-event.dto';
import { QueryVideoEventsDto } from './dto/query-video-events.dto';

@Controller('video-events')
export class VideoEventsController {
    private readonly logger = new Logger(VideoEventsController.name);

    constructor(private readonly videoEventsService: VideoEventsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createVideoEventDto: CreateVideoEventDto) {
        this.logger.log('POST /video-events - Creating new video event');
        return this.videoEventsService.create(createVideoEventDto);
    }

    @Post(':id/complete')
    @HttpCode(HttpStatus.OK)
    async complete(
        @Param('id') id: string,
        @Body() completeVideoEventDto: CompleteVideoEventDto,
    ) {
        this.logger.log(`POST /video-events/${id}/complete - Completing upload`);
        return this.videoEventsService.complete(id, completeVideoEventDto);
    }

    @Post(':id/failed')
    @HttpCode(HttpStatus.OK)
    async markAsFailed(@Param('id') id: string) {
        this.logger.log(`POST /video-events/${id}/failed - Marking as failed`);
        return this.videoEventsService.markAsFailed(id);
    }

    @Get()
    async findAll(@Query() queryDto: QueryVideoEventsDto) {
        this.logger.log('GET /video-events - Fetching video events');
        return this.videoEventsService.findAll(queryDto);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Headers('x-user-id') userId?: string,
        @Ip() ipAddress?: string,
    ) {
        this.logger.log(`GET /video-events/${id} - Fetching video event`);
        return this.videoEventsService.findOne(id, userId, ipAddress);
    }

    @Get(':id/access-logs')
    async getAccessLogs(@Param('id') id: string) {
        this.logger.log(`GET /video-events/${id}/access-logs - Fetching access logs`);
        return this.videoEventsService.getAccessLogs(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string) {
        this.logger.log(`DELETE /video-events/${id} - Deleting video event`);
        return this.videoEventsService.delete(id);
    }
}
