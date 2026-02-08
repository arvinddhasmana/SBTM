import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { SchoolBoardService } from './school-board.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';

@Controller('boards')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class SchoolBoardController {
    constructor(private readonly boardService: SchoolBoardService) { }

    @Get()
    @Roles(Role.OSTA_ADMIN)
    async findAll() {
        return this.boardService.findAll();
    }

    @Get(':id')
    @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
    async findOne(@Param('id') id: string) {
        return this.boardService.findOne(id);
    }

    @Post()
    @Roles(Role.OSTA_ADMIN)
    async create(@Body('name') name: string) {
        return this.boardService.create(name);
    }
}
