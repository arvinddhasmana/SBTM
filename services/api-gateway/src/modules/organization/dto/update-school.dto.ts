import { IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateSchoolDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsUUID()
    boardId?: string;
}
