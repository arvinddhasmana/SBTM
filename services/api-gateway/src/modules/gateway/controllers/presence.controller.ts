import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PresenceGatewayService } from '../services/presence.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresenceController {
  constructor(
    private readonly presenceGatewayService: PresenceGatewayService,
  ) {}

  @Get('presence/stats')
  async getStats(@Request() req: { user: any }) {
    return this.presenceGatewayService.getStats(req.user);
  }

  @Get('presence/events')
  async getEvents(@Query() query: any, @Request() req: { user: any }) {
    return this.presenceGatewayService.getEvents(query, req.user);
  }

  @Post('presence-events')
  @Roles(
    Role.DRIVER,
    Role.ADMIN,
    Role.OSTA_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.BOARD_ADMIN,
  )
  async processEvents(@Body() dto: any, @Request() req: { user: any }) {
    return this.presenceGatewayService.processEvents(dto, req.user);
  }

  @Post('student-presence-events')
  @Roles(
    Role.DRIVER,
    Role.ADMIN,
    Role.OSTA_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.BOARD_ADMIN,
  )
  async processEventsAlt(@Body() dto: any, @Request() req: { user: any }) {
    // Route to manualOverride because the simulation script sends single manual events
    return this.presenceGatewayService.manualOverride(dto, req.user);
  }

  @Post('student-presence-events/manual')
  @Roles(
    Role.DRIVER,
    Role.ADMIN,
    Role.OSTA_ADMIN,
    Role.SCHOOL_ADMIN,
    Role.BOARD_ADMIN,
  )
  async manualOverride(@Body() dto: any, @Request() req: { user: any }) {
    return this.presenceGatewayService.manualOverride(dto, req.user);
  }
}
