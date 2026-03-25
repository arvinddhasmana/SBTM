import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateBoardDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name?: string;
}
