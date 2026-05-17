import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { VehicleStatus } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsUUID()
  @IsNotEmpty()
  operatorId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacitySeated?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityWheelchair?: number;
}

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacitySeated?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityWheelchair?: number;
}
