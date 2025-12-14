
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentTag } from './entities/student-tag.entity';
import { CreateStudentTagDto } from './dto/create-student-tag.dto';

@Injectable()
export class TagsService {
    constructor(
        @InjectRepository(StudentTag)
        private tagsRepo: Repository<StudentTag>,
    ) { }

    async create(createDto: CreateStudentTagDto): Promise<StudentTag> {
        // Check if tag already exists
        const existingTag = await this.tagsRepo.findOne({
            where: { tagId: createDto.tagId }
        });

        if (existingTag) {
            throw new ConflictException(`Tag ${createDto.tagId} is already registered`);
        }

        const tag = this.tagsRepo.create(createDto);
        return await this.tagsRepo.save(tag);
    }

    async findByTagId(tagId: string): Promise<StudentTag | null> {
        return await this.tagsRepo.findOne({ where: { tagId } });
    }

    async findByStudentId(studentId: string): Promise<StudentTag[]> {
        return await this.tagsRepo.find({ where: { studentId } });
    }

    async findAll(): Promise<StudentTag[]> {
        return await this.tagsRepo.find();
    }
}
