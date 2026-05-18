import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsDateString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BLEDetectionDto {
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

  /** v2 GTFS-aligned run id (stx_runs.id). Required — no v1 fallback. */
  @IsUUID()
  runId: string;

  /** v2 stop id (stx_stops.id; text per boarding-event.entity). Required. */
  @IsString()
  @IsNotEmpty()
  stopId: string;

  @IsDateString()
  timestamp: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BLEDetectionDto)
  detections: BLEDetectionDto[];
}
