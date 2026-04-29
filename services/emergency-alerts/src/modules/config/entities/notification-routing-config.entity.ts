import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_routing_config')
export class NotificationRoutingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tier', type: 'varchar', length: 20 })
  tier: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50, nullable: true })
  eventType: string | null;

  @Column({ name: 'recipient_role', type: 'varchar', length: 50 })
  recipientRole: string;

  @Column({ name: 'notification_timing', type: 'varchar', length: 50 })
  notificationTiming: string;

  @Column({ name: 'channels', type: 'jsonb' })
  channels: string[];

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
