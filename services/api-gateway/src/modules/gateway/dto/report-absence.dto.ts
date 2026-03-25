import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReportAbsenceDto {
    @IsUUID()
    studentId: string;

    /** ISO date string: YYYY-MM-DD */
    @IsDateString()
    tripDate: string;

    @IsEnum(['AM', 'PM', 'BOTH'])
    routeType: 'AM' | 'PM' | 'BOTH';

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}
