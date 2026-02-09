import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { VehicleStatus } from '../../auth/entities/vehicle.entity';

export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    licensePlate: string;

    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;

    @IsUUID()
    @IsNotEmpty()
    schoolId: string;
}

export class UpdateVehicleDto {
    @IsString()
    @IsOptional()
    licensePlate?: string;

    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;
}
