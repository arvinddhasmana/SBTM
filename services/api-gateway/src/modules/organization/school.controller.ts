import { Controller, Get, Post, Body, UseGuards, Param, Query } from '@nestjs/common';
import { SchoolService } from './school.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { MultiTenancyGuard } from '../../common/guards/multi-tenancy.guard';

@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard, MultiTenancyGuard)
export class SchoolController {
    constructor(private readonly schoolService: SchoolService) { }

    @Get()
    @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
    async findAll(@Query('boardId') boardId?: string) {
        if (boardId) {
            return this.schoolService.findByBoard(boardId);
        }
        return this.schoolService.findAll();
    }

    @Get(':id')
    @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
    async findOne(@Param('id') id: string) {
        return this.schoolService.findOne(id);
    }

    @Post()
    @Roles(Role.OSTA_ADMIN, Role.BOARD_ADMIN)
    async create(@Body() body: { name: string; boardId: string }) {
        return this.schoolService.create(body.name, body.boardId);
    }
}
