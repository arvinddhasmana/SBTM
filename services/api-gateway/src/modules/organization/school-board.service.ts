import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolBoard } from '../auth/entities/school-board.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

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

    async create(dto: CreateBoardDto): Promise<SchoolBoard> {
        const board = this.boardRepository.create({ name: dto.name });
        return this.boardRepository.save(board);
    }

    async update(id: string, dto: UpdateBoardDto): Promise<SchoolBoard> {
        const board = await this.findOne(id);
        if (dto.name !== undefined) {
            board.name = dto.name;
        }
        return this.boardRepository.save(board);
    }

    async remove(id: string): Promise<void> {
        const board = await this.findOne(id);
        await this.boardRepository.remove(board);
    }
}
