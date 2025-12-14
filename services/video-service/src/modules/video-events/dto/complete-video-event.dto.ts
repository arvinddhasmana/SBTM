import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';

export class CompleteVideoEventDto {
    @IsString()
    @IsNotEmpty()
    @IsUrl()
    videoUrl: string;

    @IsString()
    @IsOptional()
    @IsUrl()
    thumbnailUrl?: string;
}
