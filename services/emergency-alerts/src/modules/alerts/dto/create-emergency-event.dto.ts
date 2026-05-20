import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { EmergencyEventType } from '../event-types';

/**
 * Wire-compat DTO accepted on `POST /api/v1/emergency-events`. The shape is
 * unchanged from v1 — clients (driver/admin apps proxied through the
 * api-gateway) continue to submit eventType + schoolId. Internally the alerts
 * service maps these to v2 (`category`, `severity`, `scope_kind='route'`,
 * `scope_ref=routeId`, `sta_id=schoolId`).
 */
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

  @IsOptional()
  @IsString()
  staId?: string;
}
