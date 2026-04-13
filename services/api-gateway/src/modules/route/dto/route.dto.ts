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
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteDirection } from '../../auth/entities/route.entity';

/** Matches any 8-4-4-4-12 hex UUID pattern regardless of RFC 4122 variant bits. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateRouteStopDto {
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

  @IsEnum(RouteDirection)
  @IsNotEmpty()
  direction: RouteDirection;

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

  @IsString()
  @IsOptional()
  polyline?: string;

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

  @IsEnum(RouteDirection)
  @IsOptional()
  direction?: RouteDirection;

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

  @IsString()
  @IsOptional()
  polyline?: string;
}
