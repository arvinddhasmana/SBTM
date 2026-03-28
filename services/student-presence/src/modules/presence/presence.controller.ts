
import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { ProcessPresenceEventsDto } from './dto/process-presence-events.dto';
import { ManualPresenceEventDto } from './dto/manual-presence-event.dto';
import { PresenceEventsQueryDto } from './dto/presence-events-query.dto';
import { InternalServiceAuthGuard } from '../../common/guards/internal-service-auth.guard';

@Controller('api/v1')
@UseGuards(InternalServiceAuthGuard)
export class PresenceController {
    constructor(private readonly presenceService: PresenceService) { }

    @Post('presence-events')
    async processDetections(@Body() dto: ProcessPresenceEventsDto) {
        return await this.presenceService.processDetections(dto);
    }

    @Post('student-presence-events/manual')
    async manualOverride(@Body() dto: ManualPresenceEventDto) {
        const event = await this.presenceService.manualOverride(dto);
        return {
            status: 'recorded',
            presenceEventId: event.id,
        };
    }

    @Get('presence/stats')
    async getStats(@Query('schoolId') schoolId?: string) {
        return await this.presenceService.getStats(schoolId);
    }

    @Get('presence/events')
    async getEvents(@Query() query: PresenceEventsQueryDto) {
        return await this.presenceService.getEvents(query);
    }

    @Get('routes/:routeId/students')
    async getRoutePresence(
        @Param('routeId') routeId: string,
        @Query('schoolId') schoolId?: string,
    ) {
        const students = await this.presenceService.getRoutePresence(routeId, schoolId);
        return {
            routeId,
            students,
            timestamp: new Date().toISOString(),
        };
    }
}
