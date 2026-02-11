import {
    IsString,
    IsEnum,
    IsInt,
    IsDateString,
    IsNotEmpty,
    Min,
} from 'class-validator';
import { VideoEventType } from '../entities/video-event.entity';

export class CreateVideoEventDto {
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
    @IsNotEmpty()
    timestamp: string;

    @IsEnum(VideoEventType)
    @IsNotEmpty()
    eventType: VideoEventType;

    @IsInt()
    @Min(1)
    durationSeconds: number;
}
