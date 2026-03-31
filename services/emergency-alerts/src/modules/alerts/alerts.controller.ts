import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { InternalServiceAuthGuard } from '@sbtm/common';

@Controller('api/v1')
@UseGuards(InternalServiceAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('emergency-events')
  async create(@Body() createDto: CreateEmergencyEventDto) {
    const alert = await this.alertsService.create(createDto);
    return { status: 'received', alertId: alert.id };
  }

  @Get('alerts')
  async findAll(@Query('schoolId') schoolId?: string) {
    return this.alertsService.findAll(schoolId);
  }

  @Get('alerts/active')
  async findAllActive(@Query('schoolId') schoolId?: string) {
    return this.alertsService.findAllActive(schoolId);
  }

  @Patch('alerts/:alertId/resolve')
  async resolve(@Param('alertId') alertId: string) {
    return this.alertsService.resolve(alertId);
  }

  @Get('alerts/:alertId')
  async findOne(@Param('alertId') alertId: string) {
    return this.alertsService.findOne(alertId);
  }

  @Get('alerts/parent-view/:routeId')
  async findForRoute(@Param('routeId') routeId: string) {
    return this.alertsService.findForRoute(routeId);
  }
}
