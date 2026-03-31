import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import { DriverGatewayService } from '../services/driver.gateway.service';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriverController {
  constructor(private readonly driverGatewayService: DriverGatewayService) {}

  @Get('me/schedule')
  @Roles(Role.DRIVER)
  async getSchedule(@Request() req: { user: any }): Promise<unknown> {
    return this.driverGatewayService.getScheduleForDriver(req.user);
  }

  /**
   * Returns the full student roster for a route, merged with server-confirmed presence states.
   * Accessible only to the assigned driver.
   */
  @Get('me/routes/:routeId/students')
  @Roles(Role.DRIVER)
  async getRouteStudents(
    @Param('routeId') routeId: string,
    @Request() req: { user: any },
  ): Promise<unknown> {
    return this.driverGatewayService.getRouteStudents(routeId, req.user);
  }
}
