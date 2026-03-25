import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateBoardDto {
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name: string;
}
