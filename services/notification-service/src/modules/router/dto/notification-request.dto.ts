import { IsString, IsUUID, IsOptional } from 'class-validator';

/**
 * v2-followups #1/#6: schoolId and boardId are optional scope context.
 *
 * Why: stx_alerts.scope_kind can be 'sta' (board+school omitted), 'board'
 * (board only), 'school' (board+school both set), or 'route' (route-scoped;
 * board/school optional context). Requiring schoolId blocked guardian flows
 * for cross-board parents and STA-scope cascades. The router/delivery log
 * still records board/school when present so audience reports can filter.
 */
export class NotificationRequestDto {
  @IsString()
  eventType: string;

  @IsUUID()
  eventSourceId: string;

  @IsUUID()
  recipientUserId: string;

  @IsUUID()
  @IsOptional()
  boardId?: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  routeId?: string;

  @IsUUID()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  emergencyType?: string;
}
