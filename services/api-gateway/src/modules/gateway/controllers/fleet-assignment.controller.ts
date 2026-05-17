import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FleetAssignmentGatewayService } from '../services/fleet-assignment.gateway.service';
import { ProposeFleetAssignmentDto } from '../dto/propose-fleet-assignment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';

interface AuthenticatedRequest {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
    boardId?: string;
  };
}

@Controller('fleet-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FleetAssignmentController {
  constructor(
    private readonly fleetAssignmentService: FleetAssignmentGatewayService,
  ) {}

  @Post()
  @Roles(Role.STA_ADMIN)
  async propose(
    @Body() dto: ProposeFleetAssignmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.fleetAssignmentService.propose(dto, req.user);
  }

  @Get()
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async list(@Request() req: AuthenticatedRequest) {
    return this.fleetAssignmentService.list(req.user);
  }

  /**
   * Accept a proposed fleet assignment. Must be BEFORE the :id GET route.
   */
  @Patch(':id/accept')
  @Roles(Role.SCHOOL_ADMIN)
  async accept(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.fleetAssignmentService.accept(id, req.user);
  }

  /**
   * Reject a proposed fleet assignment.
   */
  @Patch(':id/reject')
  @Roles(Role.SCHOOL_ADMIN)
  async reject(
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.fleetAssignmentService.reject(id, req.user, body.notes);
  }

  @Get(':id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getById(@Param('id') id: string) {
    return this.fleetAssignmentService.getById(id);
  }
}
