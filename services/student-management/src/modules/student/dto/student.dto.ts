import { IsString, IsNotEmpty, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { StudentStatus } from '../entities/student.entity';

export class CreateStudentDto {
    @IsString()
    @IsNotEmpty()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsNotEmpty()
    grade: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsUUID()
    @IsNotEmpty()
    school_id: string;

    @IsUUID()
    @IsOptional()
    parent_user_id?: string;

    @IsUUID()
    @IsOptional()
    am_route_id?: string;

    @IsUUID()
    @IsOptional()
    pm_route_id?: string;

    @IsUUID()
    @IsOptional()
    am_stop_id?: string;

    @IsUUID()
    @IsOptional()
    pm_stop_id?: string;

    @IsString()
    @IsOptional()
    external_student_id?: string;

    @IsEnum(StudentStatus)
    @IsOptional()
    status?: StudentStatus;
}

export class UpdateStudentDto {
    @IsString()
    @IsOptional()
    first_name?: string;

    @IsString()
    @IsOptional()
    last_name?: string;

    @IsString()
    @IsOptional()
    grade?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsUUID()
    @IsOptional()
    parent_user_id?: string;

    @IsUUID()
    @IsOptional()
    am_route_id?: string;

    @IsUUID()
    @IsOptional()
    pm_route_id?: string;

    @IsUUID()
    @IsOptional()
    am_stop_id?: string;

    @IsUUID()
    @IsOptional()
    pm_stop_id?: string;

    @IsEnum(StudentStatus)
    @IsOptional()
    status?: StudentStatus;
}
