import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class DsarRequestDto {
    /**
     * The school ID (tenant context). Must match the authenticated caller's tenant.
     * NEVER derived from request body for trust — callers pass this to scope the query.
     * The service layer validates it against the authenticated schoolId.
     */
    @IsUUID()
    @IsNotEmpty()
    schoolId: string;

    /**
     * The student ID (internal UUID) for which personal data is requested.
     * Used to gather data across all tables that reference this student.
     */
    @IsUUID()
    @IsNotEmpty()
    studentId: string;

    /**
     * Requestor identity — name or designation of the guardian or authorized party.
     * Stored for audit trail only. Not used for data filtering.
     */
    @IsString()
    @IsNotEmpty()
    requestorName: string;
}
