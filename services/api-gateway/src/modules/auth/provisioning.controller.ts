import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import type { AnchorKind } from './entities/user.entity';

interface AuthenticatedRequest {
  user: {
    id: string;
    role: Role;
    anchorKind?: AnchorKind | null;
    anchorId?: string | null;
  };
}

@Controller('provisioning')
export class ProvisioningController {
  constructor(private readonly provisioningService: ProvisioningService) {}

  /**
   * Invite a new user. Tenant scope is derived from the authenticated caller's JWT.
   * FR-PROV-001
   */
  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async invite(
    @Body() dto: InviteUserDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.provisioningService.inviteUser(dto, req.user);
  }

  /**
   * Public endpoint — activates an invited account using the token from the invitation URL.
   * FR-PROV-002
   */
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateAccountDto) {
    return this.provisioningService.activateAccount(dto);
  }

  /**
   * List users within the authenticated caller's tenant scope.
   */
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async listUsers(@Request() req: AuthenticatedRequest) {
    return this.provisioningService.listUsers(req.user);
  }

  /**
   * Deactivate a user account. FR-PROV-003
   */
  @Patch('users/:userId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async deactivate(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.provisioningService.deactivateUser(userId, req.user);
  }

  /**
   * Reactivate a user account. FR-PROV-003
   */
  @Patch('users/:userId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async reactivate(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.provisioningService.reactivateUser(userId, req.user);
  }
}
