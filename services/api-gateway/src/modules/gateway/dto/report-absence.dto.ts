import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReportAbsenceDto {
  /**
   * Student identifier. Must look like a UUID (8-4-4-4-12 hex) but the
   * version nibble is intentionally not enforced — demo seed data uses
   * synthetic IDs (e.g. `30000000-0000-0001-0000-000000000001`) whose
   * version digit is `0`, which strict `@IsUUID()` rejects with
   * "studentId must be a UUID". A regex match keeps the input shape
   * validated without breaking demo / test data.
   */
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'studentId must be a UUID',
  })
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
