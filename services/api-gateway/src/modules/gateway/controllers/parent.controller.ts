import { Controller, Get, UseGuards, Request, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';
import { ParentGatewayService } from '../services/parent.gateway.service';

@Controller('parent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParentController {
    constructor(private readonly parentGatewayService: ParentGatewayService) {}

    @Get('children')
    @Roles(Role.PARENT)
    async getChildren(@Request() req: { user: any }): Promise<unknown> {
        return this.parentGatewayService.getChildrenForParent(req.user);
    }

    @Get('notifications')
    @Roles(Role.PARENT)
    async getNotifications(@Request() req: { user: any }): Promise<unknown> {
        return this.parentGatewayService.getNotificationsForParent(req.user);
    }

    @Sse('alerts/stream')
    @Roles(Role.PARENT)
    alertStream(@Request() req: { user: any }): Observable<MessageEvent> {
        return this.parentGatewayService.getAlertStream(req.user);
    }
}
