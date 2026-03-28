import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID, IsArray, ValidateNested, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { RouteDirection } from '../../auth/entities/route.entity';

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

    @IsUUID()
    @IsOptional()
    vehicleId?: string;

    @IsUUID()
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

    @IsUUID()
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
