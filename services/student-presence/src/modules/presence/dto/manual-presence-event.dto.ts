import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { EventType, EventSource } from '../entities/presence-event.entity';

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

    @IsEnum(EventType)
    eventType: EventType;

    @IsDateString()
    timestamp: string;

    @IsOptional()
    @IsEnum(EventSource)
    source?: EventSource;

    @IsOptional()
    @IsNumber()
    signalStrength?: number;
}
