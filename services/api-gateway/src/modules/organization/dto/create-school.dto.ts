import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateSchoolDto {
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name: string;

    @IsUUID()
    boardId: string;
}
