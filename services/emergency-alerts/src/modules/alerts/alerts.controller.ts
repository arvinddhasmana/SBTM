import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateEmergencyEventDto } from './dto/create-emergency-event.dto';
import { InternalServiceAuthGuard } from '../../common/guards/internal-service-auth.guard';

@Controller('api/v1')
@UseGuards(InternalServiceAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('emergency-events')
  async create(@Body() createDto: CreateEmergencyEventDto) {
    const alert = await this.alertsService.create(createDto);
    return { status: 'received', alertId: alert.id };
  }

  @Get('alerts/active')
  async findAllActive(@Query('schoolId') schoolId?: string) {
    return this.alertsService.findAllActive(schoolId);
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
