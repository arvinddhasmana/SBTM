import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { AlertScopeKind } from './alert.entity';

export enum AlertChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

@Entity('stx_alert_subscriptions')
@Unique(['userId', 'scopeKind', 'scopeRef'])
export class AlertSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'scope_kind',
    type: 'enum',
    enum: AlertScopeKind,
    enumName: 'stx_alert_scope_kind_enum',
  })
  scopeKind: AlertScopeKind;

  @Column({ name: 'scope_ref', type: 'text' })
  scopeRef: string;

  @Column({
    type: 'enum',
    enum: AlertChannel,
    enumName: 'stx_alert_channel_enum',
    array: true,
    default: () => `ARRAY['push']::stx_alert_channel_enum[]`,
  })
  channels: AlertChannel[];

  @Column({ type: 'boolean', default: false })
  muted: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
