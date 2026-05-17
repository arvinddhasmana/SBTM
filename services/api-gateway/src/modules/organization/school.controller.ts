import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchoolService } from './school.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@sbtm/common';
import { Roles, Role } from '@sbtm/common';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Get()
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async findAll(
    @Query('boardId') boardId?: string,
    @Request()
    req?: {
      user: {
        anchorKind?: string | null;
        anchorId?: string | null;
        role: string;
      };
    },
  ) {
    // Board admins are restricted to their own board (anchor scope)
    if (
      req?.user?.role === Role.BOARD_ADMIN &&
      req.user.anchorKind === 'board' &&
      req.user.anchorId
    ) {
      return this.schoolService.findByBoard(req.user.anchorId);
    }
    if (boardId) {
      return this.schoolService.findByBoard(boardId);
    }
    return this.schoolService.findAll();
  }

  @Get(':id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.schoolService.findOne(id);
  }

  @Post()
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async create(
    @Body() dto: CreateSchoolDto,
    @Request() req: { user: { boardId?: string; role: string } },
  ) {
    // Board admins can only create schools within their own board
    if (req.user.role === Role.BOARD_ADMIN && req.user.boardId) {
      return this.schoolService.create({ ...dto, boardId: req.user.boardId });
    }
    return this.schoolService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.STA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.schoolService.remove(id);
  }
}
