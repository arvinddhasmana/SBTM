
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { ProcessPresenceEventsDto } from './dto/process-presence-events.dto';
import { ManualPresenceEventDto } from './dto/manual-presence-event.dto';

@Controller('api/v1')
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

    @Get('routes/:routeId/students')
    async getRoutePresence(@Param('routeId') routeId: string) {
        const students = await this.presenceService.getRoutePresence(routeId);
        return {
            routeId,
            students,
            timestamp: new Date().toISOString(),
        };
    }
}
