import { IsString, IsNotEmpty, IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BoardingEventKind, BoardingEventSource } from '../entities/boarding-event.entity';

export class ManualPresenceEventDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  /**
   * Legacy free-text id (e.g. board_student_number). Resolved at write time
   * to the v2 `stx_students.id` uuid via `external_ids->>'board_student_number'`.
   */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsNotEmpty()
  routeId: string;

  @IsUUID()
  runId: string;

  @IsString()
  @IsNotEmpty()
  stopId: string;

  @IsEnum(BoardingEventKind)
  eventKind: BoardingEventKind;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsEnum(BoardingEventSource)
  source?: BoardingEventSource;
}
