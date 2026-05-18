import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export const DELIVERY_CHANNELS = ['PUSH', 'EMAIL', 'SMS'] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export const DELIVERY_STATUSES = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * v2-followups #1/#6: `board_id` and `school_id` are nullable scope context
 * that mirrors stx_alerts.scope_kind. STA-scope deliveries leave both NULL.
 */
@Entity('notification_delivery_log')
@Index(['recipientUserId', 'createdAt'])
@Index(['schoolId'])
@Index(['boardId'])
@Index(['eventSourceId'])
export class NotificationDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'board_id', type: 'uuid', nullable: true })
  boardId: string | null;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @Column({ name: 'recipient_user_id', type: 'uuid' })
  recipientUserId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @Column({ name: 'event_source_id', type: 'uuid' })
  eventSourceId: string;

  @Column({ type: 'varchar', length: 10 })
  channel: string;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: string;

  @Column({
    name: 'provider_message_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerMessageId: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
