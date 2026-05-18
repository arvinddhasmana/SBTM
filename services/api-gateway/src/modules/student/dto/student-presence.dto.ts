import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * v2 boarding event contract — proxied as-is to student-presence
 * (`POST /api/v1/presence-events` and `POST /api/v1/student-presence-events/manual`).
 *
 * `runId` (uuid) and `stopId` (text) are REQUIRED — no nullable fallback per
 * SBTM Phase B aggressive cutover.
 */

export enum BoardingEventKindDto {
  BOARDED = 'boarded',
  ALIGHTED = 'alighted',
  NO_SHOW = 'no_show',
  BOARDED_AT_ALT_STOP = 'boarded_at_alt_stop',
  REFUSED = 'refused',
}

export enum BoardingEventSourceDto {
  DRIVER_APP = 'driver_app',
  RFID = 'rfid',
  SMARTTAG = 'smarttag',
}

export class BleDetectionDto {
  @IsString()
  @IsNotEmpty()
  tagId: string;

  @IsNumber()
  signalStrength: number;
}

export class ProcessPresenceEventsDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsUUID()
  runId: string;

  @IsString()
  @IsNotEmpty()
  stopId: string;

  @IsDateString()
  timestamp: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BleDetectionDto)
  detections: BleDetectionDto[];
}

export class ManualPresenceEventDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsUUID()
  runId: string;

  @IsString()
  @IsNotEmpty()
  stopId: string;

  @IsEnum(BoardingEventKindDto)
  eventKind: BoardingEventKindDto;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsEnum(BoardingEventSourceDto)
  source?: BoardingEventSourceDto;
}
