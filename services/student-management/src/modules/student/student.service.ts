import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student, StudentStatus } from './entities/student.entity';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentService {
    constructor(
        @InjectRepository(Student)
        private studentRepository: Repository<Student>,
    ) { }

    async create(createStudentDto: CreateStudentDto): Promise<Student> {
        const student = this.studentRepository.create(createStudentDto);
        return await this.studentRepository.save(student);
    }

    async findAll(query: { school_id?: string; route_id?: string; parent_id?: string }): Promise<Student[]> {
        const qb = this.studentRepository.createQueryBuilder('student');

        if (query.school_id) {
            qb.andWhere('student.school_id = :school_id', { school_id: query.school_id });
        }

        if (query.route_id) {
            qb.andWhere('(student.am_route_id = :route_id OR student.pm_route_id = :route_id)', { route_id: query.route_id });
        }

        if (query.parent_id) {
            qb.andWhere('student.parent_user_id = :parent_id', { parent_id: query.parent_id });
        }

        return await qb.getMany();
    }

    async findOne(id: string): Promise<Student> {
        const student = await this.studentRepository.findOne({ where: { id } });
        if (!student) {
            throw new NotFoundException(`Student with ID ${id} not found`);
        }
        return student;
    }

    async update(id: string, updateStudentDto: UpdateStudentDto): Promise<Student> {
        const student = await this.findOne(id);

        // Basic validation for route/stop consistency (logic would normally call other services)
        // Here we assume the caller (API Gateway) has done preliminary checks, 
        // but we can add more robust checks if we had Route/Stop repositories here.

        Object.assign(student, updateStudentDto);
        return await this.studentRepository.save(student);
    }

    async remove(id: string): Promise<void> {
        const student = await this.findOne(id);
        await this.studentRepository.remove(student);
    }

    async assignRoute(id: string, assignment: { am_route_id?: string; pm_route_id?: string; am_stop_id?: string; pm_stop_id?: string }): Promise<Student> {
        const student = await this.findOne(id);

        // In a real scenario, we'd validate that these routes/stops belong to the student's school.
        // For now, we update the fields.

        if (assignment.am_route_id) student.am_route_id = assignment.am_route_id;
        if (assignment.pm_route_id) student.pm_route_id = assignment.pm_route_id;
        if (assignment.am_stop_id) student.am_stop_id = assignment.am_stop_id;
        if (assignment.pm_stop_id) student.pm_stop_id = assignment.pm_stop_id;

        return await this.studentRepository.save(student);
    }

    async bulkImport(schoolId: string, students: CreateStudentDto[]): Promise<{ success: number; failed: number; errors: string[] }> {
        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        // Using a transaction for batch insert
        const queryRunner = this.studentRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const studentDto of students) {
                try {
                    const student = this.studentRepository.create({ ...studentDto, school_id: schoolId });
                    await queryRunner.manager.save(student);
                    success++;
                } catch (err) {
                    failed++;
                    errors.push(`Error importing ${studentDto.first_name} ${studentDto.last_name}: ${err.message}`);
                }
            }
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Bulk import failed. Transaction rolled back.');
        } finally {
            await queryRunner.release();
        }

        return { success, failed, errors };
    }
}
