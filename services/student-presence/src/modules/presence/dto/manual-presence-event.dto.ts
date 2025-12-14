
import { IsString, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';
import { EventType } from '../entities/presence-event.entity';

export class ManualPresenceEventDto {
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
}
