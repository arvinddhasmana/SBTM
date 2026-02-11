import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';
import { DriverGatewayService } from '../services/driver.gateway.service';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriverController {
    constructor(private readonly driverGatewayService: DriverGatewayService) {}

    @Get('me/schedule')
    @Roles(Role.DRIVER)
    async getSchedule(@Request() req: { user: any }) {
        return this.driverGatewayService.getScheduleForDriver(req.user);
    }
}
