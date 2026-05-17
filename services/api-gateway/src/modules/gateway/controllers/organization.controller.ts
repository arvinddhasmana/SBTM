import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrganizationGatewayService } from '../services/organization.gateway.service';
import { CreateSchoolDto, UpdateSchoolDto } from '../dto/create-school.dto';
import { CreateBoardDto, UpdateBoardDto } from '../dto/create-board.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

type AuthenticatedRequest = { user: AuthenticatedUser };

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationGatewayService,
  ) {}

  // ---------- Boards ----------

  @Get('boards')
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN)
  async listBoards(@Request() req: AuthenticatedRequest) {
    return this.organizationService.listBoards(req.user);
  }

  @Get('boards/:id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async getBoard(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.getBoard(id, req.user);
  }

  @Post('boards')
  @Roles(Role.STA_ADMIN)
  async createBoard(@Body() dto: CreateBoardDto) {
    return this.organizationService.createBoard(dto);
  }

  @Patch('boards/:id')
  @Roles(Role.STA_ADMIN)
  async updateBoard(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.organizationService.updateBoard(id, dto);
  }

  @Delete('boards/:id')
  @Roles(Role.STA_ADMIN)
  async deleteBoard(@Param('id') id: string) {
    return this.organizationService.deleteBoard(id);
  }

  // ---------- Schools ----------

  @Get('schools')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async listSchools(
    @Query('boardId') boardId: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.listSchools(req.user, boardId);
  }

  @Get('schools/:id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getSchool(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.getSchool(id, req.user);
  }

  @Post('schools')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async createSchool(
    @Body() dto: CreateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.createSchool(dto, req.user);
  }

  @Patch('schools/:id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async updateSchool(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.updateSchool(id, dto, req.user);
  }

  @Patch('schools/:id/deactivate')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async deactivateSchool(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.deactivateSchool(id, req.user);
  }

  @Delete('schools/:id')
  @Roles(Role.STA_ADMIN)
  async deleteSchool(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.deleteSchool(id, req.user);
  }
}
