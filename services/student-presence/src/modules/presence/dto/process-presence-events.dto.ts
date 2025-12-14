
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class BLEDetectionDto {
    @IsString()
    @IsNotEmpty()
    tagId: string;

    @IsNotEmpty()
    signalStrength: number;
}

export class ProcessPresenceEventsDto {
    @IsString()
    @IsNotEmpty()
    vehicleId: string;

    @IsString()
    @IsNotEmpty()
    routeId: string;

    @IsDateString()
    timestamp: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BLEDetectionDto)
    detections: BLEDetectionDto[];
}
