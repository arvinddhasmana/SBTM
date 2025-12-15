import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PresenceGateway } from './presence.gateway';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('student-presence-events')
export class StudentPresenceEventsController {
    constructor(private readonly presenceGateway: PresenceGateway) { }

    @Post()
    @Roles('DRIVER', 'ADMIN')
    async createPresenceEvent(@Body() event: any) {
        return this.presenceGateway.createPresenceEvent(event);
    }
}
