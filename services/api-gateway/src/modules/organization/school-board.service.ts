import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolBoard } from '../auth/entities/school-board.entity';

@Injectable()
export class SchoolBoardService {
    constructor(
        @InjectRepository(SchoolBoard)
        private readonly boardRepository: Repository<SchoolBoard>,
    ) { }

    async findAll(): Promise<SchoolBoard[]> {
        return this.boardRepository.find({ relations: ['schools'] });
    }

    async findOne(id: string): Promise<SchoolBoard> {
        const board = await this.boardRepository.findOne({
            where: { id },
            relations: ['schools'],
        });
        if (!board) throw new NotFoundException('School Board not found');
        return board;
    }

    async create(name: string): Promise<SchoolBoard> {
        const board = this.boardRepository.create({ name });
        return this.boardRepository.save(board);
    }
}
