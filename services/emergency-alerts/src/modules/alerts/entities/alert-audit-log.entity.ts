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
  OSTA_ESCALATED = 'OSTA_ESCALATED',
  RESOLVED = 'RESOLVED',
  INFO_REQUESTED = 'INFO_REQUESTED',
}

@Entity()
export class AlertAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  alertId: string;

  @Column({ type: 'enum', enum: AlertAuditEventType })
  eventType: AlertAuditEventType;

  /** User ID of the actor performing the action (log ID only — no PII). */
  @Column({ nullable: true })
  actorUserId: string | null;

  /** Role of the actor at the time of the action. */
  @Column({ nullable: true })
  actorRole: string | null;

  /**
   * Optional operational notes.
   * Callers are responsible for ensuring no T4 PII (names, addresses, etc.)
   * is included — only operational context (route IDs, event types) is permitted.
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Escalation level at the time of the event. */
  @Column({ nullable: true })
  escalationLevel: string | null;

  @CreateDateColumn()
  eventTimestamp: Date;
}
