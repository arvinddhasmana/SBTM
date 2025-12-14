
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { TagType } from '../entities/student-tag.entity';

export class CreateStudentTagDto {
    @IsString()
    @IsNotEmpty()
    studentId: string;

    @IsString()
    @IsNotEmpty()
    tagId: string;

    @IsEnum(TagType)
    tagType: TagType;
}
