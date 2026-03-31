import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FleetService } from './fleet.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@sbtm/common';
import { Roles, Role } from '@sbtm/common';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post()
  @Roles(Role.SCHOOL_ADMIN, Role.OSTA_ADMIN)
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.fleetService.create(createVehicleDto);
  }

  @Get()
  findAll(@Req() req: any) {
    // MultiTenancyGuard will handle schoolId isolation via req.user.schoolId if applicable
    const schoolId = req.user.schoolId;
    return this.fleetService.findAll(schoolId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const schoolId = req.user.schoolId;
    return this.fleetService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.OSTA_ADMIN)
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const schoolId = req.user.schoolId;
    return this.fleetService.update(id, schoolId, updateVehicleDto);
  }

  @Delete(':id')
  @Roles(Role.SCHOOL_ADMIN, Role.OSTA_ADMIN)
  remove(@Param('id') id: string, @Req() req: any) {
    const schoolId = req.user.schoolId;
    return this.fleetService.remove(id, schoolId);
  }
}
