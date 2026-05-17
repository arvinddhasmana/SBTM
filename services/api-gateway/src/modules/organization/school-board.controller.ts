import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchoolBoardService } from './school-board.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@sbtm/common';
import { Roles, Role } from '@sbtm/common';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('boards')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class SchoolBoardController {
  constructor(private readonly boardService: SchoolBoardService) {}

  @Get()
  @Roles(Role.STA_ADMIN)
  async findAll() {
    return this.boardService.findAll();
  }

  @Get(':id')
  @Roles(Role.STA_ADMIN, Role.BOARD_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.boardService.findOne(id);
  }

  @Post()
  @Roles(Role.STA_ADMIN)
  async create(@Body() dto: CreateBoardDto) {
    return this.boardService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.STA_ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateBoardDto) {
    return this.boardService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.STA_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.boardService.remove(id);
  }
}
