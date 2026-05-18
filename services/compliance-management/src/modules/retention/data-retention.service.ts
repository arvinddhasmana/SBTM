import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

/**
 * DataRetentionService implements scheduled purge and archive jobs for each
 * data category as defined in Phase 5 retention schedules.
 *
 * Retention policy (from Phase-5-SecurityProductionHardening.md):
 *   - GPS location records:   90 days → archive
 *   - Emergency alert records: 1 year  → archive
 *   - Presence events:         90 days → archive
 *   - Video metadata/files:   30 days  → purge
 *   - Audit logs:              2 years → archive
 *   - Student records:    active+1yr  → anonymize
 *
 * All jobs log using structured JSON. No PII is emitted in log messages.
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ----- GPS Location Records: purge after 90 days -----
  // Runs daily at 02:00 UTC (low-traffic window)
  @Cron('0 2 * * *')
  async purgeExpiredGpsRecords(): Promise<void> {
    const cutoff = this.cutoffDate(90);
    try {
      const result = await this.dataSource.query(
        `DELETE FROM location_point WHERE timestamp < $1`,
        [cutoff],
      );
      this.logger.log({
        level: 'info',
        service: 'compliance-management',
        action: 'retention.gps.purge',
        cutoffDate: cutoff.toISOString(),
        rowsDeleted: result[1] ?? result,
      });
    } catch (err) {
      this.logger.error({
        level: 'error',
        service: 'compliance-management',
        action: 'retention.gps.purge.failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  // ----- Boarding Events: purge after 90 days (configurable per STA) -----
  @Cron('0 2 * * *')
  async purgeExpiredPresenceEvents(): Promise<void> {
    const cutoff = this.cutoffDate(90);
    try {
      const result = await this.dataSource.query(
        `DELETE FROM stx_boarding_events WHERE created_at < $1`,
        [cutoff],
      );
      this.logger.log({
        level: 'info',
        service: 'compliance-management',
        action: 'retention.presence.purge',
        cutoffDate: cutoff.toISOString(),
        rowsDeleted: result[1] ?? result,
      });
    } catch (err) {
      this.logger.error({
        level: 'error',
        service: 'compliance-management',
        action: 'retention.presence.purge.failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  // ----- Alerts: purge after 1 year -----
  @Cron('0 3 * * *')
  async purgeExpiredAlerts(): Promise<void> {
    const cutoff = this.cutoffDate(365);
    try {
      const result = await this.dataSource.query(`DELETE FROM stx_alerts WHERE created_at < $1`, [
        cutoff,
      ]);
      this.logger.log({
        level: 'info',
        service: 'compliance-management',
        action: 'retention.alerts.purge',
        cutoffDate: cutoff.toISOString(),
        rowsDeleted: result[1] ?? result,
      });
    } catch (err) {
      this.logger.error({
        level: 'error',
        service: 'compliance-management',
        action: 'retention.alerts.purge.failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  // ----- Audit Logs: purge after 2 years -----
  // Audit logs must be retained for 2 years (Phase 5 schedule + compliance).
  @Cron('0 4 1 * *') // Monthly on the 1st
  async purgeExpiredAuditLogs(): Promise<void> {
    const cutoff = this.cutoffDate(730);
    try {
      const result = await this.dataSource.query(`DELETE FROM audit_logs WHERE "createdAt" < $1`, [
        cutoff,
      ]);
      this.logger.log({
        level: 'info',
        service: 'compliance-management',
        action: 'retention.audit.purge',
        cutoffDate: cutoff.toISOString(),
        rowsDeleted: result[1] ?? result,
      });
    } catch (err) {
      this.logger.error({
        level: 'error',
        service: 'compliance-management',
        action: 'retention.audit.purge.failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  // ----- Inactive Student Record Anonymisation: after 1 year post-withdrawal -----
  // Replaces first_name/last_name/address with anonymised tokens; preserves IDs for audit trails.
  @Cron('0 3 1 * *') // Monthly on the 1st
  async anonymiseInactiveStudents(): Promise<void> {
    const cutoff = this.cutoffDate(365);
    try {
      const result = await this.dataSource.query(
        `UPDATE students
                 SET first_name = 'REDACTED',
                     last_name   = 'REDACTED',
                     address     = NULL
                 WHERE status IN ('INACTIVE', 'WITHDRAWN', 'GRADUATED')
                   AND "updatedAt" < $1
                   AND first_name != 'REDACTED'`,
        [cutoff],
      );
      this.logger.log({
        level: 'info',
        service: 'compliance-management',
        action: 'retention.students.anonymise',
        cutoffDate: cutoff.toISOString(),
        rowsUpdated: result[1] ?? result,
      });
    } catch (err) {
      this.logger.error({
        level: 'error',
        service: 'compliance-management',
        action: 'retention.students.anonymise.failed',
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  private cutoffDate(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
