import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Alert } from './alert.entity';
import { User } from '../../auth/entities/user.entity';
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

  @ManyToOne(() => Alert)
  @JoinColumn({ name: 'alert_id' })
  alert?: Alert;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

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
