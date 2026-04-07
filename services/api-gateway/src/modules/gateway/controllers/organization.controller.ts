import {
  Controller,
  Get,
  Post,
  Patch,
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

interface AuthenticatedRequest {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
    boardId?: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationGatewayService,
  ) {}

  // ---------- Boards ----------

  @Get('boards')
  @Roles(Role.OSTA_ADMIN)
  async listBoards() {
    return this.organizationService.listBoards();
  }

  @Get('boards/:id')
  @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
  async getBoard(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.getBoard(id, req.user);
  }

  @Post('boards')
  @Roles(Role.OSTA_ADMIN)
  async createBoard(@Body() dto: CreateBoardDto) {
    return this.organizationService.createBoard(dto);
  }

  @Patch('boards/:id')
  @Roles(Role.OSTA_ADMIN)
  async updateBoard(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.organizationService.updateBoard(id, dto);
  }

  // ---------- Schools ----------

  @Get('schools')
  @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async listSchools(
    @Query('boardId') boardId: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.listSchools(req.user, boardId);
  }

  @Get('schools/:id')
  @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async getSchool(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.getSchool(id, req.user);
  }

  @Post('schools')
  @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
  async createSchool(
    @Body() dto: CreateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.createSchool(dto, req.user);
  }

  @Patch('schools/:id')
  @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
  async updateSchool(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.updateSchool(id, dto, req.user);
  }

  @Patch('schools/:id/deactivate')
  @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
  async deactivateSchool(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.organizationService.deactivateSchool(id, req.user);
  }
}
