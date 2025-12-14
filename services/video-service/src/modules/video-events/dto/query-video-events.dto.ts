import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { VideoEventType, VideoEventStatus } from '../entities/video-event.entity';

export class QueryVideoEventsDto {
    @IsOptional()
    @IsString()
    vehicleId?: string;

    @IsOptional()
    @IsString()
    routeId?: string;

    @IsOptional()
    @IsString()
    driverId?: string;

    @IsOptional()
    @IsEnum(VideoEventType)
    eventType?: VideoEventType;

    @IsOptional()
    @IsEnum(VideoEventStatus)
    status?: VideoEventStatus;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}
