import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
}
