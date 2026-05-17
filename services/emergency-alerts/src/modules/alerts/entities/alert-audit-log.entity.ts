import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AlertAuditEventType {
  CREATED = 'CREATED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  AUTO_ESCALATED = 'AUTO_ESCALATED',
  FALSE_ALARM = 'FALSE_ALARM',
  PARENT_NOTIFIED = 'PARENT_NOTIFIED',
  BOARD_ESCALATED = 'BOARD_ESCALATED',
  STA_ESCALATED = 'STA_ESCALATED',
  RESOLVED = 'RESOLVED',
  INFO_REQUESTED = 'INFO_REQUESTED',
  STATUS_UPDATE = 'STATUS_UPDATE',
}

@Entity()
export class AlertAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  alertId: string;

  @Column({
    type: 'enum',
    enum: AlertAuditEventType,
    enumName: 'alert_audit_event_type_enum',
  })
  eventType: AlertAuditEventType;

  /** User ID of the actor performing the action (log ID only — no PII). */
  @Column({ type: 'varchar', nullable: true })
  actorUserId: string | null;

  /** Role of the actor at the time of the action. */
  @Column({ type: 'varchar', nullable: true })
  actorRole: string | null;

  /**
   * Optional operational notes.
   * Callers are responsible for ensuring no T4 PII (names, addresses, etc.)
   * is included — only operational context (route IDs, event types) is permitted.
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Escalation level at the time of the event. */
  @Column({ type: 'varchar', nullable: true })
  escalationLevel: string | null;

  @CreateDateColumn()
  eventTimestamp: Date;
}
