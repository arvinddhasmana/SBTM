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
  BadRequestException,
} from '@nestjs/common';
import { FleetService } from './fleet.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@sbtm/common';
import { Roles, Role } from '@sbtm/common';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';

interface AuthedReq {
  user: { role: string; anchorKind?: string | null; anchorId?: string | null };
  query?: { operatorId?: string };
}

/**
 * Resolve the operatorId scope for a fleet operation. OPERATOR_ADMIN is locked to their own
 * anchor; STA/BOARD/SUPER admins may pass ?operatorId=… explicitly.
 * TODO(phase-B): also accept SCHOOL_ADMIN via a school→operator-contract lookup once
 * OperatorContractService exists.
 */
function resolveOperatorId(req: AuthedReq, fallback?: string): string {
  if (req.user.anchorKind === 'operator' && req.user.anchorId) {
    return req.user.anchorId;
  }
  const provided = fallback ?? req.query?.operatorId;
  if (!provided) {
    throw new BadRequestException(
      'operatorId is required (pass ?operatorId=… or use an OPERATOR-anchored account)',
    );
  }
  return provided;
}

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Post()
  @Roles(Role.OPERATOR_ADMIN, Role.STA_ADMIN, Role.SUPER_ADMIN)
  create(@Body() createVehicleDto: CreateVehicleDto, @Req() req: AuthedReq) {
    const operatorId = resolveOperatorId(req, createVehicleDto.operatorId);
    return this.fleetService.create({ ...createVehicleDto, operatorId });
  }

  @Get()
  findAll(@Req() req: AuthedReq) {
    const operatorId = resolveOperatorId(req);
    return this.fleetService.findAll(operatorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthedReq) {
    const operatorId = resolveOperatorId(req);
    return this.fleetService.findOne(id, operatorId);
  }

  @Patch(':id')
  @Roles(Role.OPERATOR_ADMIN, Role.STA_ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Req() req: AuthedReq,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const operatorId = resolveOperatorId(req);
    return this.fleetService.update(id, operatorId, updateVehicleDto);
  }

  @Delete(':id')
  @Roles(Role.OPERATOR_ADMIN, Role.STA_ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id') id: string, @Req() req: AuthedReq) {
    const operatorId = resolveOperatorId(req);
    return this.fleetService.remove(id, operatorId);
  }
}
