import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentService } from './student.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { InternalServiceAuthGuard } from '../../common/guards/internal-service-auth.guard';

@Controller('students')
@UseGuards(InternalServiceAuthGuard)
export class StudentController {
    constructor(private readonly studentService: StudentService) { }

    @Post()
    create(@Body() createStudentDto: CreateStudentDto) {
        return this.studentService.create(createStudentDto);
    }

    @Get()
    findAll(@Query('school_id') schoolId?: string, @Query('route_id') routeId?: string, @Query('parent_id') parentId?: string) {
        return this.studentService.findAll({ school_id: schoolId, route_id: routeId, parent_id: parentId });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.studentService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
        return this.studentService.update(id, updateStudentDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.studentService.remove(id);
    }

    @Patch(':id/assignment')
    assignRoute(@Param('id') id: string, @Body() assignment: { am_route_id?: string; pm_route_id?: string; am_stop_id?: string; pm_stop_id?: string }) {
        return this.studentService.assignRoute(id, assignment);
    }

    @Post('bulk-import')
    @UseInterceptors(FileInterceptor('file'))
    async bulkImport(@UploadedFile() file: any, @Body('file') bodyFile: string, @Body('school_id') schoolId: string) {
        let csvContent: string;

        if (file) {
            csvContent = file.buffer.toString();
        } else if (bodyFile) {
            csvContent = bodyFile;
        } else {
            throw new BadRequestException('File is required (either as upload or direct string)');
        }

        if (!schoolId) {
            throw new BadRequestException('School ID is required');
        }

        const rows = csvContent.split(/\r?\n/).filter(line => line.trim()).slice(1);
        const students: CreateStudentDto[] = rows.map(row => {
            const [first_name, last_name, grade, address, external_student_id] = row.split(',');
            return {
                first_name: first_name?.trim(),
                last_name: last_name?.trim(),
                grade: grade?.trim(),
                address: address?.trim(),
                external_student_id: external_student_id?.trim(),
                school_id: schoolId
            };
        }).filter(s => s.first_name);

        return this.studentService.bulkImport(schoolId, students);
    }
}
