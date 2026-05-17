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

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

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
}
