import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../auth/entities/school.entity';

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

    async create(name: string, boardId: string): Promise<School> {
        const school = this.schoolRepository.create({ name, boardId });
        return this.schoolRepository.save(school);
    }
}
