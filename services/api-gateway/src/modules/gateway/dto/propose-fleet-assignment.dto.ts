import { IsString, IsUUID, IsOptional } from 'class-validator';

export class ProposeFleetAssignmentDto {
  @IsUUID()
  schoolId: string;

  @IsString()
  routeId: string;

  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
