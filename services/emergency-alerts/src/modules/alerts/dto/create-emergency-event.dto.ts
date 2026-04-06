import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { EmergencyEventType } from '../entities/emergency-alert.entity';

export class CreateEmergencyEventDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsString()
  @IsNotEmpty()
  driverId: string;

  @IsDateString()
  timestamp: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsEnum(EmergencyEventType)
  eventType: EmergencyEventType;

  @IsOptional()
  @IsString()
  description?: string;
}
