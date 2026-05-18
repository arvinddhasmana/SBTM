import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { AlertChannel } from './alert-subscription.entity';

export enum AlertDeliveryStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  SUPPRESSED = 'suppressed',
}

@Entity('stx_alert_deliveries')
@Unique(['alertId', 'userId', 'channel'])
export class AlertDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alert_id', type: 'uuid' })
  alertId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: AlertChannel,
    enumName: 'stx_alert_channel_enum',
  })
  channel: AlertChannel;

  @Column({
    type: 'enum',
    enum: AlertDeliveryStatus,
    enumName: 'stx_alert_delivery_status_enum',
    default: AlertDeliveryStatus.QUEUED,
  })
  status: AlertDeliveryStatus;

  @Column({ name: 'attempted_at', type: 'timestamptz', nullable: true })
  attemptedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'error_text', type: 'text', nullable: true })
  errorText: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
