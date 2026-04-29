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

  @Column({ type: 'varchar', length: 20 })
  tier: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  eventType: string | null;

  @Column({ type: 'varchar', length: 50 })
  recipientRole: string;

  @Column({ type: 'varchar', length: 50 })
  notificationTiming: string;

  @Column({ type: 'jsonb' })
  channels: string[];

  @Column({ type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
