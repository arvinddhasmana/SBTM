import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { StudentGatewayService } from '../services/student.gateway.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles, Role } from '../../../common/decorators/roles.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
    constructor(private readonly studentGatewayService: StudentGatewayService) { }

    @Get()
    @Roles(Role.ADMIN, Role.OSTA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
    findAll(@Query() query: any, @Request() req: any) {
        return this.studentGatewayService.getStudents(query, req.user);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.OSTA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN, Role.PARENT)
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.studentGatewayService.getStudentById(id, req.user);
    }

    @Post()
    @Roles(Role.ADMIN, Role.SCHOOL_ADMIN)
    create(@Body() createStudentDto: any, @Request() req: any) {
        return this.studentGatewayService.enrollStudent(createStudentDto, req.user);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SCHOOL_ADMIN)
    update(@Param('id') id: string, @Body() updateStudentDto: any, @Request() req: any) {
        return this.studentGatewayService.updateStudent(id, updateStudentDto, req.user);
    }

    @Patch(':id/assignment')
    @Roles(Role.ADMIN, Role.SCHOOL_ADMIN)
    assignRoute(@Param('id') id: string, @Body() assignment: any, @Request() req: any) {
        return this.studentGatewayService.assignRoute(id, assignment, req.user);
    }

    @Post('bulk-import')
    @Roles(Role.ADMIN, Role.SCHOOL_ADMIN)
    bulkImport(@Body() data: any, @Request() req: any) {
        const { file, school_id } = data;
        return this.studentGatewayService.bulkImport(file, school_id, req.user);
    }
}
