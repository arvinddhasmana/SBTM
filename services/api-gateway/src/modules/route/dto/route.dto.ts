import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Matches,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DirectionKind } from '../../gtfs/entities/route.entity';

/** Matches any 8-4-4-4-12 hex UUID pattern regardless of RFC 4122 variant bits. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * v2 shape point (GTFS shapes.txt-aligned). Replaces v1 `polyline: string` (Google encoded).
 */
export class ShapePointDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;

  @IsInt()
  @Min(0)
  sequence: number;

  @IsOptional()
  @IsNumber()
  distTraveled?: number;
}

export class CreateRouteStopDto {
  /** If present, reference an existing `stops.stop_id`. If absent, a new stop is created. */
  @IsOptional()
  @IsString()
  stopId?: string;

  /** v1 compat alias for stopId — older clients still send `id`. */
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(0)
  sequence: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^POINT\(-?\d+(\.\d+)? -?\d+(\.\d+)?\)$/, {
    message: 'Location must be in WKT format: POINT(lng lat)',
  })
  location: string;
}

/**
 * v2 multi-trip payload. A v2 route can have many trips (e.g. an AM Mon-Fri service
 * and a separate early-dismissal Wed). Each trip references a calendar `service_id`
 * and a `startTime`. If `trips` is omitted on the CreateRouteDto, a single canonical
 * trip is synthesised from the top-level `startTime` + a default everyday service.
 */
export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsString()
  @IsOptional()
  headsign?: string;

  @IsInt()
  @IsOptional()
  directionId?: number;
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DirectionKind)
  @IsNotEmpty()
  direction: DirectionKind;

  @Matches(UUID_PATTERN, { message: 'vehicleId must be a UUID' })
  @IsOptional()
  vehicleId?: string;

  @Matches(UUID_PATTERN, { message: 'schoolId must be a UUID' })
  @IsNotEmpty()
  schoolId: string;

  /**
   * v1-compat single-trip shortcut. When `trips` is omitted the service synthesises
   * one trip from this `startTime` + a default everyday service_id.
   */
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDuration?: number;

  /**
   * v2: write shape geometry as an array of ShapePointDto rather than a Google-encoded
   * `polyline`. RouteService persists these rows into the `shapes` table keyed by shape_id.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShapePointDto)
  @IsOptional()
  shapePoints?: ShapePointDto[];

  /** Alternatively, reference an existing shape by id (e.g. from a previous import). */
  @IsString()
  @IsOptional()
  shapeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopDto)
  @IsOptional()
  stops?: CreateRouteStopDto[];

  /** Optional multi-trip payload — see CreateTripDto. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTripDto)
  @IsOptional()
  trips?: CreateTripDto[];
}

export class UpdateRouteDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DirectionKind)
  @IsOptional()
  direction?: DirectionKind;

  @Matches(UUID_PATTERN, { message: 'vehicleId must be a UUID' })
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedDuration?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShapePointDto)
  @IsOptional()
  shapePoints?: ShapePointDto[];

  @IsString()
  @IsOptional()
  shapeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopDto)
  @IsOptional()
  stops?: CreateRouteStopDto[];

  /** Optional multi-trip payload for update — replaces existing trips when supplied. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTripDto)
  @IsOptional()
  trips?: CreateTripDto[];
}
