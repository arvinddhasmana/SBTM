import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../auth/entities/school.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolService {
    constructor(
        @InjectRepository(School)
        private readonly schoolRepository: Repository<School>,
    ) { }

    async findAll(): Promise<School[]> {
        return this.schoolRepository.find();
    }

    async findByBoard(boardId: string): Promise<School[]> {
        return this.schoolRepository.find({ where: { boardId } });
    }

    async findOne(id: string): Promise<School> {
        const school = await this.schoolRepository.findOne({
            where: { id },
        });
        if (!school) throw new NotFoundException('School not found');
        return school;
    }

    async create(dto: CreateSchoolDto): Promise<School> {
        const school = this.schoolRepository.create({ name: dto.name, boardId: dto.boardId });
        return this.schoolRepository.save(school);
    }

    async update(id: string, dto: UpdateSchoolDto): Promise<School> {
        const school = await this.findOne(id);
        if (dto.name !== undefined) school.name = dto.name;
        if (dto.boardId !== undefined) school.boardId = dto.boardId;
        return this.schoolRepository.save(school);
    }

    async remove(id: string): Promise<void> {
        const school = await this.findOne(id);
        await this.schoolRepository.remove(school);
    }
}
