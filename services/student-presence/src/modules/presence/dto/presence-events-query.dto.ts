import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../entities/presence-event.entity';

export class PresenceEventsQueryDto {
    @IsOptional()
    @IsString()
    schoolId?: string;

    @IsOptional()
    @IsString()
    studentName?: string;

    @IsOptional()
    @IsString()
    routeId?: string;

    @IsOptional()
    @IsString()
    vehicleId?: string;

    @IsOptional()
    @IsEnum(EventType)
    eventType?: EventType;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
