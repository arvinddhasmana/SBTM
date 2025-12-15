
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateStudentTagDto } from './dto/create-student-tag.dto';

@Controller('api/v1')
export class TagsController {
    constructor(private readonly tagsService: TagsService) { }

    @Post('student-tags')
    async create(@Body() createDto: CreateStudentTagDto) {
        const tag = await this.tagsService.create(createDto);
        return {
            status: 'registered',
            tagId: tag.id,
            studentId: tag.studentId,
        };
    }

    @Get('student-tags')
    async findAll() {
        return await this.tagsService.findAll();
    }

    @Get('student-tags/:tagId')
    async findByTagId(@Param('tagId') tagId: string) {
        return await this.tagsService.findByTagId(tagId);
    }
}
