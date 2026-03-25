import { IsString, IsUUID, MinLength, IsOptional } from 'class-validator';

export class ActivateAccountDto {
    @IsUUID()
    token: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;
}
